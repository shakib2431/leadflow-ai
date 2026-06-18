import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CRITICAL: Force Next.js to run this fresh every time
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const { data: rawLeads, error } = await supabase
      .from("actionable_leads_view")
      .select("*")
      .order("ai_score", { ascending: false })
      .limit(4);

    if (error) throw error;
    if (!rawLeads || rawLeads.length === 0) return NextResponse.json({ actions: [] });

    const agentActions = [];

    for (const lead of rawLeads) {
      
      // 💥 2-second delay to bypass Free Tier rate limits safely
      await new Promise(resolve => setTimeout(resolve, 2000));

      const businessContext = `
        You are the elite AI Revenue Agent for LeadFlow AI, operating within Imran's premium digital scaling and bespoke offerings ecosystem. 
        Your communication style is "Quiet Luxury"—think high-fashion editorial, Dior-level restraint, hyper-specific, and flawlessly professional. 
        Zero corporate fluff, zero generic placeholders.
      `;

      const prompt = `
        ${businessContext}
        
        Analyze this pipeline lead and draft the optimal revenue-generating action. Do NOT include generic text placeholders like "[YOUR SOLUTION]" or "[Your Name]" under any circumstances—use explicit, context-appropriate value-driven descriptions.
        
        Context:
        - Name: ${lead.full_name}
        - Stage: ${lead.status}
        - Score: ${lead.ai_score}/100
        - Latest Context: ${lead.latest_inbound_message ? JSON.stringify(lead.latest_inbound_message) : "No recent messages. Lead is inactive. This is a revival play."}

        Determine the most lethal execution task. Return ONLY a JSON object with this exact structure:
        {
          "type": "EMAIL" or "WHATSAPP" or "FOLLOW_UP" or "REVIVAL",
          "reasoning": "A concise, executive 1-sentence strategic justification.",
          "revenue_impact": "High", "Medium", or "Low",
          "subject_line": "A high-conversion subject line (if EMAIL), otherwise empty string",
          "draft_content": "The actual message/action details. Hyper-personalized, premium, direct, and ready for instant dispatch."
        }
      `;

      // Upgraded to Gemini 2.5 Flash
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            }
          }),
        }
      );

      const rawAiData = await aiResponse.json();

      if (!aiResponse.ok) {
        console.error("Gemini API Error for lead", lead.full_name, rawAiData);
        continue; 
      }

      const textBlock = rawAiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      try {
        const parsedAction = JSON.parse(textBlock);
        agentActions.push({
          action_id: crypto.randomUUID(), // CRITICAL for frontend Approve/Reject tracking
          lead_id: lead.lead_id,
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email,
          ...parsedAction
        });
      } catch (e) {
        console.error("Agent Parsing Error for:", lead.full_name, "\nPayload:", textBlock, "\nError:", e);
      }
    }

    return NextResponse.json({ actions: agentActions });
  } catch (error) {
    console.error("Revenue Agent Error:", error);
    return NextResponse.json({ error: "Failed to generate agent actions" }, { status: 500 });
  }
}