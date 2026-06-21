import { sha256 } from "@/lib/rate-limit";

/** 比对/哈希前统一空白，避免复制粘贴导致误判为不同内容 */
export function normalizeInputText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export async function hashResumeJd(resume: string, jd: string): Promise<string> {
  const payload = `${normalizeInputText(resume)}\n---\n${normalizeInputText(jd)}`;
  return sha256(payload);
}
