import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {

  const { data } =
    await supabaseAdmin
      .from("follow_ups")
.select("*")
.eq("status", "pending")
      .order("due_date", {
        ascending: true,
      });

  return NextResponse.json({
    followups: data || [],
  });
}