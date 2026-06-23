import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// Initialize Resend with Vercel Environment Variable
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase Admin Client to bypass RLS for secure server-side logging
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contactId, conversationId, to, subject, text, html } = body;

    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: "Missing required fields: 'to', 'subject', or 'text'." },
        { status: 400 }
      );
    }

    // 1. Dispatch Email via Resend
    // Utilizing your professional domain for luxury/high-ticket consistency
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || "Imran@bespokedigitalsolution.com";
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `LeadFlow AI <${senderEmail}>`,
      to: [to],
      subject: subject,
      text: text,
      html: html || text, // Fallback to plain text if HTML isn't provided
    });

    if (emailError) {
      console.error("Resend Dispatch Error:", emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    // 2. Log to Unified Inbox (messages table)
    const { error: dbError } = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId || null,
      contact_id: contactId || null,
      channel: "email",
      direction: "outbound",
      content: text,
      subject: subject,
      status: "delivered",
    });

    if (dbError) {
      console.error("Database Logging Error:", dbError);
      // We don't fail the request here because the email actually sent, 
      // but we log the DB failure for observability.
    }

    return NextResponse.json(
      { success: true, messageId: emailData?.id },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Email Route Critical Failure:", error);
    return NextResponse.json(
      { error: "Internal Server Error during email dispatch." },
      { status: 500 }
    );
  }
}