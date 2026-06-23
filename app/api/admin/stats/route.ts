import { NextResponse } from "next/server";
import { fetchDailyStats } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.STATS_ADMIN_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") || 30)));

  try {
    const daily = await fetchDailyStats(days);
    return NextResponse.json({
      timezone: "Asia/Shanghai",
      days,
      daily,
    });
  } catch (e) {
    console.error("admin stats error", e);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
