import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    // 1. Fetch live telemetry data on active pipelines
    const { data: rawLeads, error } = await supabase
      .from("actionable_leads_view")
      .select("*")
      .order("ai_score", { ascending: false });

    if (error) throw error;
    if (!rawLeads || rawLeads.length === 0) return NextResponse.json({ actions: [] });

    // 2. Synthesize and prioritize action items
    const actionQueue = [];

    for (const lead of rawLeads) {
      let contextType = "NURTURE";
      let contextDetails = "Lead is currently stable in pipeline loop.";

      if (lead.latest_inbound_message) {
        contextType = "INBOUND_REPLY";
        contextDetails = `Lead replied: "${lead.latest_inbound_message.content}" with detected sentiment: ${lead.latest_inbound_message.sentiment}`;
      } else if (lead.urgent_followup) {
        contextType = "OVERDUE_TASK";
        contextDetails = `Scheduled task [${lead.urgent_followup.title}] is due: ${new Date(lead.urgent_followup.due_date).toLocaleDateString()}`;
      }

      const prompt = `
        You are an elite AI Revenue Agent running a business growth operating system. 
        Analyze this customer's operational context and generate an execution plan.

        Context:
        - Customer Name: ${lead.full_name}
        - Pipeline Stage: ${lead.status}
        - Operational Context: ${contextDetails}
        - Engagement Strength: ${lead.ai_score}/100

        Return a JSON object ONLY with this exact structure:
        {
          "reasoning": "A short 1-sentence analytical reason why this action is prioritized today.",
          "recommended_channel": "whatsapp" or "email",
          "subject_line": "Draft an email subject line if channel is email, otherwise leave empty string.",
          "pre_drafted_content": "A high-conversion, concise, personalized outbound message ready to send immediately."
        }
      `;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const rawAiData = await aiResponse.json();
      const textBlock = rawAiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleanJsonText = textBlock.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        const parsedAiAction = JSON.parse(cleanJsonText);
        actionQueue.push({
          lead_id: lead.lead_id,
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          ai_score: lead.ai_score,
          context_type: contextType,
          ...parsedAiAction
        });
      } catch (e) {
        console.error("Failed parsing specific action card metadata:", e);
      }
    }

    return NextResponse.json({ actions: actionQueue });
  } catch (error) {
    console.error("Action Queue Generation Failure:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}