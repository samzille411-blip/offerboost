export type AtsKeyword = { keyword: string; position: string };

export type ParsedPremiumReport = {
  score?: number;
  issues: string[];
  starBullets: string[];
  atsKeywords: AtsKeyword[];
  interviews: string[];
  /** 非 JSON 时的原文（Markdown 或纯文本） */
  plainText?: string;
};

function stripCodeFence(text: string): string {
  let trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) trimmed = fenced[1].trim();
  return trimmed;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = stripCodeFence(text);
  const candidates = [trimmed];
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) candidates.push(match[0]);
  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) continue;
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  return null;
}

function pickStringArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.map((item) => String(item).trim()).filter(Boolean);
    }
  }
  return [];
}

function pickAtsKeywords(obj: Record<string, unknown>): AtsKeyword[] {
  const raw = obj.ats_keywords ?? obj.atsKeywords ?? obj.keywords;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return { keyword: item, position: "" };
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return {
          keyword: String(o.keyword ?? o.word ?? o.key ?? "").trim(),
          position: String(
            o.embedding_position ?? o.position ?? o.embed ?? o.suggestion ?? ""
          ).trim(),
        };
      }
      return null;
    })
    .filter((x): x is AtsKeyword => !!x && !!x.keyword);
}

function pickInterviews(obj: Record<string, unknown>): string[] {
  const raw =
    obj.interview_questions ??
    obj.interviews ??
    obj.interview_qa ??
    obj.interviewTips;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const q = String(o.question ?? o.q ?? "").trim();
      const a = String(o.answer ?? o.strategy ?? o.tip ?? "").trim();
      if (q && a) return `Q：${q}\nA：${a}`;
      return q || a;
    }
    return "";
  }).filter(Boolean);
}

/** 将 LLM 返回的 JSON / Markdown 解析为结构化报告 */
export function parsePremiumReport(raw: string): ParsedPremiumReport {
  const obj = extractJsonObject(raw);
  if (obj) {
    const score = Number(obj.score);
    return {
      score: Number.isFinite(score) ? score : undefined,
      issues: pickStringArray(obj, ["issues", "fatal_issues", "problems", "硬伤"]),
      starBullets: pickStringArray(obj, [
        "star_bullets",
        "star_rewrite",
        "star_rewrites",
        "star",
        "experiences",
      ]),
      atsKeywords: pickAtsKeywords(obj),
      interviews: pickInterviews(obj),
    };
  }
  return {
    issues: [],
    starBullets: [],
    atsKeywords: [],
    interviews: [],
    plainText: stripCodeFence(raw),
  };
}

function cleanIssue(text: string): string {
  return text.replace(/^致命问题\d+[：:]\s*/, "").trim();
}

/** 去掉 LLM 返回的 STAR 条目前缀，如 STAR改写1（原：…）→ */
export function cleanStarBullet(text: string): string {
  return text.replace(/^STAR改写\d+[（(].*?[）)]\s*(?:→|->)\s*/, "").trim();
}

/** 统一转为可读 Markdown（服务端/旧缓存均可用） */
export function formatPremiumReportDisplay(raw: string): string {
  const parsed = parsePremiumReport(raw);
  const hasStructured =
    parsed.issues.length > 0 ||
    parsed.starBullets.length > 0 ||
    parsed.atsKeywords.length > 0 ||
    parsed.interviews.length > 0;

  if (!hasStructured) {
    return parsed.plainText || raw;
  }

  const lines: string[] = [];

  if (parsed.score != null) {
    lines.push(`## 综合匹配参考分`, ``, `${parsed.score} / 100`, ``);
  }

  if (parsed.issues.length > 0) {
    lines.push(`## 致命问题`, ``);
    parsed.issues.forEach((issue, i) => lines.push(`${i + 1}. ${cleanIssue(issue)}`, ``));
  }

  if (parsed.starBullets.length > 0) {
    lines.push(`## STAR 法则像素级改写`, ``);
    parsed.starBullets.forEach((item, i) => {
      lines.push(`**经历 ${i + 1}**`, cleanStarBullet(item), ``);
    });
  }

  if (parsed.atsKeywords.length > 0) {
    lines.push(`## ATS 高频关键词`, ``);
    parsed.atsKeywords.forEach((kw) => {
      lines.push(`- **${kw.keyword}**${kw.position ? ` — ${kw.position}` : ""}`);
    });
    lines.push(``);
  }

  if (parsed.interviews.length > 0) {
    lines.push(`## 面试必问题预测`, ``);
    parsed.interviews.forEach((item, i) => {
      lines.push(`**第 ${i + 1} 题**`, item, ``);
    });
  }

  return lines.join("\n").trim();
}
