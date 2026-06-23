import { createHash } from "crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getClientIp } from "@/lib/rate-limit";

export type AnalyticsEvent = "page_view" | "free_analyze" | "unlock";

/** 北京时间自然日，便于按天汇总 */
export function getStatDateShanghai(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

export function hashVisitorKey(visitorId: string | null | undefined, ip: string): string {
  const raw = (visitorId?.trim() || `ip:${ip}`).slice(0, 128);
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

type TrackParams = {
  event: AnalyticsEvent;
  req: Request;
  visitorId?: string | null;
  level?: number;
};

/** 写入统计事件；失败仅打日志，不影响主流程 */
export async function trackAnalytics(params: TrackParams): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { event, req, visitorId, level } = params;
  const ip = getClientIp(req);
  const visitorKey = hashVisitorKey(visitorId, ip);
  const statDate = getStatDateShanghai();

  try {
    const supabase = getSupabaseAdmin();

    if (event === "page_view") {
      const { error } = await supabase.from("analytics_events").insert({
        event: "page_view",
        visitor_key: visitorKey,
        stat_date: statDate,
        level: null,
      });
      if (error?.code === "23505") return;
      if (error) console.error("analytics page_view failed", error);
      return;
    }

    if (event === "unlock") {
      if (!level || level < 1 || level > 3) return;
      const { error } = await supabase.from("analytics_events").insert({
        event: "unlock",
        visitor_key: visitorKey,
        stat_date: statDate,
        level,
      });
      if (error) console.error("analytics unlock failed", error);
      return;
    }

    const { error } = await supabase.from("analytics_events").insert({
      event: "free_analyze",
      visitor_key: visitorKey,
      stat_date: statDate,
      level: null,
    });
    if (error) console.error("analytics free_analyze failed", error);
  } catch (e) {
    console.error("trackAnalytics error", e);
  }
}

export type DailyStatRow = {
  stat_date: string;
  page_visitors: number;
  free_analyze_count: number;
  free_analyze_users: number;
  unlock_exp: number;
  unlock_std: number;
  unlock_vip: number;
  unlock_total: number;
};

export async function fetchDailyStats(days = 30): Promise<DailyStatRow[]> {
  const supabase = getSupabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = getStatDateShanghai(since);

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event, level, visitor_key, stat_date")
    .gte("stat_date", sinceDate)
    .order("stat_date", { ascending: false });

  if (error) throw error;
  if (!data?.length) return [];

  const byDate = new Map<
    string,
    {
      pageVisitors: Set<string>;
      analyzeCount: number;
      analyzeUsers: Set<string>;
      unlockExp: number;
      unlockStd: number;
      unlockVip: number;
    }
  >();

  for (const row of data) {
    const date = String(row.stat_date);
    let bucket = byDate.get(date);
    if (!bucket) {
      bucket = {
        pageVisitors: new Set(),
        analyzeCount: 0,
        analyzeUsers: new Set(),
        unlockExp: 0,
        unlockStd: 0,
        unlockVip: 0,
      };
      byDate.set(date, bucket);
    }

    const key = String(row.visitor_key);
    if (row.event === "page_view") bucket.pageVisitors.add(key);
    if (row.event === "free_analyze") {
      bucket.analyzeCount += 1;
      bucket.analyzeUsers.add(key);
    }
    if (row.event === "unlock") {
      if (row.level === 1) bucket.unlockExp += 1;
      else if (row.level === 2) bucket.unlockStd += 1;
      else if (row.level === 3) bucket.unlockVip += 1;
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([stat_date, b]) => ({
      stat_date,
      page_visitors: b.pageVisitors.size,
      free_analyze_count: b.analyzeCount,
      free_analyze_users: b.analyzeUsers.size,
      unlock_exp: b.unlockExp,
      unlock_std: b.unlockStd,
      unlock_vip: b.unlockVip,
      unlock_total: b.unlockExp + b.unlockStd + b.unlockVip,
    }));
}
