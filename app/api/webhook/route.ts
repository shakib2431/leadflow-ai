import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Verification failed" },
    { status: 403 }
  );
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return NextResponse.json({ received: true });

    const from = message.from;
    const text = message.text?.body || "";
    const waNumberId = change?.value?.metadata?.phone_number_id;

    // A. Find Business (Multi-tenant)
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("whatsapp_number_id", waNumberId)
      .single();

    // B. Find or Create Lead
    let { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, full_name, ai_score")
      .eq("phone", from)
      .single();

    if (!lead) {
      const { data: newLead } = await supabaseAdmin
        .from("leads")
        .insert({ 
          phone: from, 
          full_name: "New Lead", 
          business_id: business?.id,
          source: "WhatsApp" 
        })
        .select()
        .single();
      lead = newLead;
      // --- ADD THIS CHECK HERE ---
      if (!lead) {
        console.error("Failed to create new lead.");
        return NextResponse.json({ error: "Lead creation failed" }, { status: 500 });
      }
      // ---------------------------
    }

    // C. Save Message
    await supabaseAdmin.from("messages").insert({
      lead_id: lead.id,
      business_id: business?.id,
      sender: "client",
      message: text,
    });

    // D. REAL-TIME AI RECALCULATION (The Brain)
    console.log(`🧠 Recalculating AI Brain for: ${lead.full_name}`);
    
    const { data: recentMessages } = await supabaseAdmin
      .from("messages")
      .select("sender, message")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(10);
      
    const chatContext = recentMessages?.reverse().map(m => `${m.sender}: ${m.message}`).join("\n") || text;

    const prompt = `
    Analyze this conversation for sales intent.
    Customer: ${lead.full_name}
    Context: ${chatContext}
    Return ONLY JSON: { "summary": "...", "intent": "...", "nextAction": "...", "score": 0-100 }
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
      await supabaseAdmin.from("leads").update({
        ai_score: parsed.score || lead.ai_score,
        ai_summary: parsed.summary,
        ai_next_action: parsed.nextAction
      }).eq("id", lead.id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}