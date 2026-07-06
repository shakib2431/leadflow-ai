import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize the Resend client with your API key
const resend = new Resend(process.env.RESEND_API_KEY);
const isDev = process.env.NODE_ENV === 'development';

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming data from your frontend
    const data = await request.json();
    const email = String(data.email || '').trim();
    const employeeName = String(data.name || '').trim();
    const role = String(data.role || '').trim() || 'Team Member';
    const parsedSalary = Number(data.salary);
    const salaryDisplay = Number.isFinite(parsedSalary) && parsedSalary > 0
      ? `₹${parsedSalary.toLocaleString()}`
      : 'Compensation details will be shared separately';

    if (!email) {
      return NextResponse.json({ error: 'Employee email is required' }, { status: 422 });
    }

    if (!process.env.RESEND_API_KEY) {
      if (isDev) {
        return NextResponse.json({
          success: true,
          message: `Contract marked as sent to ${email} (dev mode mock).`,
          mocked: true,
        });
      }

      return NextResponse.json({ error: 'Email provider is not configured' }, { status: 500 });
    }
    
    console.log(`Attempting to send real email to: ${email}`);

    // 2. Call the Resend API to actually send the email
    const { data: emailData, error } = await resend.emails.send({
      // "onboarding@resend.dev" is a special testing address provided by Resend
      from: 'LeadFlow HR <onboarding@resend.dev>', 
      to: [email],
      subject: `Action Required: Employment Contract for ${employeeName || email}`,
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
          <h2 style="color: #1a1a1a;">Welcome to the team, ${employeeName || email}!</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            We are thrilled to have you join us as our new <strong>${role}</strong>. 
            Before your official start date, we need you to review and sign your employment agreement.
          </p>
          <div style="background-color: #f9f9fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #4a4a4a;"><strong>Position:</strong> ${role}</p>
            <p style="margin: 5px 0 0 0; color: #4a4a4a;"><strong>Base Salary:</strong> ${salaryDisplay}</p>
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

      if (isDev) {
        return NextResponse.json({
          success: true,
          message: `Contract marked as sent to ${email} (dev mode fallback).`,
          mocked: true,
          warning: error.message,
        });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. Success log and response
    console.log("Email sent successfully! ID:", emailData?.id);

    return NextResponse.json({ 
      success: true, 
      message: `Contract successfully dispatched to ${email}` 
    });

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Failed to send contract" }, 
      { status: 500 }
    );
  }
}