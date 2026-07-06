import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest
) {
  try {
    const { email } =
      await req.json();

    const prompt = `
Write a professional sales follow-up email.

Recipient:
${email}

Return JSON:

{
  "subject": "",
  "message": ""
}
`;

    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

    const data =
      await response.json();

    const content =
      data.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    const cleaned =
      content
        ?.replace(/```json/g, "")
        ?.replace(/```/g, "")
        ?.trim();

    return NextResponse.json(
      JSON.parse(cleaned)
    );

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to generate email",
      },
      {
        status: 500,
      }
    );

  }
}