import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest
) {

  const { id } =
    await req.json();

  const { error } =
    await supabaseAdmin
      .from("follow_ups")
      .update({
        status: "completed",
      })
      .eq("id", id);
      const { data: followup } = await supabaseAdmin
  .from("follow_ups")
  .select("*")
  .eq("id", id)
  .single();

if (followup) {
  await supabaseAdmin
    .from("activity_log")
    .insert({
      lead_id: followup.lead_id,

      activity_type: "followup",

      title: "Follow-up Completed",

      description: followup.title,
    });
}

  if (error) {
    return NextResponse.json(
      { error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}