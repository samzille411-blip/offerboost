import OpenAI from "openai";

export function getLLMClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY 未配置");
  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1",
  });
}

export function getAnalyzeModel() {
  return (
    process.env.LLM_MODEL_ANALYZE ||
    process.env.LLM_MODEL ||
    "deepseek-v4-flash"
  );
}

export function getPremiumModel() {
  return (
    process.env.LLM_MODEL_PREMIUM ||
    process.env.LLM_MODEL ||
    "deepseek-v4-pro"
  );
}

export const SAFETY_PROMPT = `你是资深 HRBP，仅提供简历与 JD 匹配、优化建议。
不得承诺录用、不得虚构用户经历。

内容处理规则：
1. 若输入明显不是简历或岗位描述（如乱码、纯数字、过短、无意义文本），请仍输出 JSON：score 为 0，issues 用温和语气引导用户「请补充真实的简历/岗位信息」，不要指责用户。
2. 若输入含违法、违规、政治敏感、色情等严重不当内容，仅回复一行：[[BLOCKED]]（不要输出 JSON）。
3. 其余正常输入一律输出 JSON，语气专业、直接但友好。`;

export function buildLevelPrompt(level: number): string {
  const base = SAFETY_PROMPT + "\n请对比【个人简历】与【目标岗位JD】输出优化报告：\n";
  if (level === 1) {
    return base + `【体验版】给出3条一针见血的硬伤诊断；针对最显眼的一段工作经历给出150字以内优化示范。`;
  }
  if (level === 2) {
    return base + `【标准版】
1. 列出3个致命问题。
2. STAR法则改写2-3条核心工作经历（含量化成果）。
3. 列出JD中5个ATS高频关键词及嵌入位置。`;
  }
  return base + `【冲刺版】包含标准版全部内容，另预测3道面试必问题及高分回答策略与避坑指南。`;
}

export const ANALYZE_PROMPT = `${SAFETY_PROMPT}
请对比简历与JD，仅输出 JSON（不要 markdown 代码块）：
{"score":0-100的整数,"issues":["硬伤1","硬伤2","硬伤3"],"summary":"一句话总结"}
issues 必须恰好3条。无效/乱填内容时 score 为 0，issues 提示用户按页面说明填写真实信息。不要输出付费级改写内容。`;
