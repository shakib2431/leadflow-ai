import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

// Initialize Supabase Service Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { leadId, lead, memory, relationship, emails, activities, followups } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    const prompt = `
You are an elite Revenue Intelligence AI (combining Salesforce Einstein, HubSpot Revenue Intelligence, and Gong AI) advising a VP of Sales.

BUSINESS CONTEXT & FINANCIAL RULES:
This CRM manages deals across luxury retail goods, bespoke digital solutions, and Premium event catering.
- NEVER default to generic $100,000 SaaS deal sizes.
- Typical individual retail/product orders: $100 to $999.
- Typical event catering packages or bespoke digital retainers: $1,000 to $5,000.
- Typical wholesale, B2B, or bulk orders: $5,000 to $15,000.
Use the CRM context to determine the most accurate deal value within these bounds.

CRM Context:
Lead: ${JSON.stringify(lead)}
Memory: ${JSON.stringify(memory)}
Relationship Intel: ${JSON.stringify(relationship)}
Emails: ${JSON.stringify(emails)}
Activities: ${JSON.stringify(activities)}
Followups: ${JSON.stringify(followups)}

Analyze the deal strength, buying intent, stakeholder alignment, objections, and momentum.

Forecast Categories allowed (STRICTLY ONE OF): 'Commit', 'Best Case', 'Pipeline', 'At Risk', 'Lost Likely'.
Deal Risks allowed (STRICTLY ONE OF): 'Low', 'Medium', 'High', 'Critical'.

Return STRICTLY valid JSON matching this exact structure:
{
  "dealValue": 0,
  "winProbability": 0,
  "expectedCloseDate": "YYYY-MM-DD",
  "forecastCategory": "Pipeline",
  "dealRisk": "Medium",
  "confidenceScore": 0,
  "revenueContribution": 0,
  "pipelineImpact": 0,
  "momentumScore": 0,
  "stakeholderAlignment": 0,
  "engagementScore": 0,
  "keyRisks": ["risk 1", "risk 2"],
  "positiveSignals": ["signal 1", "signal 2"],
  "recommendedActions": ["action 1", "action 2"],
  "executiveForecast": "Short 2 sentence executive summary of the deal trajectory."
}
`;

    // Execute Gemini 2.5 Flash Call
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Highly analytical, low hallucination
      }
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response.");

    const aiData = JSON.parse(text);

    // Prepare data for Supabase, mapping camelCase to snake_case
    const dbPayload = {
      lead_id: leadId,
      deal_value: aiData.dealValue,
      win_probability: aiData.winProbability,
      expected_close_date: aiData.expectedCloseDate,
      forecast_category: aiData.forecastCategory,
      deal_risk: aiData.dealRisk,
      confidence_score: aiData.confidenceScore,
      revenue_contribution: aiData.revenueContribution,
      pipeline_impact: aiData.pipelineImpact,
      momentum_score: aiData.momentumScore,
      stakeholder_alignment: aiData.stakeholderAlignment,
      engagement_score: aiData.engagementScore,
      key_risks: aiData.keyRisks,
      positive_signals: aiData.positiveSignals,
      recommended_actions: aiData.recommendedActions,
      executive_forecast: aiData.executiveForecast,
      updated_at: new Date().toISOString()
    };

    // Upsert into Supabase
    const { data: savedData, error } = await supabase
      .from("deal_intelligence")
      .upsert(dbPayload, { onConflict: 'lead_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: savedData,
    });

  } catch (error: any) {
    console.error("Deal Intelligence API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze deal." },
      { status: 500 }
    );
  }
}