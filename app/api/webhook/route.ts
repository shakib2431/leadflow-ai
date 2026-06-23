import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 2. Parse Twilio's Form Data safely
    const textBody = await req.text();
    const formData = new URLSearchParams(textBody);

    const from = formData.get("From");
    const body = formData.get("Body");

    if (!from || !body) return NextResponse.json({ received: true });

    const cleanPhone = from.replace("whatsapp:", "");

    // 3. Find or Create Contact 
    let { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id, first_name, lead_score")
      .eq("phone", cleanPhone)
      .single();

    if (!contact) {
      const { data: newContact, error: createError } = await supabaseAdmin
        .from("contacts")
        .insert({ 
          phone: cleanPhone, 
          first_name: "New Lead", 
          source: "WhatsApp" 
        })
        .select()
        .single();
        
      if (createError || !newContact) {
        console.error("Failed to create new contact:", createError);
        return NextResponse.json({ error: "Contact creation failed" }, { status: 500 });
      }
      contact = newContact;
    }

    if (!contact) {
      return NextResponse.json({ error: "Contact resolution failed" }, { status: 500 });
    }

    // 3.5 Find or Create Conversation (Crucial for Triage UI linkage)
    let { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabaseAdmin
        .from("conversations")
        .insert({ 
          contact_id: contact.id, 
          channel: "whatsapp",
          unread_count: 1
        })
        .select()
        .single();
      conversation = newConv;
    } else {
      // Bump the conversation to the top of the Unified Inbox
      await supabaseAdmin.from("conversations").update({
        updated_at: new Date().toISOString(),
        unread_count: 1
      }).eq("id", conversation.id);
    }

    // 4. Log the Inbound Message
    await supabaseAdmin.from("messages").insert({
      contact_id: contact.id,
      conversation_id: conversation?.id, // Linked!
      channel: "whatsapp",
      direction: "inbound",
      sender_type: "contact",
      content: body,
      status: "received",
    });

    // 5. REAL-TIME AI RECALCULATION (The Brain)
    console.log(`🧠 Recalculating AI Brain for Contact ID: ${contact.id}`);
    
    const { data: recentMessages } = await supabaseAdmin
      .from("messages")
      .select("sender_type, content")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(10);
      
    const chatContext = recentMessages?.reverse().map((m: any) => `${m.sender_type}: ${m.content}`).join("\n") || body;

    const prompt = `
    Analyze this conversation for sales intent.
    Context: ${chatContext}
    Return ONLY JSON: { 
      "summary": "...", 
      "tag": "BUYING_INTENT" | "SUPPORT_ISSUE" | "GENERAL_INQUIRY", 
      "score": 85,
      "draftedReply": "Write the exact WhatsApp message to send back to them. Be professional and concise.",
      "dealValue": 1500
    }
    `;

    // Direct AI call inside the webhook
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const aiData = await aiResponse.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (rawText) {
      const parsed = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
      
      await supabaseAdmin.from("contacts").update({
        lead_score: parsed.score || contact.lead_score,
      }).eq("id", contact.id);
      
      console.log("✅ AI Score Updated:", parsed.score);

      // --- THE MISSING TRIAGE QUEUE INSERT ---
      if (conversation) {
        await supabaseAdmin.from("triage_inbox").insert({
          conversation_id: conversation.id,
          ai_tag: parsed.tag || "GENERAL_INQUIRY",
          suggested_reply: parsed.draftedReply || "Thank you for reaching out! Let me check on that and get right back to you.",
          suggested_deal_value: parsed.dealValue || 0,
          status: "pending"
        });
        console.log("📥 Added to Action Queue");
      }

      // --- TRIGGER THE TRIAGE ENGINE (Push Notifications / Scheduled Nurture) ---
      try {
        const { executeTriageWorkflow } = await import("@/lib/triage-engine");
        await executeTriageWorkflow(contact.id, parsed.score, contact.first_name, cleanPhone);
      } catch (err) {
        console.error("Triage Engine workflow failed or is missing:", err);
      }
    }

    // 6. Acknowledge Twilio
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("<Response></Response>", { 
      status: 500, 
      headers: { "Content-Type": "text/xml" } 
    });
  }
}