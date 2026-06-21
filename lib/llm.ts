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

const PREMIUM_SAFETY_PROMPT = `你是资深 HRBP，仅提供简历与 JD 匹配、优化建议。
不得承诺录用、不得虚构用户经历。
若输入含违法、违规、政治敏感、色情等严重不当内容，仅回复一行：[[BLOCKED]]。

输出格式要求（非常重要）：
- 输出**中文 Markdown 报告**，面向用户直接阅读
- **禁止**输出 JSON、禁止用 \`\`\` 代码块包裹整篇报告
- 使用 ## 二级标题分节，条理清晰，专业直接`;

const PREMIUM_FORMAT_RULES = `
输出格式（必须严格遵守）：
- 仅输出中文 Markdown；禁止 JSON；禁止用代码块包裹全文
- 只能使用本档位规定的 ## 二级标题，禁止增加任何其他章节（如：匹配度总览、优势分析、差距分析、行动建议、简历优化建议 等）
- 禁止输出匹配度分数或 /100 评分（免费区已展示）
- 不得虚构用户经历；不得建议夸大未掌握的技能；可基于真实经历合理推演量化成果
- 专业、直接、无错别字；不要写开场白和结尾总结`;

const STD_SECTIONS = `## 致命问题
（恰好 3 条，每条 2-3 句，说明与 JD 的核心错配；不要重复免费区已说的空话，要更具体）

## STAR 法则改写
（恰好 3 条，每条单独一段，80-120 字，基于用户真实经历合理推演，含可量化结果）

## ATS 高频关键词
（恰好 5 个 JD 关键词，每条一行，格式：**关键词** — 建议嵌入位置与写法）`;

export function getPremiumMaxTokens(level: number): number {
  if (level === 1) return Number(process.env.LLM_PREMIUM_MAX_TOKENS_EXP || 800);
  if (level === 2) return Number(process.env.LLM_PREMIUM_MAX_TOKENS_STD || 2200);
  return Number(process.env.LLM_PREMIUM_MAX_TOKENS_VIP || 3200);
}

export function buildLevelPrompt(level: number): string {
  const base =
    PREMIUM_SAFETY_PROMPT +
    PREMIUM_FORMAT_RULES +
    "\n请对比【个人简历】与【目标岗位JD】输出优化报告。\n";

  if (level === 1) {
    return `${base}【体验版】全文不超过 500 字。只能有以下两个章节：

## 硬伤诊断
（恰好 3 条，每条 1-2 句，直击要害）

## 优化示范
（1 段，针对最显眼的工作经历，150 字以内 STAR 风格改写）`;
  }
  if (level === 2) {
    return `${base}【标准版】全文不超过 1000 字。只能有以下三个章节：

${STD_SECTIONS}`;
  }
  return `${base}【冲刺版】全文不超过 1400 字。只能有以下四个章节（前三章与标准版相同，再加面试题）：

${STD_SECTIONS}

## 面试必问题预测
（恰好 3 题，每题含三行：**问题** / 高分策略 / 避坑提示）`;
}

export const ANALYZE_PROMPT = `${SAFETY_PROMPT}
请对比简历与JD，仅输出 JSON（不要 markdown 代码块）：
{"score":0-100的整数,"issues":["硬伤1","硬伤2","硬伤3"],"summary":"一句话总结"}

【有效简历+JD】score 按真实匹配度 1-100。issues 必须恰好 3 条，每条 15-35 字：
- 毒舌、直接、专业，必须基于用户实际内容，直击真实硬伤（如：缺乏量化数据、未体现 JD 核心关键词、经历描述空泛、技能与岗位错配等）
- 让用户感到「说中了我」，激发解锁完整报告的意愿
- 不要泛泛而谈，不要输出付费级改写/STAR 全文
summary 一句话点出最大匹配差距。

【明显无效/乱填】score 为 0，issues 温和引导用户补充真实简历与完整 JD。

不要输出付费级改写内容。`;
