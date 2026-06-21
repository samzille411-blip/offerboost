import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isUpstashConfigured } from "@/lib/upstash-rate-limit";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    llm: !!process.env.LLM_API_KEY,
    upstash: isUpstashConfigured(),
    time: new Date().toISOString(),
  });
}
