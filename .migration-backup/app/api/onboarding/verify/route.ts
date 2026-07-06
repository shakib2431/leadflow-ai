import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      business_name,
      website,
      industry,
      timezone,
      currency,
      whatsapp_id,
      whatsapp_token
    } = body;

    // 1. Verify credentials with Meta's Graph API
    const verifyUrl = `https://graph.facebook.com/v17.0/${whatsapp_id}?access_token=${whatsapp_token}`;
    
    const metaResponse = await fetch(verifyUrl);
    const metaData = await metaResponse.json();

    if (metaData.error) {
      return NextResponse.json({ error: "Invalid WhatsApp ID or Access Token." }, { status: 401 });
    }

    // 2. Save Business Configuration to Supabase
    const { error: dbError } = await supabase
      .from('businesses')
      .upsert({
        name: business_name,
        website: website || null,
        industry: industry,
        timezone: timezone,
        currency: currency,
        whatsapp_phone_number_id: whatsapp_id,
        whatsapp_access_token: whatsapp_token,
        setup_completed: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'whatsapp_phone_number_id' }); 

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Connected." });

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to initialize." }, { status: 500 });
  }
}