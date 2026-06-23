import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

// Initialize Supabase Admin (Bypasses RLS for secure server-side execution)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function executeTriageWorkflow(contactId: string, aiScore: number, contactName: string, phone: string) {
  try {
    // 1. HOT LEAD: Immediate Human Triage (Score 70-100)
    if (aiScore >= 70) {
      console.log(`🔥 High Intent Detected (${aiScore}). Routing to priority Action Queue...`);
      
      // Alert the Sales Manager / Owner via their personal WhatsApp
      // Make sure to add SALES_MANAGER_WHATSAPP="whatsapp:+[YourPhone]" to your .env.local
      const managerPhone = process.env.SALES_MANAGER_WHATSAPP; 
      
      if (managerPhone) {
        await twilioClient.messages.create({
          body: `🚨 *PRIORITY LEAD ALERT*\n\n*Name:* ${contactName}\n*Phone:* +${phone}\n*AI Intent Score:* ${aiScore}/100\n\nThis lead is exhibiting high purchase intent. Open the LeadFlow Action Queue immediately to close the deal.`,
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: managerPhone,
        });
      }
      return;
    }

    // 2. COLD LEAD: Automated Nurturing Sequence (Score 0-39)
    if (aiScore < 40) {
      console.log(`❄️ Low Intent Detected (${aiScore}). Enrolling in nurture sequence...`);
      
      // Inserts a record into the Action Queue. A future cron job will check this 
      // table daily and automatically send perfectly timed follow-ups.
      await supabaseAdmin.from("action_queue").insert({
        contact_id: contactId,
        workflow_type: "long_term_nurture",
        status: "scheduled",
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Schedule exactly 7 days from now
      });
      return;
    }

    // 3. WARM LEAD (Score 40-69): Standard Inbox Queue
    console.log(`🟡 Warm Lead (${aiScore}). Sitting in standard unified inbox queue for manual review.`);

  } catch (error) {
    console.error("Triage Engine Failure:", error);
  }
}