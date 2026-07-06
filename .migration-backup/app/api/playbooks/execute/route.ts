import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// const resend  = new Resend(process.env.RESEND_API_KEY!);
const resend = new Resend(
  process.env.RESEND_API_KEY || "re_dummy_key_to_bypass_build"
);
const ai      = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // ── 1. Fetch active enrollments due for execution ──────────────────────
    const { data: enrollments, error: enrollErr } = await supabase
      .from("playbook_enrollments")
      .select(`
        *,
        leads (*),
        crm_playbooks (
          objective,
          playbook_steps (*)
        )
      `)
      .eq("status", "active")
      .lte("next_execution_at", new Date().toISOString());

    if (enrollErr) {
      console.error("[Execute] DB fetch error:", enrollErr.message);
      return NextResponse.json(
        { success: false, error: enrollErr.message },
        { status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ message: "No executions pending." });
    }

    let processedCount = 0;

    // ── 2. Execute each enrollment ─────────────────────────────────────────
    for (const enrollment of enrollments) {

      if (!enrollment.crm_playbooks) {
        console.warn(`[Execute] Enrollment ${enrollment.id} has no linked playbook. Skipping.`);
        continue;
      }

      if (!enrollment.leads) {
        console.warn(`[Execute] Enrollment ${enrollment.id} has no linked lead. Skipping.`);
        continue;
      }

      const playbookSteps: any[] = enrollment.crm_playbooks.playbook_steps ?? [];

      if (!Array.isArray(playbookSteps) || playbookSteps.length === 0) {
        console.warn(`[Execute] Playbook for enrollment ${enrollment.id} has no steps. Pausing.`);
        await supabase
          .from("playbook_enrollments")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      const currentStep = playbookSteps.find(
        (s: any) => s.step_order === enrollment.current_step_order
      );

      if (!currentStep) {
        console.log(`[Execute] Enrollment ${enrollment.id} completed all steps.`);
        await supabase
          .from("playbook_enrollments")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      // ── 3. AI generates the personalized message ─────────────────────────
      const prompt = `
        You are an elite SDR AI acting on behalf of the user.
        Lead Context: ${JSON.stringify(enrollment.leads)}
        Playbook Objective: ${enrollment.crm_playbooks.objective ?? "Not specified"}
        Step Instructions: ${currentStep.ai_prompt_context ?? "Follow up professionally"}
        Channel: ${currentStep.channel}

        Draft the exact message to send.
        Return STRICT JSON only — no markdown, no backticks:
        { "message": "The exact text to send", "sentiment_prediction": "positive|neutral|risk" }
      `;

      let aiData: { message: string; sentiment_prediction: string };

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Gemini returned an empty response.");

        aiData = JSON.parse(rawText);
        if (!aiData.message || !aiData.sentiment_prediction) {
          throw new Error("Gemini JSON missing required fields.");
        }
      } catch (aiError: any) {
        console.error(
          `[Execute] AI generation failed for enrollment ${enrollment.id}:`,
          aiError.message
        );
        continue;
      }
      await supabase.from("message_logs").insert({
      lead_id: enrollment.leads.id,
      enrollment_id: enrollment.id,
      channel: currentStep.channel,
      direction: 'outbound',
      content: aiData.message,
      sentiment: aiData.sentiment_prediction
    });

      // ── 4. Dispatch the message ──────────────────────────────────────────
      //                    ↑ THIS IS THE ONLY BLOCK THAT CHANGED ↑
      if (currentStep.channel === "email") {

        if (!enrollment.leads.email) {
          console.warn(
            `[Execute] Lead ${enrollment.leads.full_name} has no email. Skipping send.`
          );
        } else {
          const { error: emailErr } = await resend.emails.send({
            from:    "LeadFlow AI <outreach@yourdomain.com>",
            to:      enrollment.leads.email,
            subject: `Following up — ${enrollment.crm_playbooks.objective}`,
            text:    aiData.message,
          });

          if (emailErr) {
            console.error(
              `[Execute] Email failed for ${enrollment.leads.email}:`,
              emailErr.message
            );
          } else {
            console.log(`[Execute] ✉️  Email sent to ${enrollment.leads.email}`);
          }
        }

      } else if (currentStep.channel === "whatsapp") {
        console.log(
          `[Execute] 📱 WhatsApp pending for ${enrollment.leads.phone}: ${aiData.message}`
        );
      }
      // ── END OF CHANGED BLOCK ─────────────────────────────────────────────

      // ── 5. Advance to the next step ──────────────────────────────────────
      const waitHours =
        typeof currentStep.wait_time_hours === "number"
          ? currentStep.wait_time_hours
          : 24;

      const nextStepTime = new Date();
      nextStepTime.setHours(nextStepTime.getHours() + waitHours);

      const { error: updateErr } = await supabase
        .from("playbook_enrollments")
        .update({
          current_step_order: enrollment.current_step_order + 1,
          next_execution_at:  nextStepTime.toISOString(),
          updated_at:         new Date().toISOString(),
          last_ai_analysis: {
            prediction:      aiData.sentiment_prediction,
            last_sent:       new Date().toISOString(),
            message_preview: aiData.message.slice(0, 100),
          },
        })
        .eq("id", enrollment.id);

      if (updateErr) {
        console.error(
          `[Execute] Failed to advance enrollment ${enrollment.id}:`,
          updateErr.message
        );
        continue;
      }

      console.log(
        `[Execute] ✓ Enrollment ${enrollment.id} → step ${enrollment.current_step_order} complete. Next in ${waitHours}h.`
      );
      processedCount++;
    }

    return NextResponse.json({
      success:  true,
      executed: processedCount,
      total:    enrollments.length,
    });

  } catch (error: any) {
    console.error("[Execute] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}