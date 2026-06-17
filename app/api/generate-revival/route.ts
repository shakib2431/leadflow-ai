import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function POST(
  req: NextRequest
) {
  try {
    const {
      leadName,
      leadScore,
      daysInactive,
      stage,
    } = await req.json();

    const model =
      genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

    const prompt = `
You are an elite sales recovery strategist.

Lead Name: ${leadName}
Lead Score: ${leadScore}
Pipeline Stage: ${stage}
Days Inactive: ${daysInactive}

Return JSON only:

{
  "risk_level": "",
  "reason": "",
  "revival_message": ""
}

Risk levels:
0-30 = High
31-70 = Medium
71-100 = Low

Create a personalized revival message.
`;

    const result =
      await model.generateContent(
        prompt
      );

    const text =
      result.response.text();

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({
      success: true,
      data: JSON.parse(cleaned),
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed",
      },
      {
        status: 500,
      }
    );
  }
}