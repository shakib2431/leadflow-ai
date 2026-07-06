import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { query, leadId, stage } = await req.json();

    // 1. Gather Context (RAG)
    const [deliverablesReq, ticketsReq] = await Promise.all([
      supabase.from("client_deliverables").select("*").eq("lead_id", leadId).limit(5),
      supabase.from("tickets").select("*").eq("lead_id", leadId).eq("status", "open").limit(3)
    ]);

    const deliverablesContext = deliverablesReq.data?.map(d => `${d.title} (${d.status})`).join(", ") || "None";
    const openTicketsContext = ticketsReq.data?.map(t => t.subject).join(", ") || "None";

    // 2. Construct System Prompt
    const systemInstruction = `
      You are the LeadFlow AI Client Success Assistant. 
      Tone: Professional, premium, concise, and helpful. 
      Context: The client is currently in the '${stage}' stage.
      Their Deliverables: ${deliverablesContext}.
      Their Open Support Tickets: ${openTicketsContext}.
      
      Answer their question directly based ONLY on this context. If you don't know, tell them an account manager will follow up.
    `;

    // 3. Generate Response
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const result = await model.generateContent(query);
    
    return NextResponse.json({ reply: result.response.text() });

  } catch (error) {
    console.error("AI Assistant Error:", error);
    return NextResponse.json({ reply: "I am currently syncing with the main server. Please try again in a moment." }, { status: 500 });
  }
}