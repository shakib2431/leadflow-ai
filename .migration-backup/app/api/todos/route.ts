import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Pull active leads along with current pipeline insights
    const { data: leads, error: leadErr } = await supabase
      .from('leads')
      .select('id, full_name, status, source, deal_intelligence(*), lead_memory(*)')
      .in('status', ['new', 'contacted', 'warm', 'hot', 'qualified']);

    if (leadErr) throw leadErr;

    const prompt = `
You are a Principal Revenue Operations Architect. Analyze these active client accounts:
${JSON.stringify(leads)}

Generate a highly strategic, high-impact array of tasks to complete today.
For each critical lead, determine the single most impactful action to drive revenue.

FINANCIAL CONTEXT:
Deals span high-end luxury leather goods retail/wholesale, premium catering packages, and bespoke digital services.

For each generated task, return a strict JSON payload matching this exact schema layout:
{
  "tasks": [
    {
      "lead_id": "EXACT_LEAD_UUID",
      "title": "Clear concise action header (e.g., Close Bulk Order Contract)",
      "description": "Short tactical reason why this must happen today.",
      "priority_score": 85,
      "task_type": "whatsapp", 
      "ai_draft_payload": {
        "message_copy": "A highly customized context-aware message ready to send to the client regarding their specific deal.",
        "negotiation_points": ["Key talking point 1 based on memory logs", "Key point 2"],
        "blocker_warning": "Potential risk factor warning to look out for."
      }
    }
  ]
}

Allowed task_type values: 'whatsapp', 'email', 'call', 'revival', 'admin'.
Return STRICTLY valid JSON data. No backticks, no markdown prose.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const parsedData = JSON.parse(response.text!);
    
    // Clear out stale pending tasks before rewriting the daily pipeline execution layout
    await supabase.from('crm_todos').delete().eq('status', 'pending');

    if (parsedData.tasks && parsedData.tasks.length > 0) {
      const inserts = parsedData.tasks.map((task: any) => ({
        lead_id: task.lead_id,
        title: task.title,
        description: task.description,
        priority_score: task.priority_score,
        task_type: task.task_type,
        ai_draft_payload: task.ai_draft_payload,
        status: 'pending'
      }));

      const { error: insertErr } = await supabase.from('crm_todos').insert(inserts);
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true, count: parsedData.tasks?.length || 0 });

  } catch (error: any) {
    console.error("Task Orchestrator API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data: tasks, error } = await supabase
      .from('crm_todos')
      .select('*, leads(full_name, phone, email, status)')
      .eq('status', 'pending')
      .order('priority_score', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: tasks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}