import { NextResponse } from "next/server";
import { getLLMClient, getAnalyzeModel, ANALYZE_PROMPT } from "@/lib/llm";
import { mapLlmErrorToResponse } from "@/lib/llm-errors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const max = Number(process.env.RATE_LIMIT_MAX_ANALYZE || 5);
    if (!checkRateLimit(`analyze:${ip}`, max)) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const { resume, jd } = await req.json();
    if (!resume?.trim() || !jd?.trim()) {
      return NextResponse.json({ error: "简历与 JD 不能为空" }, { status: 400 });
    }
    if (resume.length > 8000 || jd.length > 8000) {
      return NextResponse.json({ error: "文本过长，请精简后重试" }, { status: 400 });
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
    if (raw.includes("检测到违规内容")) {
      return NextResponse.json({ error: "检测到违规内容，无法优化" }, { status: 400 });
    }

    let parsed: { score?: number; issues?: string[]; summary?: string };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json({ error: "AI 返回解析失败，请重试" }, { status: 502 });
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
    });
  } catch (e) {
    console.error("analyze error", e);
    const mapped = mapLlmErrorToResponse(e);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
}
