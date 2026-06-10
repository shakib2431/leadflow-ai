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