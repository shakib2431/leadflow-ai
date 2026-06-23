import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: Request) {
  try {
    // 1. Twilio sends data as form-urlencoded, not JSON
    const formData = await req.formData();
    const from = formData.get("From") as string; // Looks like 'whatsapp:+1234567890'
    const body = formData.get("Body") as string;

    if (!from || !body) {
      return NextResponse.json({ error: "Missing required Twilio fields" }, { status: 400 });
    }

    // Clean the phone number (remove 'whatsapp:' prefix to match your database)
    const cleanPhone = from.replace("whatsapp:", "");

    // 2. Identify the Contact (Match the phone number to an existing CRM contact)
    let contactId = null;
    let conversationId = null;

    const { data: contacts, error: contactError } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("phone", cleanPhone)
      .limit(1);

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
      
      // Note: If you have a specific conversation routing logic, you'd fetch the active conversation_id here.
      // For now, tying it to the contact_id ensures it appears in their timeline.
    }

    // 3. Log the Inbound Message
    const { error: dbError } = await supabaseAdmin.from("messages").insert({
      contact_id: contactId,
      conversation_id: conversationId, // Can be null if it's a net-new inbound lead
      channel: "whatsapp",
      direction: "inbound",
      sender_type: "contact", // <-- ADD THIS LINE
      content: body,
      status: "received",
    });

    if (dbError) {
      console.error("Failed to log inbound webhook:", dbError);
    }

    // 4. Acknowledge Twilio
    // We return an empty TwiML <Response> so Twilio knows we received it and doesn't send an error to the user.
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error: any) {
    console.error("Webhook Processing Error:", error);
    return new NextResponse("<Response></Response>", { 
      status: 500, 
      headers: { "Content-Type": "text/xml" } 
    });
  }
}