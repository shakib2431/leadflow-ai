import { NextResponse } from "next/server";

export async function GET() {

  const response = await fetch(
    "http://localhost:3000/api/analyze-lead",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId:
          "cbe171fd-a4e8-4c4b-accc-fe2a1663b5b2",
      }),
    }
  );

  const data =
    await response.json();

  return NextResponse.json(data);
}