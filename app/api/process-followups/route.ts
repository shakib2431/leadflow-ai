import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {

  const now = new Date().toISOString();

  const { data: followups } =
    await supabaseAdmin
      .from("follow_ups")
      .select("*")
      .eq("status", "pending")
      .lte("due_date", now);

for (const followup of followups || []) {

  const { data: lead } =
    await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", followup.lead_id)
      .single();

  if (!lead?.phone) continue;

  console.log(
    "Sending follow-up to:",
    lead.phone
  );

  const response = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL}/api/send-whatsapp`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        phone: lead.phone,
        message:
  followup.ai_message ||
  followup.description,
      }),
    }
  );

const result =
  await response.json();

console.log(
  "MESSAGE BEING SENT:",
  followup.ai_message ||
  followup.description
);

console.log(
  "WhatsApp Result:",
  result
);


if (result.messages?.[0]?.id) {

 await supabaseAdmin
  .from("follow_ups")
  .update({
    status: "completed",
    completed_at: new Date().toISOString(),
  })
  .eq("id", followup.id);

  console.log(
    "Follow-up marked completed"
  );
}
}

  return NextResponse.json({
    count: followups?.length || 0,
    followups,
  });
}