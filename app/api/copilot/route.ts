import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { leadName, chatHistory, aiSummary } = await req.json();

    if (!chatHistory) {
      return NextResponse.json({ error: "Chat history required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    const prompt = `
    You are a world-class live sales coach whispering in the ear of a sales rep.
    You are monitoring this live WhatsApp conversation with a lead named ${leadName}.
    
    Lead Context: ${aiSummary || "New lead."}
    
    Recent Chat History:
    ${chatHistory}
    
    Analyze the customer's LAST message and provide real-time guidance.
    Return ONLY valid JSON in this exact format:
    {
      "mood": "Positive | Hesitant | Price-Sensitive | Urgent | Cold",
      "insight": "One short sentence explaining what the customer is really asking or feeling right now.",
      "strategy": "One short sentence telling the rep exactly how to handle this specific moment.",
      "suggested_reply": "A perfectly crafted, human-sounding WhatsApp reply the rep can send immediately."
    }
    
    Do NOT include markdown formatting like \`\`\`json. Return pure JSON.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("Empty AI response");

    // Clean and parse
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const copilotData = JSON.parse(rawText);

    return NextResponse.json(copilotData);

  } catch (error) {
    console.error("COPILOT ERROR:", error);
    return NextResponse.json({ error: "Copilot failed to analyze" }, { status: 500 });
  }
}