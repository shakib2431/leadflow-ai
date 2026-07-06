import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { name, objective, steps } = await req.json();

    if (!name || !steps || steps.length === 0) {
      return NextResponse.json({ error: "Playbook must have a name and at least one step." }, { status: 400 });
    }

    // 1. Insert the parent Playbook
    const { data: playbook, error: pbError } = await supabase
      .from('crm_playbooks')
      .insert([{ name, objective, is_active: false }])
      .select()
      .single();

    if (pbError) throw pbError;

    // 2. Format and insert the steps
    const stepInserts = steps.map((step: any, index: number) => ({
      playbook_id: playbook.id,
      step_order: index + 1,
      channel: step.channel,
      ai_prompt_context: step.ai_prompt_context,
      wait_time_hours: step.wait_time_hours
    }));

    const { error: stepsError } = await supabase
      .from('playbook_steps')
      .insert(stepInserts);

    if (stepsError) throw stepsError;

    return NextResponse.json({ success: true, playbook_id: playbook.id });

  } catch (error: any) {
    console.error("Playbook Save Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}