import { AnalyzeResult } from "@/lib/constants";

/** 仅拦截极明显乱填（1、2、纯数字等），其余交给 AI 判断 */
function isGibberish(text: string): boolean {
  const t = text.trim();
  if (t.length <= 2) return true;
  if (/^[\d\s.,，。、；;:!！?？\-—]+$/.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  if (compact.length > 0 && /^(.)\1+$/.test(compact)) return true;
  return false;
}

export function isObviouslyInvalidInput(resume: string, jd: string): boolean {
  const r = resume.trim();
  const j = jd.trim();
  if (r.length < 3 || j.length < 3) return true;
  if (isGibberish(r) || isGibberish(j)) return true;
  return false;
}

export function buildInvalidInputResult(): AnalyzeResult {
  return {
    score: 0,
    inputValid: false,
    summary: "当前输入非有效简历与岗位描述，请提供真实信息以便分析。",
    issues: [
      "简历内容过短或不完整，请粘贴包含工作经历、项目或技能的真实简历",
      "岗位 JD 不完整，请粘贴完整的岗位职责与任职要求",
      "填写完整信息后可获得准确的匹配度与优化建议",
    ],
  };
}
