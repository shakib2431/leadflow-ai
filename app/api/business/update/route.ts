import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
   const {
  id,
  name,
  website,
  industry,
  timezone,
  currency,
} = await req.json();
console.log("Updating Business:", id);
    const { data, error } =
      await supabaseAdmin
        .from("businesses")
        .update({
          name,
          website,
          industry,
          timezone,
          currency,
        })
.eq("id", id)
        .select()
        .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: data,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}