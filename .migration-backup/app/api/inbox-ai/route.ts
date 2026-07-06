import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    let prompt = "";

    // Added Fallbacks just in case the chat is empty
    const safeContext = context || "No conversation history yet.";

    if (action === "summarize") {
      prompt = `
        You are the AI assistant for LeadFlow's premium CRM.
        Read the following conversation thread and provide a concise, highly strategic 3-bullet-point executive summary. 
        Highlight the core intent, any friction points, and the immediate next step required.
        
        Thread Context:
        ${safeContext}
      `;
    } else if (action === "draft") {
      prompt = `
        You are the AI assistant for LeadFlow's premium CRM.
        Read the following conversation thread and draft a professional, polite, and conversion-focused response from the agent.
        Keep it concise (2-3 sentences max). Do not include placeholders like [Your Name].
        
        Thread Context:
        ${safeContext}
        
        Return ONLY the drafted response text, nothing else.
      `;
    }

    // Switched to the universally stable gemini-1.5-flash
    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    
    // Improved Error Logging so we can see exactly what Google is complaining about
    if (!response.ok) {
      console.error("Google API Details:", data);
      throw new Error(data.error?.message || "Gemini API Error");
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ success: true, result: resultText.trim() });
  } catch (error: any) {
    console.error("Inbox AI Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process AI request" }, { status: 500 });
  }
}