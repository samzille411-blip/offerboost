import { NextResponse } from "next/server";
import { getCachedAnalyze, setCachedAnalyze } from "@/lib/analyze-cache";
import { hashResumeJd } from "@/lib/content-hash";
import { DEMO_ANALYZE_RESULT, isDemoAnalyzeInput } from "@/lib/demo-sample";
import { fetchAnalyzeFromLlm } from "@/lib/fetch-analyze-llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { parseAnalyzeLlmJson } from "@/lib/parse-analyze-json";
import { buildInvalidInputResult, isObviouslyInvalidInput } from "@/lib/input-validation";
import { enforceAnalyzeLlmRateLimit } from "@/lib/upstash-rate-limit";
import { isBlockedLlmOutput, userMessages } from "@/lib/user-messages";
import { generatePremiumTeaser } from "@/lib/premium-teaser";
import { validateInputLength } from "@/lib/input-limits";
import { trackAnalytics } from "@/lib/analytics";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function withTeaser<T extends Record<string, unknown>>(payload: T, seed = 0): T & { premiumTeaser: string } {
  return { ...payload, premiumTeaser: generatePremiumTeaser(seed) };
}

export async function POST(req: Request) {
  try {
    const { resume, jd, visitor_id: visitorId } = await req.json();
    if (!resume?.trim() || !jd?.trim()) {
      return NextResponse.json({ error: userMessages.emptyResumeJd }, { status: 400 });
    }
    const lengthCheck = validateInputLength(String(resume), String(jd));
    if (!lengthCheck.ok) {
      return NextResponse.json({ error: lengthCheck.message, code: "input_too_long" }, { status: 400 });
    }
    if (isObviouslyInvalidInput(resume, jd)) {
      return NextResponse.json(buildInvalidInputResult());
    }

    if (isDemoAnalyzeInput(resume, jd)) {
      void trackAnalytics({ event: "free_analyze", req, visitorId });
      return NextResponse.json(withTeaser(DEMO_ANALYZE_RESULT, 0));
    }

    const contentHash = await hashResumeJd(resume, jd);
    const teaserSeed = parseInt(contentHash.slice(0, 2), 16);
    const cached = await getCachedAnalyze(contentHash);
    if (cached) {
      void trackAnalytics({ event: "free_analyze", req, visitorId });
      return NextResponse.json(withTeaser(cached, teaserSeed));
    }

    if (!process.env.LLM_API_KEY) {
      return NextResponse.json({ error: "AI 服务未配置，请联系管理员" }, { status: 503 });
    }

    const limited = await enforceAnalyzeLlmRateLimit(req);
    if (!limited.ok) return limited.response;

    let raw: string;
    try {
      raw = await fetchAnalyzeFromLlm(resume, jd);
    } catch (e) {
      const mapped = mapLlmErrorToResponse(e);
      return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
    }

    if (isBlockedLlmOutput(raw)) {
      return NextResponse.json({ error: userMessages.blockedContent }, { status: 400 });
    }

    const parsed = parseAnalyzeLlmJson(raw);
    if (!parsed) {
      console.error("analyze parse failed", raw.slice(0, 500));
      return NextResponse.json({ error: userMessages.parseFailed, code: "parse_failed" }, { status: 502 });
    }

    const issues = (parsed.issues || []).slice(0, 3);
    while (issues.length < 3) issues.push("待进一步分析");

    const rawScore = Number(parsed.score);
    const score = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, rawScore))
      : 0;

    const result = {
      score,
      issues,
      summary: parsed.summary || "",
      inputValid: true as const,
    };

    await setCachedAnalyze(contentHash, result);

    void trackAnalytics({ event: "free_analyze", req, visitorId });
    return NextResponse.json(withTeaser(result, teaserSeed));
  } catch (e) {
    console.error("analyze error", e);
    const mapped = mapLlmErrorToResponse(e);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
