import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch(
    "http://localhost:3000/api/send-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "khanshakib0000@gmail.com",
        subject: "LeadFlow Test Email",
        body: `
          <h1>LeadFlow AI</h1>
          <p>Email sync is working 🚀</p>
        `,
      }),
    }
  );

  const result = await response.json();

  return NextResponse.json(result);
}