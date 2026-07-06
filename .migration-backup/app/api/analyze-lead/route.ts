import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  req: NextRequest
) {
  try {

    const { leadId } =
      await req.json();

    if (!leadId) {
      return NextResponse.json(
        {
          error: "leadId required",
        },
        {
          status: 400,
        }
      );
    }

    const { data: lead } =
      await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();
        const { data: messages } =
  await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", {
      ascending: true,
    });
    const transcript =
  messages
    ?.map(
      (m) =>
        `${m.sender}: ${m.message}`
    )
    .join("\n");

    if (!lead) {
      return NextResponse.json(
        {
          error: "Lead not found",
        },
        {
          status: 404,
        }
      );
    }

    const prompt = `
You are an elite CRM AI.

Analyze this lead conversation.

Conversation:

${transcript}

Return ONLY valid JSON:

{
  "score": 0-100,
  "summary": "",
  "next_action": "",
  "reason": ""
}

Rules:

- High buying intent = score above 70
- Medium intent = 40-70
- Low intent = below 40

No markdown.
No explanation.
Only JSON.
`;

const response = await fetch(
  "http://localhost:3000/api/generate-message",
  {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  }
);

const result =
  await response.json();

if (!result.message) {

  console.error(
    "Gemini returned empty response",
    result
  );

  return NextResponse.json(
    {
      error:
        "AI service unavailable",
    },
    {
      status: 500,
    }
  );
}

const ai =
  JSON.parse(result.message);
  let status = "unresponsive";

if (ai.score >= 80) {
  status = "hot";
}
else if (ai.score >= 50) {
  status = "warm";
}
else {
  status = "unresponsive";
}

// STEP 6 - Save AI Analysis

await supabaseAdmin
  .from("leads")
  .update({
    ai_score: ai.score,
    ai_summary: ai.summary,
    ai_next_action: ai.next_action,
    ai_score_reason: ai.reason,
    status,
  })
  .eq("id", leadId);

// STEP 7 - Return Result

return NextResponse.json({
  success: true,
  lead: lead.full_name,
  ai,
});
  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Analyze lead failed",
      },
      {
        status: 500,
      }
    );

  }
}