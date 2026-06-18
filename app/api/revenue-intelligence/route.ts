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

    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, full_name, status, ai_score")
      .not("status", "in", '("won","lost")');

    if (error) throw error;

    const pipelineSummary = leads?.map(l => ({
      name: l.full_name,
      stage: l.status,
      score: l.ai_score
    })) || [];

    const prompt = `
      You are the Chief Revenue Officer (CRO) AI of LeadFlow.
      Analyze this current pipeline summary: ${JSON.stringify(pipelineSummary)}
      
      Generate a Revenue Intelligence Brief. 
      Return ONLY a JSON object with this exact structure:
      {
        "executive_summary": "A 2-sentence highly strategic overview of the current pipeline health.",
        "revenue_forecast": {
          "expected": 150000,
          "best_case": 220000,
          "at_risk": 45000
        },
        "opportunity_ranking": [
          { "name": "Lead Name", "reason": "Why they are highly likely to close" }
        ],
        "risk_ranking": [
          { "name": "Lead Name", "risk_factor": "Why this deal might be lost without action" }
        ],
        "recommended_actions": [
          { "action_type": "The specific action", "description": "What needs to be done" }
        ]
      }
    `;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          // Force strict JSON output
          generationConfig: {
            responseMimeType: "application/json",
          }
        }),
      }
    );

    const rawAiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("Gemini Intelligence API Error", rawAiData);
      return NextResponse.json({ error: "API Error from Gemini" }, { status: 500 });
    }

    const textBlock = rawAiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    try {
      // Direct parsing without regex
      const intelligenceData = JSON.parse(textBlock);
      return NextResponse.json({ success: true, data: intelligenceData });
    } catch (e) {
      console.error("Intelligence Parsing Error:", textBlock, e);
      return NextResponse.json({ error: "Failed to parse intelligence data" }, { status: 500 });
    }

  } catch (error) {
    console.error("Revenue Intelligence Error:", error);
    return NextResponse.json({ error: "Failed to generate intelligence" }, { status: 500 });
  }
}