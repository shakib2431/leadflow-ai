

import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, ChevronRight, Clock, Copy, FileText,
  Mail, MailCheck, PenLine, Send, UserCheck, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";

type OfferStatus = "pending" | "offer_sent" | "awaiting_signature" | "signed" | "declined" | "revision_requested";

type EmployeeRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  designation?: string;
  onboarding_checklist?: {
    offer?: {
      status?: OfferStatus;
      sent_at?: string;
      signed_at?: string;
    };
    pre_onboarding?: {
      link_sent?: boolean;
      link_sent_at?: string;
    };
  };
};

const STATUS_CONFIG: Record<OfferStatus, { label: string; cls: string; badge: string }> = {
  pending:             { label: "Pending",           cls: "border-slate-200 bg-slate-50",   badge: "bg-slate-100 text-slate-600 border-slate-200" },
  offer_sent:          { label: "Offer Sent",         cls: "border-blue-200 bg-blue-50",    badge: "bg-blue-100 text-blue-700 border-blue-200" },
  awaiting_signature:  { label: "Awaiting Signature", cls: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  signed:              { label: "Signed ✓",           cls: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  declined:            { label: "Declined",           cls: "border-rose-200 bg-rose-50",    badge: "bg-rose-100 text-rose-700 border-rose-200" },
  revision_requested:  { label: "Revision Requested", cls: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-700 border-orange-200" },
};

export default function OfferManagementPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const focusEmail = String(searchParams.get("email") || "").trim().toLowerCase();
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | OfferStatus>("all");
  const [confirmSign, setConfirmSign] = useState<EmployeeRow | null>(null);

  function apiHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      headers["x-dev-role"] = "HR Admin";
    }
    return headers;
  }

  function isMissingNotesColumnError(err: unknown) {
    const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
    return msg.includes("could not find") && msg.includes("notes") && msg.includes("candidates");
  }

  async function fetchEmployeesByStatus(status?: string) {
    const qs = status
      ? `?page=1&pageSize=100&status=${encodeURIComponent(status)}`
      : `?page=1&pageSize=100`;
    const res = await fetch(`/api/hrms/v2/employees${qs}`, { headers: apiHeaders() });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to load employees");
    return (body.data || []) as EmployeeRow[];
  }

  async function loadEmployees() {
    setLoading(true);
    setMessage(null);
    try {
      const allEmployees = await fetchEmployeesByStatus();
      const onboardingEmployees = await fetchEmployeesByStatus("onboarding").catch(() => [] as EmployeeRow[]);
      const candidatesRes = await supabase.from("candidates").select("email,stage");

      const candidateEmailSet = new Set(
        ((candidatesRes.data || []) as Array<{ email?: string | null; stage?: string | null }>)
          .filter((c) => {
            const stage = String(c.stage || "");
            return stage === "Offered" || stage === "Hired";
          })
          .map((c) => String(c.email || "").trim().toLowerCase())
          .filter(Boolean)
      );

      const mergedById = new Map<string, EmployeeRow>();
      for (const emp of onboardingEmployees) {
        mergedById.set(emp.id, emp);
      }
      for (const emp of allEmployees) {
        const email = String(emp.email || "").trim().toLowerCase();
        const hasOfferWorkflow = Boolean(emp.onboarding_checklist?.offer);
        if (candidateEmailSet.has(email) || hasOfferWorkflow) {
          mergedById.set(emp.id, emp);
        }
      }

      setEmployees(Array.from(mergedById.values()));
    } catch (err: any) {
      setEmployees([]);
      setMessage({ type: "error", text: err.message || "Failed to load offer queue" });
    }
    setLoading(false);
  }

  useEffect(() => { loadEmployees(); }, []);

  function getOfferStatus(emp: EmployeeRow): OfferStatus {
    return (emp.onboarding_checklist?.offer?.status as OfferStatus) || "pending";
  }

  async function syncCandidateStatus(email: string | undefined, status: string) {
    if (!email) return;
    const stageByStatus: Record<string, "Applied" | "Interviewing" | "Offered" | "Hired"> = {
      employee_created: "Offered",
      offer_sent: "Offered",
      awaiting_signature: "Offered",
      revision_requested: "Offered",
      offer_declined: "Offered",
      offer_signed: "Hired",
      pre_onboarding: "Hired",
    };
    const stage = stageByStatus[status] || "Offered";
    const full = await supabase.from("candidates").update({ notes: status, stage }).eq("email", email);
    if (!full.error) return;

    if (!isMissingNotesColumnError(full.error)) {
      throw full.error;
    }

    const fallback = await supabase.from("candidates").update({ stage }).eq("email", email);
    if (fallback.error) {
      throw fallback.error;
    }
  }

  async function markDeclined(employee: EmployeeRow) {
    setWorkingId(employee.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          onboarding_checklist: {
            ...employee.onboarding_checklist,
            offer: {
              ...(employee.onboarding_checklist?.offer || {}),
              status: "declined",
              declined_at: new Date().toISOString(),
            },
          },
        }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Failed to withdraw offer");
      }

      setEmployees((prev) => prev.map((e) =>
        e.id === employee.id
          ? {
              ...e,
              onboarding_checklist: {
                ...e.onboarding_checklist,
                offer: {
                  ...e.onboarding_checklist?.offer,
                  status: "declined",
                  declined_at: new Date().toISOString(),
                },
              },
            }
          : e
      ));

      await syncCandidateStatus(employee.email, "offer_declined");
      setMessage({ type: "success", text: `Offer withdrawn for ${employee.first_name || "employee"}.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to withdraw offer" });
    } finally {
      setWorkingId(null);
    }
  }

  async function sendOfferLetter(employee: EmployeeRow) {
    if (!employee.email) {
      setMessage({ type: "error", text: "Employee email required to send offer." });
      return;
    }
    setWorkingId(employee.id);
    setMessage(null);
    try {
      const contractRes = await fetch("/api/hr/send-contract", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          employeeId: employee.id,
          email: employee.email,
          name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
          salary: null,
          role: employee.designation || "Unassigned",
        }),
      });
      if (!contractRes.ok) { const b = await contractRes.json(); throw new Error(b.error || "Failed to send contract"); }

      await fetch(`/api/hrms/v2/employees/${employee.id}/letters`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ template_key: "offer_letter" }),
      });

      const persistenceRes = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          onboarding_checklist: {
            ...employee.onboarding_checklist,
            offer: {
              ...(employee.onboarding_checklist?.offer || {}),
              status: "offer_sent",
              sent_at: new Date().toISOString(),
            },
          },
        }),
      });
      if (!persistenceRes.ok) {
        const body = await persistenceRes.json();
        throw new Error(body.error || "Failed to persist offer status");
      }

      setEmployees((prev) => prev.map((e) =>
        e.id === employee.id
          ? { ...e, onboarding_checklist: { ...e.onboarding_checklist, offer: { status: "offer_sent", sent_at: new Date().toISOString() } } }
          : e
      ));
      await syncCandidateStatus(employee.email, "offer_sent");
      setMessage({ type: "success", text: `Offer letter sent to ${employee.email}. Document generated and saved to employee profile.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to send offer letter" });
    } finally {
      setWorkingId(null);
    }
  }

  async function markAwaiting(employee: EmployeeRow) {
    setWorkingId(employee.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          onboarding_checklist: {
            ...employee.onboarding_checklist,
            offer: { status: "awaiting_signature", sent_at: employee.onboarding_checklist?.offer?.sent_at },
          },
        }),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || "Failed"); }
      setEmployees((prev) => prev.map((e) =>
        e.id === employee.id
          ? { ...e, onboarding_checklist: { ...e.onboarding_checklist, offer: { ...e.onboarding_checklist?.offer, status: "awaiting_signature" } } }
          : e
      ));
      await syncCandidateStatus(employee.email, "awaiting_signature");
      setMessage({ type: "success", text: "Marked as Awaiting Employee Signature." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setWorkingId(null);
    }
  }

  async function markSignedAndSendPreOnboarding(employee: EmployeeRow) {
    setWorkingId(employee.id);
    setMessage(null);
    setConfirmSign(null);
    try {
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          onboarding_checklist: {
            ...employee.onboarding_checklist,
            offer: { ...employee.onboarding_checklist?.offer, status: "signed", signed_at: new Date().toISOString() },
          },
        }),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error || "Failed to mark signed"); }

      try {
        const linkRes = await fetch('/api/hrms/v2/pre-onboarding/intake-link', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ employee_id: employee.id }),
        });
        const linkBody = await linkRes.json();
        if (!linkRes.ok) throw new Error(linkBody.error || 'Failed to create intake link');
        await navigator.clipboard.writeText(linkBody?.data?.intake_link || '');
      } catch {
        // ignore clipboard failure; onboarding status update remains successful
      }

      await syncCandidateStatus(employee.email, "offer_signed");

      setEmployees((prev) => prev.map((e) =>
        e.id === employee.id
          ? {
              ...e,
              onboarding_checklist: {
                ...e.onboarding_checklist,
                offer: { ...e.onboarding_checklist?.offer, status: "signed", signed_at: new Date().toISOString() },
                pre_onboarding: { link_sent: true, link_sent_at: new Date().toISOString() },
              },
            }
          : e
      ));
      setMessage({ type: "success", text: `Offer marked as signed. Pre-onboarding intake link copied to clipboard — share it with ${employee.first_name || "the employee"}.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setWorkingId(null);
    }
  }

  async function copyAcceptanceLink(employee: EmployeeRow) {
    const base = `${window.location.origin}/hrms/v2/self-service/offer-acceptance`;
    const name = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    const params = new URLSearchParams({ employee: employee.id });
    if (name) params.set("name", name);
    try {
      await navigator.clipboard.writeText(`${base}?${params.toString()}`);
      setMessage({ type: "success", text: `Acceptance link copied! Share it with ${name || "the employee"} so they can confirm via email or WhatsApp.` });
    } catch {
      setMessage({ type: "error", text: "Copy failed." });
    }
  }

  async function copyPreOnboardingLink(employee: EmployeeRow) {
    try {
      const linkRes = await fetch('/api/hrms/v2/pre-onboarding/intake-link', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ employee_id: employee.id }),
      });
      const linkBody = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkBody.error || 'Failed to create intake link');
      await navigator.clipboard.writeText(linkBody?.data?.intake_link || '');
      setMessage({ type: "success", text: "Pre-onboarding intake link copied to clipboard." });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Copy failed. Please try again." });
    }
  }

  const filtered = employees.filter((e) => activeTab === "all" || getOfferStatus(e) === activeTab);
  const prioritized = focusEmail
    ? [
        ...filtered.filter((e) => String(e.email || "").trim().toLowerCase() === focusEmail),
        ...filtered.filter((e) => String(e.email || "").trim().toLowerCase() !== focusEmail),
      ]
    : filtered;
  const counts = {
    all: employees.length,
    pending: employees.filter((e) => getOfferStatus(e) === "pending").length,
    offer_sent: employees.filter((e) => getOfferStatus(e) === "offer_sent").length,
    awaiting_signature: employees.filter((e) => getOfferStatus(e) === "awaiting_signature").length,
    signed: employees.filter((e) => getOfferStatus(e) === "signed").length,
    declined: employees.filter((e) => getOfferStatus(e) === "declined").length,
    revision_requested: employees.filter((e) => getOfferStatus(e) === "revision_requested").length,
  };

  const TABS: { id: "all" | OfferStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "offer_sent", label: "Offer Sent" },
    { id: "awaiting_signature", label: "Awaiting Signature" },
    { id: "revision_requested", label: "Revision Requested" },
    { id: "signed", label: "Signed" },
  ];

  return (
    <main className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Offer Management"
          subtitle="Send offer letters, track signatures, and route signed employees to pre-onboarding."
        />

        {/* Lifecycle strip */}
        <section className="hrms-dashboard-shell">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Offer Lifecycle</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { label: "Offered", color: "bg-slate-100 text-slate-700 border-slate-200" },
              { label: "Offer Letter Sent", color: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Awaiting Signature", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Signed by Employee", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Pre-Onboarding Sent", color: "bg-violet-50 text-violet-700 border-violet-200" },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${step.color}`}>{step.label}</span>
                {idx < arr.length - 1 && <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-3 md:grid-cols-4">
          <article className="hrms-kpi-card hrms-kpi-1">
            <div className="hrms-kpi-icon"><Users size={16} /></div>
            <p className="hrms-section-label">Total in Queue</p>
            <p className="hrms-kpi-value">{employees.length}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-2">
            <div className="hrms-kpi-icon"><Send size={16} /></div>
            <p className="hrms-section-label">Offers Sent</p>
            <p className="hrms-kpi-value">{counts.offer_sent + counts.awaiting_signature}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-5">
            <div className="hrms-kpi-icon"><PenLine size={16} /></div>
            <p className="hrms-section-label">Signed</p>
            <p className="hrms-kpi-value">{counts.signed}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-4">
            <div className="hrms-kpi-icon"><Clock size={16} /></div>
            <p className="hrms-section-label">Pending Offer</p>
            <p className="hrms-kpi-value">{counts.pending}</p>
          </article>
        </section>

        {message && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <div className="flex items-start justify-between gap-3">
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Stage Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeTab === t.id ? "border-indigo-300 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}
            >
              {t.label} <span className="ml-1 opacity-70">({counts[t.id]})</span>
            </button>
          ))}
        </div>

        {/* Offer Queue */}
        <section className="hrms-dashboard-shell">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Offer Queue <span className="ml-2 text-sm font-normal text-slate-500">— {prioritized.length} employee{prioritized.length !== 1 ? "s" : ""}</span></h2>
            <Link to="/team/pre-onboarding" className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition">
              Pre-Onboarding Queue <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : prioritized.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
              <FileText size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600">No employees in this stage</p>
              <p className="mt-1 text-sm text-slate-500">Hire candidates from Recruitment to populate this queue.</p>
              <Link to="/team/recruitment" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                Open Recruitment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {focusEmail && !prioritized.some((e) => String(e.email || "").trim().toLowerCase() === focusEmail) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                  Target employee not found in current offer queue scope for {focusEmail}. Regenerate Offer Workspace from Recruitment.
                </div>
              )}

              {prioritized.map((employee) => {
                const offerStatus = getOfferStatus(employee);
                const sc = STATUS_CONFIG[offerStatus];
                const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unnamed";
                const isBusy = workingId === employee.id;
                const preSent = employee.onboarding_checklist?.pre_onboarding?.link_sent;

                return (
                  <article key={employee.id} className={`rounded-xl border p-4 transition hover:shadow-md ${sc.cls}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700">
                          {fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{fullName}</h3>
                          <p className="text-xs text-slate-600">{employee.email || "No email"}{employee.designation ? ` • ${employee.designation}` : ""}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.badge}`}>{sc.label}</span>
                            {preSent && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Pre-Onboarding Sent</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {offerStatus === "pending" && (
                          <>
                            <a
                              href={`/api/hrms/v2/offer-acceptance?employeeId=${encodeURIComponent(employee.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                            >
                              <FileText size={12} /> Preview Offer
                            </a>
                            <button onClick={() => sendOfferLetter(employee)} disabled={isBusy} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                              {isBusy ? "Sending..." : <><Send size={12} /> Send Offer</>}
                            </button>
                          </>
                        )}
                        {offerStatus === "offer_sent" && (
                          <button onClick={() => markAwaiting(employee)} disabled={isBusy} className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition">
                            {isBusy ? "Updating..." : <><Clock size={12} /> Mark Awaiting Signature</>}
                          </button>
                        )}
                        {(offerStatus === "offer_sent" || offerStatus === "awaiting_signature") && (
                          <>
                            <a
                              href={`/api/hrms/v2/offer-acceptance?employeeId=${encodeURIComponent(employee.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                            >
                              <FileText size={12} /> View Offer / PDF
                            </a>
                            <button
                              onClick={() => copyAcceptanceLink(employee)}
                              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                              title="Share this link with the employee so they can accept the offer themselves"
                            >
                              <Copy size={12} /> Copy Acceptance Link
                            </button>
                            <button onClick={() => markDeclined(employee)} disabled={isBusy} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition">
                              Withdraw Offer
                            </button>
                            <button onClick={() => setConfirmSign(employee)} disabled={isBusy} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                              <PenLine size={12} /> Mark as Signed
                            </button>
                          </>
                        )}
                        {offerStatus === "signed" && (
                          <button onClick={() => copyPreOnboardingLink(employee)} className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 transition">
                            <Copy size={12} /> {preSent ? "Copy Link Again" : "Send Pre-Onboarding Link"}
                          </button>
                        )}
                        {(offerStatus === "offer_sent" || offerStatus === "awaiting_signature" || offerStatus === "revision_requested") && (
                          <button onClick={() => sendOfferLetter(employee)} disabled={isBusy} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                            <MailCheck size={12} /> Resend Offer
                          </button>
                        )}
                        <Link to={`/hrms/v2/employees/${employee.id}`} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 transition">
                          <UserCheck size={12} /> Profile
                        </Link>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                      {[
                        { label: "Offer Sent", active: offerStatus !== "pending" },
                        { label: "Awaiting Signature", active: ["awaiting_signature","signed"].includes(offerStatus) },
                        { label: "Signed", active: offerStatus === "signed" },
                        { label: "Pre-Onboarding", active: !!preSent },
                      ].map((step, idx, arr) => (
                        <span key={step.label} className="flex items-center gap-1">
                          <span className={`flex items-center gap-1 font-${step.active ? "semibold" : "normal"} ${step.active ? "text-emerald-600" : ""}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${step.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                            {step.label}
                          </span>
                          {idx < arr.length - 1 && <ArrowRight size={9} className="text-slate-300 ml-1" />}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Confirm Sign Modal */}
        {confirmSign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><PenLine size={22} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Confirm Offer Signed</h2>
                  <p className="text-sm text-slate-500">Marks offer as signed and sends pre-onboarding form link.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
                <p className="font-semibold text-slate-900">{`${confirmSign.first_name || ""} ${confirmSign.last_name || ""}`.trim()}</p>
                <p className="text-sm text-slate-500">{confirmSign.email}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmSign(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={() => markSignedAndSendPreOnboarding(confirmSign)} disabled={workingId === confirmSign.id} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                  {workingId === confirmSign.id ? "Processing..." : "Confirm & Send Pre-Onboarding"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/team/recruitment" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
            <Mail size={14} /> Recruitment Pipeline
          </Link>
          <Link to="/team/pre-onboarding" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
            <CheckCircle2 size={14} /> Pre-Onboarding Queue
          </Link>
          <Link to="/hrms/v2/templates" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
            <FileText size={14} /> Manage Templates
          </Link>
        </div>
      </div>
    </main>
  );
}
