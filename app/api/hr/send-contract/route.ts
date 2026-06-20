import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize the Resend client with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming data from your frontend
    const data = await request.json();
    
    console.log(`Attempting to send real email to: ${data.email}`);

    // 2. Call the Resend API to actually send the email
    const { data: emailData, error } = await resend.emails.send({
      // "onboarding@resend.dev" is a special testing address provided by Resend
      from: 'LeadFlow HR <onboarding@resend.dev>', 
      to: [data.email],
      subject: `Action Required: Employment Contract for ${data.name}`,
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
          <h2 style="color: #1a1a1a;">Welcome to the team, ${data.name}!</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            We are thrilled to have you join us as our new <strong>${data.role}</strong>. 
            Before your official start date, we need you to review and sign your employment agreement.
          </p>
          <div style="background-color: #f9f9fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #4a4a4a;"><strong>Position:</strong> ${data.role}</p>
            <p style="margin: 5px 0 0 0; color: #4a4a4a;"><strong>Base Salary:</strong> ₹${Number(data.salary).toLocaleString()}</p>
          </div>
          <a href="#" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Review & Sign Contract
          </a>
          <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px;">
            Securely sent via LeadFlow AI HRMS.
          </p>
        </div>
      `,
    });

    // 3. Handle any errors from Resend (e.g., missing API key, unverified domain)
    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. Success log and response
    console.log("Email sent successfully! ID:", emailData?.id);

    return NextResponse.json({ 
      success: true, 
      message: `Contract successfully dispatched to ${data.email}` 
    });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Failed to send contract" }, 
      { status: 500 }
    );
  }
}