import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    let prompt = "";

    if (action === "summarize") {
      prompt = `
        You are the AI assistant for LeadFlow's premium CRM.
        Read the following conversation thread and provide a concise, highly strategic 3-bullet-point executive summary. 
        Highlight the core intent, any friction points, and the immediate next step required.
        
        Thread Context:
        ${context}
      `;
    } else if (action === "translate") {
      prompt = `
        Translate the following message into professional, high-end English. 
        Preserve the original tone but ensure it reads perfectly for an elite business context.
        
        Original Message: "${text}"
        
        Return ONLY the translated text, nothing else.
      `;
    }

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

    const data = await response.json();
    if (!response.ok) throw new Error("Gemini API Error");

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ success: true, result: resultText.trim() });
  } catch (error) {
    console.error("Inbox AI Error:", error);
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
  }
}