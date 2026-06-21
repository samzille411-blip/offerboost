export type AnalyzeLlmPayload = {
  score?: number;
  issues?: string[];
  summary?: string;
};

/** 尽量从 LLM 原始输出中提取 JSON（兼容 markdown 包裹、多余前后文本） */
export function parseAnalyzeLlmJson(raw: string): AnalyzeLlmPayload | null {
  const text = raw.trim();
  if (!text) return null;

  const candidates: string[] = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace?.[0]) candidates.push(brace[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as AnalyzeLlmPayload;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}
