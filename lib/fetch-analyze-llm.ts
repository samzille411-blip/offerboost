import { getLLMClient, getAnalyzeModel, ANALYZE_PROMPT } from "@/lib/llm";
import { parseAnalyzeLlmJson } from "@/lib/parse-analyze-json";

const MAX_ATTEMPTS = 2;

export async function fetchAnalyzeFromLlm(resume: string, jd: string): Promise<string> {
  const client = getLLMClient();
  const model = getAnalyzeModel();
  const maxTokens = Number(process.env.LLM_ANALYZE_MAX_TOKENS || 400);

  let lastRaw = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            attempt === 1
              ? ANALYZE_PROMPT
              : `${ANALYZE_PROMPT}\n\n上次输出格式无效。请只输出一个合法 JSON 对象，不要 markdown，不要任何解释文字。`,
        },
        { role: "user", content: `【用户简历】\n${resume}\n\n【目标岗位JD】\n${jd}` },
      ],
    });

    lastRaw = completion.choices[0]?.message?.content || "";
    if (parseAnalyzeLlmJson(lastRaw)) return lastRaw;
  }

  return lastRaw;
}
