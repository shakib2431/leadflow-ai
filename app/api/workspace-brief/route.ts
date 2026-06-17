import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// 1. Initialize the NEW SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

export async function POST(req: NextRequest) {
  try {
    const { lead, memory, emails, activities, followups } = await req.json();

    const prompt = `
You are an elite enterprise sales strategist.
You are an elite AI sales director.

Analyze the lead, memory, emails, activities and followups.

Determine:
- risk level
- deal health
- probability of closing
- best next action
- recommended outreach

Return ONLY valid JSON.

Lead:
${JSON.stringify(lead)}

Memory:
${JSON.stringify(memory)}

Emails:
${JSON.stringify(emails)}

Activities:
${JSON.stringify(activities)}

Followups:
${JSON.stringify(followups)}

Return strictly in this format:
{
  "executiveSummary":"",
  "dealHealth":"",
  "closeProbability":0,
  "riskLevel":"",
  "nextBestAction":"",
  "recommendedOutreach":""
}
`;

    // 2. Use the new syntax and upgrade to Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    // 3. In the new SDK, text is a property, not a function
 // 3. In the new SDK, text is a property, not a function
    const text = response.text;

    // Safety check: Ensure text exists before parsing
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(text), 
    });

  } catch (error) {
    console.error("Gemini API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI brief",
      },
      {
        status: 500,
      }
    );
  }
}