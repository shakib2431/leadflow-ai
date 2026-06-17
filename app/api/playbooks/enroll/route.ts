// app/api/playbooks/enroll/route.ts  ← CREATE THIS FILE

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { playbook_id, lead_ids } = await req.json();

    if (!playbook_id || !lead_ids || lead_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing playbook_id or lead_ids" },
        { status: 400 }
      );
    }

    // Get the first step so we know where to start each enrollment
    const { data: firstStep, error: stepErr } = await supabase
      .from("playbook_steps")
      .select("step_order")
      .eq("playbook_id", playbook_id)
      .order("step_order", { ascending: true })
      .limit(1)
      .single();

    if (stepErr || !firstStep) {
      return NextResponse.json(
        { success: false, error: "This playbook has no steps. Add steps before enrolling leads." },
        { status: 400 }
      );
    }

    // Build one enrollment row per lead
    const enrollments = lead_ids.map((lead_id: string) => ({
  playbook_id,
  lead_id,
  status: "active",
  current_step_order: firstStep.step_order,
  next_execution_at: new Date().toISOString(),
}));

    // upsert prevents duplicate enrollments for the same lead+playbook combo
    const { data, error } = await supabase
      .from("playbook_enrollments")
      .upsert(enrollments, { onConflict: "playbook_id,lead_id" })
      .select();

    if (error) {
      console.error("[Enroll] Supabase error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: data?.length ?? 0 });

  } catch (err: any) {
    console.error("[Enroll] Unhandled error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}