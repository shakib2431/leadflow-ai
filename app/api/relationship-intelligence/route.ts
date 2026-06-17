import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { leadId, lead, memory, emails, activities, followups } = await req.json();

    if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

    const prompt = `
You are an elite enterprise sales relationship strategist. Analyze the CRM data to extract the HUMAN side of this deal.
Data: ${JSON.stringify({ lead, memory, emails, activities, followups })}

Return STRICTLY valid JSON matching this exact structure:
{
  "champion": "", "decision_maker": "", "economic_buyer": "",
  "relationship_strength": 0, "buying_intent": 0, "trust_score": 0,
  "engagement_trend": "", "primary_objection": "", "secondary_objection": "",
  "risk_level": "", "missing_information": ["", ""],
  "stakeholders": [{ "name": "", "role": "", "sentiment": "positive" }],
  "next_relationship_action": ""
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) throw new Error("Empty response");
    
    const analysisData = JSON.parse(response.text);
    const dbPayload = { lead_id: leadId, ...analysisData, last_analyzed_at: new Date().toISOString() };

    const { data: savedData, error } = await supabase
      .from("relationship_intelligence")
      .upsert(dbPayload, { onConflict: 'lead_id' })
      .select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: savedData });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}