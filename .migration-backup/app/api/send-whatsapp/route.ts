import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest
) {
  try {

    const {
      phone,
      message,
    } = await req.json();

    console.log("Sending WhatsApp...");
    console.log("Phone:", phone);
    console.log("Message:", message);

  console.log(
  "TOKEN EXISTS:",
  !!process.env.WHATSAPP_TOKEN
);

console.log(
  "PHONE NUMBER ID:",
  process.env.WHATSAPP_PHONE_NUMBER_ID
);
console.log("ALL ENV CHECK");
console.log(
  "TOKEN START:",
  process.env.WHATSAPP_TOKEN?.substring(0, 25)
);

    const response =
      await fetch(
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            messaging_product:
              "whatsapp",
            recipient_type:
              "individual",
            to: phone,
            type: "text",
            text: {
              body: message,
            },
          }),
        }
      );

    const data =
      await response.json();

    console.log(
      "Meta Response:",
      JSON.stringify(data, null, 2)
    );

    return NextResponse.json(data);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to send WhatsApp",
      },
      {
        status: 500,
      }
    );

  }
}