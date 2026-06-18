import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role key for backend operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing" }, { status: 500 });
    }

    // Direct REST call to Google
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "Gemini generation failed" },
        { status: 502 }
      );
    }

    const messageText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!messageText) {
      return NextResponse.json(
        { error: "Google API returned an empty text structure." },
        { status: 502 }
      );
    }

    // --- LOG THE MESSAGE TO SUPABASE ---
    if (body.lead_id) {
      await supabase.from("message_logs").insert({
        lead_id: body.lead_id,
        channel: "whatsapp", // You can change this dynamically if needed
        direction: "outbound",
        content: messageText,
        sentiment: "neutral", // You can add logic to detect sentiment here
      });
    }

    return NextResponse.json({
      message: messageText,
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}