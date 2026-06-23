import { NextResponse } from "next/server";
import { trackAnalytics } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "db_not_configured" });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const visitorId = body?.visitor_id;

    if (event !== "page_view") {
      return NextResponse.json({ error: "unsupported event" }, { status: 400 });
    }
    if (!visitorId || typeof visitorId !== "string") {
      return NextResponse.json({ error: "visitor_id required" }, { status: 400 });
    }

    await trackAnalytics({ event: "page_view", req, visitorId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
