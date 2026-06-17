import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.raw_text || !body.lead_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });
    }

    const prompt = `
      Analyze this email reply from a lead: "${body.raw_text}"
      Classify the intent strictly into one of these: [BUYING_INTENT, OBJECTION, GENERAL_INQUIRY, HARD_STOP].
      Return a JSON object ONLY with the following structure:
      {"intent": "THE_INTENT_HERE", "suggested_reply": "A concise, professional suggested reply addressing the email."}
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const rawData = await response.json();
    const messageText = rawData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Clean up the markdown block if Gemini returns it
    const cleanText = messageText.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiData = JSON.parse(cleanText);

    // Log the inbound message
    await supabase.from("message_logs").insert({
      lead_id: body.lead_id,
      channel: "email",
      direction: "inbound",
      content: body.raw_text,
      sentiment: aiData.intent,
    });

    // Save the triage analysis
    await supabase.from("triage_inbox").insert({
      lead_id: body.lead_id,
      raw_email_body: body.raw_text,
      ai_analysis: aiData,
    });

    // --- THIS IS THE CRITICAL FIX ---
    // We are now sending the intent and suggestion back to the frontend
    return NextResponse.json({ 
      success: true,
      intent: aiData.intent,
      suggestion: aiData.suggested_reply
    });

  } catch (error) {
    console.error("Triage Error:", error);
    return NextResponse.json({ error: "Triage failed" }, { status: 500 });
  }
}