import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest
) {

  try {

    const { id } =
      await req.json();

    // Load followup

    const {
      data: followup,
    } = await supabaseAdmin
      .from("follow_ups")
      .select("*")
      .eq("id", id)
      .single();

    if (!followup) {
      return NextResponse.json(
        {
          error:
            "Followup not found",
        },
        {
          status: 404,
        }
      );
    }

    // Load lead

    const {
      data: lead,
    } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", followup.lead_id)
      .single();

    if (!lead?.phone) {
      return NextResponse.json(
        {
          error:
            "Lead phone missing",
        },
        {
          status: 400,
        }
      );
    }

    // Send WhatsApp

 const response =
  await fetch(
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
  "SEND NOW RESULT:",
  result
);

if (result.error) {
  return NextResponse.json(
    {
      error: "WhatsApp delivery failed",
      details: result.error,
    },
    {
      status: 400,
    }
  );
}

const { error: activityError } =
  await supabaseAdmin
    .from("activity_log")
    .insert({
      lead_id: lead.id,

      activity_type: "whatsapp",

      title: "WhatsApp Sent",

      description:
        followup.ai_message ||
        followup.description,
    });

console.log(
  "ACTIVITY LOG ERROR:",
  activityError
);

    // Mark complete

    await supabaseAdmin
  .from("follow_ups")
  .update({
    status: "completed",
    completed_at: new Date().toISOString(),
  })
  .eq("id", id);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to send followup",
      },
      {
        status: 500,
      }
    );

  }

}