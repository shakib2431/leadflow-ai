import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  // SECURITY CHECK: Ensure this is triggered securely via Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized access to Cron Engine" }, { status: 401 });
  }

  try {
    console.log("🧠 [CRON] INITIATING AI DRAFTER ENGINE...");

    // 1. Fetch active leads only
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id, full_name, ai_summary, ai_next_action, status, phone")
      .in("status", ["contacted", "qualified", "hot", "negotiation"]);

    if (leadsError || !leads) {
      return NextResponse.json({ success: true, message: "No active leads to process." });
    }

    let draftedCount = 0;

    for (const lead of leads) {
      // RULE A: Check for existing pending follow-ups
      const { data: pendingTask } = await supabaseAdmin
        .from("follow_ups")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("status", "pending")
        .limit(1);

      if (pendingTask && pendingTask.length > 0) continue; 

      // RULE B: Check when we last messaged them
      const { data: lastMessage } = await supabaseAdmin
        .from("messages")
        .select("created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!lastMessage || lastMessage.length === 0) continue; 
      
      const lastMessageDate = new Date(lastMessage[0].created_at);
      const hoursSinceLastActivity = (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60);

      // RULE C: Has it been 24 hours?
      if (hoursSinceLastActivity < 24) continue; 

      console.log(`⏳ Lead [${lead.full_name}] is cold (${Math.round(hoursSinceLastActivity)}h). Drafting AI outreach...`);

      // 2. Generate the exact WhatsApp Draft
      const prompt = `
      You are an expert sales assistant acting on behalf of a business. 
      Lead Name: ${lead.full_name}
      Current Situation: ${lead.ai_summary || "No prior context available."}
      AI Recommended Strategy: ${lead.ai_next_action || "Follow up gently."}
      
      The lead has not replied in over 24 hours. Write a highly converting, short, human-sounding WhatsApp follow-up message to re-engage them. 
      Do not include placeholders like [Your Name]. Output ONLY the exact text of the message to send.
      `;

      const apiKey = process.env.GEMINI_API_KEY;
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      const aiData = await aiResponse.json();
      let draftMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (draftMessage) {
        draftMessage = draftMessage.replace(/```/g, "").replace(/\*\*/g, "").trim();

        // THE FAIL-SAFE: Set due date to 2 HOURS from now.
        // Gives human time to review in Command Center. If ignored, your process-followups script sends it automatically!
        const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); 

        await supabaseAdmin.from("follow_ups").insert({
          lead_id: lead.id,
          title: `Automated Re-engagement`,
          description: `Lead inactive for ${Math.round(hoursSinceLastActivity)} hours. System drafted this. Auto-sending in 2 hours if not reviewed.`,
          ai_message: draftMessage,
          due_date: dueDate, 
          status: "pending"
        });

        draftedCount++;
      }
    }

    console.log(`✅ [CRON] DRAFTER COMPLETE. Created ${draftedCount} new drafts.`);
    return NextResponse.json({ success: true, drafted_tasks: draftedCount });

  } catch (error) {
    console.error("DRAFTER ERROR:", error);
    return NextResponse.json({ error: "Autonomous Engine Failure" }, { status: 500 });
  }
}