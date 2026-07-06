import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendNotificationEmail } from "@/lib/hrms/notification-email-service";
import { buildPublicPreOnboardingLink } from "@/lib/hrms/preOnboardingIntake";
import { buildLetterTokens, formatCurrency, formatDate, generateLetterPdf, renderTemplate, sanitizeFileName } from "@/lib/hrms/letters";

async function getLatestOfferLetter(employeeId: string) {
  const { data: letter, error } = await supabaseAdmin
    .from("employee_letters")
    .select("id,file_name,storage_path,created_at,template_key,letter_type,rendered_subject,rendered_body")
    .eq("employee_id", employeeId)
    .eq("template_key", "offer_letter")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return letter || null;
}

async function ensureOfferLetterRecord(employeeId: string) {
  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (!employee) return null;

  const [departmentRes, designationRes] = await Promise.all([
    employee.department_id
      ? supabaseAdmin.from("departments").select("name").eq("id", employee.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    employee.designation_id
      ? supabaseAdmin.from("designations").select("name").eq("id", employee.designation_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  if (departmentRes.error) throw departmentRes.error;
  if (designationRes.error) throw designationRes.error;

  const tokens = buildLetterTokens({
    employee,
    departmentName: departmentRes.data?.name || employee.department || "Unassigned",
    designationName: designationRes.data?.name || employee.designation || employee.current_title || "Unassigned",
  });

  const employeeName = tokens.employee_name || employee.email || employeeId;
  const designationName = tokens.designation || "Unassigned";
  const departmentName = tokens.department || "Unassigned";
  const joiningDate = tokens.joining_date || "TBD";
  const salaryText = formatCurrency(employee.salary);

  const { data: template, error: templateError } = await supabaseAdmin
    .from("hr_letter_templates")
    .select("*")
    .eq("template_key", "offer_letter")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (templateError) throw templateError;
  const renderedSubject = template
    ? renderTemplate(template.subject_template, tokens)
    : `Offer Letter | ${employeeName} | ${designationName}`;
  const renderedBody = template
    ? renderTemplate(template.body_template, tokens)
    : [
        `Dear ${employeeName},`,
        "",
        `We are pleased to offer you the position of ${designationName} at LeadFlow AI in the ${departmentName} team.`,
        `Your expected date of joining is ${joiningDate} and your annual compensation will be ${salaryText}.`,
        "",
        "Please review this offer and connect with HR for acceptance formalities.",
        "",
        "Regards,",
        "HR Team",
        "LeadFlow AI",
      ].join("\n");
  const pdfBuffer = generateLetterPdf({
    title: "OFFER LETTER",
    subject: renderedSubject,
    body: renderedBody,
  });

  const rawFileName = `offer-${tokens.employee_name || employeeId}-${formatDate(new Date().toISOString())}.pdf`;
  const fileName = sanitizeFileName(rawFileName);
  const storagePath = `${employeeId}/letters/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("hr-docs")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) throw uploadError;

  const { data: letterRow, error: letterError } = await supabaseAdmin
    .from("employee_letters")
    .insert([{
      employee_id: employeeId,
      template_id: template?.id || null,
      template_key: template?.template_key || "offer_letter",
      template_version: template?.version || null,
      letter_type: template?.letter_type || "offer",
      file_name: fileName,
      storage_path: storagePath,
      rendered_subject: renderedSubject,
      rendered_body: renderedBody,
      merge_payload: tokens,
      created_by: "system",
    }])
    .select("id,file_name,storage_path,rendered_subject,rendered_body")
    .single();

  if (letterError || !letterRow) {
    await supabaseAdmin.storage.from("hr-docs").remove([storagePath]);
    throw letterError || new Error("Failed to save generated offer letter");
  }

  await supabaseAdmin.from("employee_documents").insert([{ 
    employee_id: employeeId,
    file_name: fileName,
    file_path: `/api/hrms/v2/employees/${employeeId}/letters/${letterRow.id}/download`,
    storage_path: storagePath,
  }]);

  return letterRow;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employeeId") || url.searchParams.get("employee");
    const preview = url.searchParams.get("preview") === "true" || url.searchParams.get("preview") === "1";

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const { data: employee, error: fetchErr } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, email")
      .eq("id", employeeId)
      .single();

    if (fetchErr || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const letter = await getLatestOfferLetter(employeeId);
    const resolvedLetter = letter || await ensureOfferLetterRecord(employeeId);
    if (!resolvedLetter) {
      return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });
    }

    if (preview) {
      return NextResponse.json({
        data: {
          subject: resolvedLetter.rendered_subject || "Offer Letter",
          body: resolvedLetter.rendered_body || "Your offer letter is available for download.",
        },
      }, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const { data, error } = await supabaseAdmin.storage.from("hr-docs").download(resolvedLetter.storage_path);
    if (error || !data) {
      return NextResponse.json({ error: "Offer letter file not found" }, { status: 404 });
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${resolvedLetter.file_name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load offer letter" }, { status: 500 });
  }
}

// Public endpoint — no auth required. Employee uses a signed URL with employeeId + token.
export async function POST(req: NextRequest) {
  try {
    const { employeeId, action, comments } = await req.json();

    if (!employeeId || !["accept", "decline", "request_changes"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: employee, error: fetchErr } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, email, onboarding_checklist")
      .eq("id", employeeId)
      .single();

    if (fetchErr || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const checklist = employee.onboarding_checklist || {};
    const currentOfferStatus = checklist.offer?.status;

    // Prevent re-processing already signed/declined offers
    if (currentOfferStatus === "signed" || currentOfferStatus === "declined") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        status: currentOfferStatus,
        message: `Offer was already ${currentOfferStatus}.`,
      });
    }

    const now = new Date().toISOString();
    const newOfferStatus = action === "accept"
      ? "signed"
      : action === "request_changes"
      ? "revision_requested"
      : "declined";
    const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
    const preOnboardingLink = buildPublicPreOnboardingLink(
      employeeId,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );

    const updatedChecklist = {
      ...checklist,
      offer: {
        ...(checklist.offer || {}),
        status: newOfferStatus,
        sent_at: checklist.offer?.sent_at || now,
        signed_at: action === "accept" ? now : checklist.offer?.signed_at,
        revision_requested_at: action === "request_changes" ? now : checklist.offer?.revision_requested_at,
        revision_comments: action === "request_changes" ? String(comments || "").trim() : checklist.offer?.revision_comments,
        declined_at: action === "decline" ? now : checklist.offer?.declined_at,
      },
      onboarding_handoff: {
        ...(checklist.onboarding_handoff || {}),
        stage: action === "accept" ? "pre_onboarding" : action === "request_changes" ? "offer_revision_requested" : "offer_declined",
        marked_at: now,
      },
      pre_onboarding: action === "accept"
        ? {
            ...(checklist.pre_onboarding || {}),
            link_sent: true,
            link_sent_at: now,
          }
        : checklist.pre_onboarding || null,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("employees")
      .update({
        onboarding_checklist: updatedChecklist,
        ...(action === "accept" ? { status: "onboarding", employment_status: "onboarding" } : {}),
      })
      .eq("id", employeeId);

    if (updateErr) throw updateErr;

    // Also update candidate notes by matching email so the pipeline syncs
    if (employee.email) {
      const full = await supabaseAdmin
        .from("candidates")
        .update({
          notes: newOfferStatus === "signed" ? "pre_onboarding" : newOfferStatus === "revision_requested" ? "offer_revision_requested" : "offer_declined",
          stage: newOfferStatus === "signed" ? "Hired" : "Offered",
        })
        .eq("email", employee.email);

      if (full.error) {
        const msg = String(full.error.message || "").toLowerCase();
        const missingNotes = msg.includes("could not find") && msg.includes("notes") && msg.includes("candidates");
        if (!missingNotes) {
          throw full.error;
        }

        const fallback = await supabaseAdmin
          .from("candidates")
          .update({
            stage: newOfferStatus === "signed" ? "Hired" : "Offered",
          })
          .eq("email", employee.email);
        if (fallback.error) {
          throw fallback.error;
        }
      }
    }

    if (action === "accept" && employee.email) {
      await sendNotificationEmail({
        event: "pre_onboarding_ready",
        recipient_email: employee.email,
        recipient_name: employeeName || employee.first_name || "there",
        subject: "Pre-Onboarding Form Ready",
        data: {
          employee_name: employeeName || employee.first_name || "there",
          pre_onboarding_link: preOnboardingLink,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: newOfferStatus,
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      message: action === "accept"
        ? "Offer accepted. Pre-onboarding has been sent to the employee."
        : action === "request_changes"
        ? "Changes requested. HR can now revise and resend the offer."
        : "Offer declined. We appreciate your time.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process" }, { status: 500 });
  }
}
