import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    console.log("VERIFY ROUTE HIT");
   const {
  whatsapp_id,
  whatsapp_token,
  business_name,
  website,
  industry,
  timezone,
  currency
} = await req.json();
   if (
  !business_name ||
  !whatsapp_id ||
  !whatsapp_token
){
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    console.log("SKIPPING WHATSAPP VALIDATION");

    // 1. TEST THE KEYS: Validate against WhatsApp Graph API
    // const res = await fetch(`https://graph.facebook.com/v20.0/${whatsapp_id}`, {
    //   headers: { "Authorization": `Bearer ${whatsapp_token}` }
    // });

    // const data = await res.json();

    // if (!res.ok) {
    //   console.error("WhatsApp Auth Failed:", data);
    //   return NextResponse.json({ error: "Invalid WhatsApp Credentials. Please check your Token and ID." }, { status: 400 });
    // }

    // 2. SAVE TO DATABASE: Create the business record
const { data: business, error } = await supabaseAdmin
.from("businesses")
.insert({
  name: business_name,

  slug: business_name
    .toLowerCase()
    .replaceAll(" ", "-"),

  website,
  industry,
  timezone,
  currency,

  wa_phone_number_id: whatsapp_id,
  wa_access_token: whatsapp_token,

  setup_completed: true,
})
.select()
.single();

    if (error) {
      console.error("Database Error:", error);
      return NextResponse.json({ error: "Database setup failed" }, { status: 500 });
    }

    // 3. RETURN SUCCESS
    return NextResponse.json({ success: true, businessId: business.id });

  } catch (error) {
    console.error("Verification Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}