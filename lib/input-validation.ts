import { AnalyzeResult } from "@/lib/constants";

const MIN_RESUME_LEN = 20;
const MIN_JD_LEN = 15;

function isGibberish(text: string): boolean {
  const t = text.trim();
  if (t.length <= 2) return true;
  if (/^[\d\s.,，。、；;:!！?？\-—]+$/.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  if (compact.length > 0 && /^(.)\1+$/.test(compact)) return true;
  return false;
}

/** 明显不是有效简历/JD 的输入（过短、纯数字、重复字符等） */
export function isObviouslyInvalidInput(resume: string, jd: string): boolean {
  const r = resume.trim();
  const j = jd.trim();
  if (r.length < MIN_RESUME_LEN || j.length < MIN_JD_LEN) return true;
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
