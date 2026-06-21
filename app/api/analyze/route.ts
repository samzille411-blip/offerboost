import { NextResponse } from "next/server";
import { getLLMClient, getAnalyzeModel, ANALYZE_PROMPT } from "@/lib/llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { buildInvalidInputResult, isObviouslyInvalidInput } from "@/lib/input-validation";
import { isBlockedLlmOutput, userMessages } from "@/lib/user-messages";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const max = Number(process.env.RATE_LIMIT_MAX_ANALYZE || 5);
    if (!checkRateLimit(`analyze:${ip}`, max)) {
      return NextResponse.json({ error: userMessages.rateLimited }, { status: 429 });
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

    if (!process.env.LLM_API_KEY) {
      return NextResponse.json({ error: "AI 服务未配置，请联系管理员" }, { status: 503 });
    }

    let completion;
    try {
      const client = getLLMClient();
      completion = await client.chat.completions.create({
        model: getAnalyzeModel(),
        temperature: 0.2,
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

    return NextResponse.json({
      score,
      issues,
      summary: parsed.summary || "",
      inputValid: true,
    });
  } catch (e) {
    console.error("analyze error", e);
    const mapped = mapLlmErrorToResponse(e);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
