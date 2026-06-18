import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { query, leadId } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Here you would fetch lead data/memory from Supabase
  const prompt = `Answer this client query: ${query} based on project context.`;
  const result = await model.generateContent(prompt);
  
  return NextResponse.json({ reply: result.response.text() });
}