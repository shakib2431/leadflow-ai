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

    // 1. Fetch live telemetry (Limit to 5 to prevent token overload & UI clutter)
    const { data: rawLeads, error } = await supabase
      .from("actionable_leads_view")
      .select("*")
      .order("ai_score", { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!rawLeads || rawLeads.length === 0) return NextResponse.json({ actions: [] });

    // 2. Prepare Batched Context for the LLM
    const leadsContext = rawLeads.map(lead => {
      let contextType = "NURTURE";
      let contextDetails = "Lead is currently stable in pipeline loop.";

      if (lead.latest_inbound_message) {
        contextType = "INBOUND_REPLY";
        contextDetails = `Lead replied: "${lead.latest_inbound_message.content}" with detected sentiment: ${lead.latest_inbound_message.sentiment}`;
      } else if (lead.urgent_followup) {
        contextType = "OVERDUE_TASK";
        contextDetails = `Scheduled task [${lead.urgent_followup.title}] is due: ${new Date(lead.urgent_followup.due_date).toLocaleDateString()}`;
      }
      
      return {
        lead_id: lead.lead_id,
        full_name: lead.full_name,
        status: lead.status,
        ai_score: lead.ai_score,
        context_type: contextType,
        operational_context: contextDetails,
        phone: lead.phone,
        email: lead.email
      };
    });

    // 3. SINGLE BATCHED AI CALL
    const prompt = `
      You are an elite AI Revenue Agent running a business growth operating system. 
      Analyze these ${leadsContext.length} customers and generate an execution plan for each.

      CRITICAL TONE INSTRUCTIONS:
      Write all 'pre_drafted_content' with a "Quiet Luxury" aesthetic. The tone must be high-fashion, editorial, minimal, and premium (Dior-level restraint). No cheesy sales jargon, no exclamation mark overload. Keep it bespoke and sophisticated.

      Here is the JSON array of leads to process:
      ${JSON.stringify(leadsContext, null, 2)}

      Return a JSON array ONLY. Each object in the array must have this exact structure:
      [
        {
          "lead_id": "Must exactly match the lead_id provided",
          "reasoning": "A short 1-sentence analytical reason why this action is prioritized today.",
          "recommended_channel": "whatsapp" or "email",
          "subject_line": "Draft an email subject line if channel is email, otherwise empty string.",
          "pre_drafted_content": "The quiet-luxury outbound message ready to send."
        }
      ]
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
    const textBlock = rawAiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Clean markdown formatting if Gemini returns it
    const cleanJsonText = textBlock.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedAiActions = [];
    try {
      parsedAiActions = JSON.parse(cleanJsonText);
    } catch (e) {
      console.error("Failed parsing batched AI response:", e, cleanJsonText);
      return NextResponse.json({ error: "AI formatting error" }, { status: 500 });
    }

    // 4. Merge AI responses securely back with the original lead data
    const actionQueue = parsedAiActions.map((aiAction: any) => {
      const originalLead = leadsContext.find(l => l.lead_id === aiAction.lead_id);
      return {
        ...originalLead,
        ...aiAction
      };
    });

    return NextResponse.json({ actions: actionQueue });
  } catch (error) {
    console.error("Action Queue Generation Failure:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}