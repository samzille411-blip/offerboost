import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    llm: !!process.env.LLM_API_KEY,
    time: new Date().toISOString(),
  });
}
