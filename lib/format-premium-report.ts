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
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : trimmed;
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
  const text = stripCodeFence(raw);
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
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
    } catch {
      /* fall through */
    }
  }
  return {
    issues: [],
    starBullets: [],
    atsKeywords: [],
    interviews: [],
    plainText: text,
  };
}
