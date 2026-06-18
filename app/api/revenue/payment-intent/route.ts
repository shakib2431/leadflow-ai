import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import Stripe from "stripe";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: Request) {
  const { amount, currency, lead_id, gateway } = await req.json();

  if (gateway === 'razorpay') {
    // INDIA-SPECIFIC: Razorpay Order Creation
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay takes paise
      currency: "INR",
      receipt: `lead_${lead_id}`,
    });
    return NextResponse.json({ order_id: order.id, key: process.env.RAZORPAY_KEY_ID });
  } else {
    // INTERNATIONAL: Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "usd", product_data: { name: "Service" }, unit_amount: amount * 100 }, quantity: 1 }],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
    });
    return NextResponse.json({ url: session.url });
  }
}