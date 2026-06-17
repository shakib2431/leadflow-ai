import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
   // Fetch macro pipeline data directly from DB to feed the AI
  
    const { data: pipelineData, error } = await supabase
      .from('leads')
      .select(`
        id, full_name, status, source,
        deal_intelligence ( deal_value, win_probability, forecast_category, deal_risk, expected_close_date )
      `)
      // CHANGE THIS LINE: use 'lost' instead of 'closed_lost'
     .in('status', ['new', 'contacted', 'warm', 'hot', 'qualified']);

    if (error) throw error;

    // Condense data to avoid token bloat
    const mappedPipeline = pipelineData?.map(lead => ({
      id: lead.id,
      name: lead.full_name, // <-- Updated here
      value: lead.deal_intelligence?.[0]?.deal_value || 0,
      prob: lead.deal_intelligence?.[0]?.win_probability || 0,
      category: lead.deal_intelligence?.[0]?.forecast_category || 'Pipeline',
      risk: lead.deal_intelligence?.[0]?.deal_risk || 'Medium',
      date: lead.deal_intelligence?.[0]?.expected_close_date || 'Unknown'
    })) || [];

    const prompt = `
You are an elite Chief Revenue Officer AI (combining Salesforce Einstein + Gong Revenue AI).
Analyze the entire active sales pipeline and generate a macro-level executive brief and action plan.

CURRENT PIPELINE DATA:
${JSON.stringify(mappedPipeline)}

Based on this data, generate a strict JSON response that provides:
1. "executive_summary": A punchy, 2-3 sentence executive summary of pipeline health.
2. "biggest_revenue_blocker": The single biggest macro risk or bottleneck you observe.
3. "priorities": Rank the top 3-5 leads that require immediate attention to drive revenue. (Use exact lead_ids).
4. "opportunity_radar": Top 3-5 strongest deals closest to winning. (Use exact lead_ids).
5. "deal_risks": Top 3-5 deals that are highly at risk of slipping or being lost. (Use exact lead_ids).
6. "ai_recommendations": Specific tactical actions (Calls, Emails, Revivals, Followups).

Return STRICTLY valid JSON matching this structure:
{
  "executive_summary": "",
  "biggest_revenue_blocker": "",
  "priorities": [
    { "lead_id": "", "lead_name": "", "reason": "", "recommended_action": "", "priority_score": 95 }
  ],
  "opportunity_radar": [
    { "lead_id": "", "lead_name": "", "next_action": "" }
  ],
  "deal_risks": [
    { "lead_id": "", "lead_name": "", "risk_reason": "", "suggested_rescue": "" }
  ],
  "ai_recommendations": {
    "calls": ["String"],
    "emails": ["String"],
    "revivals": ["String"],
    "followups": ["String"]
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    if (!response.text) throw new Error("Empty AI response.");
    const aiData = JSON.parse(response.text);

    // Save snapshot to DB
    const { data: savedSnapshot, error: insertError } = await supabase
      .from('dashboard_intelligence')
      .insert([aiData])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: savedSnapshot });

  } catch (error: any) {
    console.error("Dashboard AI Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}