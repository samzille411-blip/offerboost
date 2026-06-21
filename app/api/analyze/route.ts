import { NextResponse } from "next/server";
import { getCachedAnalyze, setCachedAnalyze } from "@/lib/analyze-cache";
import { hashResumeJd } from "@/lib/content-hash";
import { DEMO_ANALYZE_RESULT, isDemoAnalyzeInput } from "@/lib/demo-sample";
import { getLLMClient, getAnalyzeModel, ANALYZE_PROMPT } from "@/lib/llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { buildInvalidInputResult, isObviouslyInvalidInput } from "@/lib/input-validation";
import { isBlockedLlmOutput, userMessages } from "@/lib/user-messages";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generatePremiumTeaser } from "@/lib/premium-teaser";

function withTeaser<T extends Record<string, unknown>>(payload: T, seed = 0): T & { premiumTeaser: string } {
  return { ...payload, premiumTeaser: generatePremiumTeaser(seed) };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const max = Number(process.env.RATE_LIMIT_MAX_ANALYZE || 3);
    if (!checkRateLimit(`analyze:${ip}`, max)) {
      return NextResponse.json({ error: userMessages.rateLimited, code: "rate_limited" }, { status: 429 });
    }

    const { resume, jd } = await req.json();
    if (!resume?.trim() || !jd?.trim()) {
      return NextResponse.json({ error: userMessages.emptyResumeJd }, { status: 400 });
    }
    if (resume.length > 8000 || jd.length > 8000) {
      return NextResponse.json({ error: userMessages.tooLong }, { status: 400 });
    }
    if (isObviouslyInvalidInput(resume, jd)) {
      return NextResponse.json(buildInvalidInputResult());
    }

    if (isDemoAnalyzeInput(resume, jd)) {
      return NextResponse.json(withTeaser(DEMO_ANALYZE_RESULT, 0));
    }

    const contentHash = await hashResumeJd(resume, jd);
    const teaserSeed = parseInt(contentHash.slice(0, 2), 16);
    const cached = await getCachedAnalyze(contentHash);
    if (cached) {
      return NextResponse.json(withTeaser(cached, teaserSeed));
    }

    if (!process.env.LLM_API_KEY) {
      return NextResponse.json({ error: "AI 服务未配置，请联系管理员" }, { status: 503 });
    }

    let completion;
    try {
      const client = getLLMClient();
      completion = await client.chat.completions.create({
        model: getAnalyzeModel(),
        temperature: 0,
        max_tokens: Number(process.env.LLM_ANALYZE_MAX_TOKENS || 300),
        messages: [
          { role: "system", content: ANALYZE_PROMPT },
          { role: "user", content: `【用户简历】\n${resume}\n\n【目标岗位JD】\n${jd}` },
        ],
      });
    } catch (e) {
      const mapped = mapLlmErrorToResponse(e);
      return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
    }

    const raw = completion.choices[0]?.message?.content || "";
    if (isBlockedLlmOutput(raw)) {
      return NextResponse.json({ error: userMessages.blockedContent }, { status: 400 });
    }

    let parsed: { score?: number; issues?: string[]; summary?: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json({ error: userMessages.parseFailed }, { status: 502 });
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

    return NextResponse.json(withTeaser(result, teaserSeed));
  } catch (e) {
    console.error("analyze error", e);
    const mapped = mapLlmErrorToResponse(e);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
