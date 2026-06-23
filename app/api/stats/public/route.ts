import { NextResponse } from "next/server";
import { fetchLifetimeStats, formatPublicStatsLine } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { display: "00000|00000|00000|00000|00000", stats: null },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  try {
    const stats = await fetchLifetimeStats();
    const display = formatPublicStatsLine(stats);
    return NextResponse.json(
      { display, stats },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    console.error("public stats error", e);
    return NextResponse.json(
      { display: "00000|00000|00000|00000|00000", stats: null },
      { status: 503, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}
