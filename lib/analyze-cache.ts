import type { AnalyzeResult } from "@/lib/constants";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** 仅缓存诊断 JSON，不存简历/JD 原文 */
export async function getCachedAnalyze(contentHash: string): Promise<AnalyzeResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("analyze_cache")
      .select("score, issues, summary")
      .eq("content_hash", contentHash)
      .maybeSingle();
    if (error || !data) return null;
    const issues = Array.isArray(data.issues) ? (data.issues as string[]).slice(0, 3) : [];
    return {
      score: data.score,
      issues,
      summary: data.summary || "",
      inputValid: true,
    };
  } catch {
    return null;
  }
}

export async function setCachedAnalyze(contentHash: string, result: AnalyzeResult): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("analyze_cache").upsert(
      {
        content_hash: contentHash,
        score: result.score,
        issues: result.issues,
        summary: result.summary || "",
      },
      { onConflict: "content_hash" }
    );
  } catch (e) {
    console.error("analyze_cache upsert failed", e);
  }
}
