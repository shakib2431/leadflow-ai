import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(
  process.env.RESEND_API_KEY
);
const supabaseAdmin =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  req: NextRequest
) {
  try {
   const {
  lead_id,
  to,
  subject,
  body,
} = await req.json();

    const result =
      await resend.emails.send({
        from:
          "onboarding@resend.dev",
        to,
        subject,
        html: body,
      });
      await supabaseAdmin
  .from("email_history")
  .insert({
    lead_id,
    recipient: to,
    subject,
    body,
  });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(   
      {
        error:
          "Failed to send email",
      },
      {
        status: 500,
      }
    );
  }
}