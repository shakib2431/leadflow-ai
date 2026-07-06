import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const payload = await req.json();
  const headers = req.headers;
  
  // Logic to handle Razorpay Webhook
  if (headers.get("x-razorpay-event-id")) {
    const orderId = payload.payload.payment.entity.order_id;
    const leadId = payload.payload.payment.entity.notes.lead_id;

    // AUTOMATION: Update Deal Stage to "won"
    await supabase.from("leads").update({ status: 'won', deal_stage: 'won' }).eq("id", leadId);
    await supabase.from("invoices").update({ status: 'paid', gateway_transaction_id: payload.payload.payment.entity.id }).eq("stripe_invoice_id", orderId);
  }

  return NextResponse.json({ received: true });
}