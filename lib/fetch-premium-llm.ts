import {
  getLLMClient,
  getPremiumModel,
  buildLevelPrompt,
  getPremiumMaxTokens,
} from "@/lib/llm";
import { formatPremiumReportDisplay } from "@/lib/format-premium-report";
import { isPremiumReportComplete } from "@/lib/premium-report-validate";
import { isBlockedLlmOutput } from "@/lib/user-messages";

const MAX_ATTEMPTS = 2;

export async function fetchPremiumReportFromLlm(
  resume: string,
  jd: string,
  level: number
): Promise<string> {
  const client = getLLMClient();
  const model = getPremiumModel();
  const maxTokens = getPremiumMaxTokens(level);
  const basePrompt = buildLevelPrompt(level);

  let lastRaw = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content:
            attempt === 1
              ? `${basePrompt}\n\n【重要】必须一次性输出本档位规定的全部 ## 章节，缺一不可；禁止只写第一节就停止。`
              : `${basePrompt}\n\n上次输出不完整。请输出完整 Markdown 报告（禁止 JSON），必须包含本档位全部 ## 章节，每个章节都要有实质内容。`,
        },
        {
          role: "user",
          content: `【用户简历】\n${resume}\n\n【目标岗位JD】\n${jd}`,
        },
      ],
    });

    lastRaw = completion.choices[0]?.message?.content?.trim() || "";
    const finishReason = completion.choices[0]?.finish_reason;

    if (!lastRaw) continue;
    if (isBlockedLlmOutput(lastRaw)) {
      throw new Error("blocked_content");
    }
    if (finishReason === "length") {
      console.warn("[premium] output truncated (length)", level, attempt);
      continue;
    }
    if (isPremiumReportComplete(lastRaw, level)) {
      return formatPremiumReportDisplay(lastRaw);
    }
    console.warn("[premium] incomplete report", level, attempt, lastRaw.slice(0, 200));
  }

  if (lastRaw && isBlockedLlmOutput(lastRaw)) {
    throw new Error("blocked_content");
  }

  throw new Error("incomplete_report");
}
