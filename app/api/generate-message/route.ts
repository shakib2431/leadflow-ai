import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing on the server" }, { status: 500 });
    }

    // Direct REST call to Google's free developer endpoint using Gemini 2.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: body.prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("GEMINI API RESPONSE:", data);

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "Gemini generation failed" },
        { status: 502 }
      );
    }

    // Safely extract the generated string from Google's data tree structure
    const messageText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!messageText) {
      return NextResponse.json(
        { error: "Google API returned an empty text structure." },
        { status: 502 }
      );
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