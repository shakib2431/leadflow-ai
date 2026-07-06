import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateLetterPdf } from "@/lib/hrms/letters";
import { buildPublicPreOnboardingLink } from "@/lib/hrms/preOnboardingIntake";

async function loadOffer(offerId: string) {
  const { data: offer, error } = await supabaseAdmin
    .from("candidate_offers")
    .select("id, candidate_id, position, salary, joining_date, validity_until, status, offer_content, created_at")
    .eq("id", offerId)
    .maybeSingle();

  if (error) throw error;
  return offer || null;
}

async function loadCandidate(candidateId: string) {
  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select("id, email")
    .eq("id", candidateId)
    .maybeSingle();

  if (error) throw error;
  return candidate || null;
}

async function loadEmployeeByEmail(email: string) {
  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select("id, first_name, last_name, email, onboarding_checklist, status, employment_status")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return employee || null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ offerId: string }> }) {
  try {
    const url = new URL(req.url);
    const metaOnly = url.searchParams.get("meta") === "true";
    const { offerId } = await context.params;
    const offer = await loadOffer(offerId);

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (metaOnly) {
      return NextResponse.json({
        data: {
          id: offer.id,
          position: offer.position,
          salary: offer.salary,
          joining_date: offer.joining_date,
          validity_until: offer.validity_until,
          status: offer.status,
          offer_content: offer.offer_content,
        },
      });
    }

    const body = offer.offer_content || `Offer Letter\n\nPosition: ${offer.position}\nJoining Date: ${offer.joining_date}\nAnnual Salary: ₹${offer.salary}\nValidity Until: ${offer.validity_until ? new Date(offer.validity_until).toLocaleDateString() : "TBD"}`;
    const pdfBuffer = generateLetterPdf({
      title: "OFFER LETTER",
      subject: `Offer Letter - ${offer.position}`,
      body,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="offer-${offerId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load offer" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ offerId: string }> }) {
  try {
    const { offerId } = await context.params;
    const body = await req.json();
    const action = String(body.action || "").trim();

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const offer = await loadOffer(offerId);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const candidate = await loadCandidate(offer.candidate_id);
    if (!candidate?.email) {
      return NextResponse.json({ error: "Candidate email not found" }, { status: 404 });
    }

    const employee = await loadEmployeeByEmail(candidate.email);
    if (!employee) {
      return NextResponse.json({ error: "Linked employee record not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const newOfferStatus = action === "accept" ? "signed" : "declined";

    const updatedChecklist = {
      ...(employee.onboarding_checklist || {}),
      offer: {
        ...(employee.onboarding_checklist?.offer || {}),
        status: newOfferStatus,
        sent_at: employee.onboarding_checklist?.offer?.sent_at || now,
        signed_at: action === "accept" ? now : employee.onboarding_checklist?.offer?.signed_at,
        declined_at: action === "decline" ? now : employee.onboarding_checklist?.offer?.declined_at,
      },
      onboarding_handoff: {
        ...(employee.onboarding_checklist?.onboarding_handoff || {}),
        stage: action === "accept" ? "pre_onboarding" : "offer_declined",
        marked_at: now,
      },
      pre_onboarding: action === "accept"
        ? {
            ...(employee.onboarding_checklist?.pre_onboarding || {}),
            link_sent: true,
            link_sent_at: now,
          }
        : employee.onboarding_checklist?.pre_onboarding || null,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("employees")
      .update({
        onboarding_checklist: updatedChecklist,
        ...(action === "accept" ? { status: "onboarding", employment_status: "onboarding" } : {}),
      })
      .eq("id", employee.id);

    if (updateErr) throw updateErr;

    await supabaseAdmin
      .from("candidate_offers")
      .update({ status: action === "accept" ? "accepted" : "declined", updated_at: now })
      .eq("id", offer.id);

    await supabaseAdmin
      .from("candidates")
      .update({ notes: action === "accept" ? "pre_onboarding" : "offer_declined" })
      .eq("id", offer.candidate_id);

    if (action === "accept") {
      const preOnboardingLink = buildPublicPreOnboardingLink(
        employee.id,
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      );
      await supabaseAdmin.from("employees").update({ updated_at: now }).eq("id", employee.id);
      return NextResponse.json({ success: true, status: "signed", employeeId: employee.id, preOnboardingLink });
    }

    return NextResponse.json({ success: true, status: "declined" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process offer" }, { status: 500 });
  }
}