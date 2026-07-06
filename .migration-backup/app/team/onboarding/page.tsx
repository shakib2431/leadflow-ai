"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  ClipboardList, Copy, Eye, FileText, RefreshCw, Users, UserCheck,
  X, Zap,
} from "lucide-react";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";

type EmployeeRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  onboarding_checklist?: {
    tasks?: Array<{
      id: string;
      label?: string;
      title?: string;
      done?: boolean;
      status?: string;
    }>;
    pre_onboarding?: {
      status?: string;
      submitted_at?: string;
      reviewed_at?: string;
      form?: Record<string, string>;
    };
    onboarding_handoff?: {
      stage?: string;
    };
  };
};

function fmt(input?: string) {
  if (!input) return "—";
  const d = new Date(input);
  return isNaN(d.getTime()) ? input : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const CHECKLIST_METADATA: Record<string, { label: string; help: string }> = {
  documents_collected: {
    label: "Verify submitted documents",
    help: "Confirm required proofs are present and readable: ID, PAN, and bank document.",
  },
  salary_structure_set: {
    label: "Confirm payroll setup",
    help: "Ensure salary structure and monthly payroll fields are correctly configured.",
  },
  system_access_granted: {
    label: "Issue employee credentials",
    help: "Create/verify login credentials and confirm the employee can access HRMS.",
  },
  welcome_email_sent: {
    label: "Send joining communication",
    help: "Send the official joining/welcome communication with first-day instructions.",
  },
  pre_onboarding_reviewed: {
    label: "Approve pre-onboarding form",
    help: "Review all submitted details and mark HR review complete in pre-onboarding queue.",
  },
  contract: {
    label: "Confirm offer/contract signed",
    help: "Ensure signed offer/contract record is present before activation.",
  },
  id: {
    label: "Verify ID and statutory documents",
    help: "Confirm uploaded ID, PAN, and related statutory documents are valid.",
  },
  handbook: {
    label: "Complete joining orientation acknowledgement",
    help: "Ensure employee has reviewed required onboarding policies/handbook.",
  },
};

const DEFAULT_CHECKLIST = [
  { id: "documents_collected", label: CHECKLIST_METADATA.documents_collected.label },
  { id: "salary_structure_set", label: CHECKLIST_METADATA.salary_structure_set.label },
  { id: "system_access_granted", label: CHECKLIST_METADATA.system_access_granted.label },
  { id: "welcome_email_sent", label: CHECKLIST_METADATA.welcome_email_sent.label },
  { id: "pre_onboarding_reviewed", label: CHECKLIST_METADATA.pre_onboarding_reviewed.label },
];

export default function HRTeamOnboardingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, Record<string, boolean>>>({});
  const [accessLinks, setAccessLinks] = useState<Record<string, string>>({});

  function authHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      headers["x-dev-role"] = "HR Admin";
    }
    return headers;
  }

  async function fetchOnboarding() {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/v2/pre-onboarding/queue", { headers: authHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load onboarding queue");
      setRows((body.data || []) as EmployeeRow[]);
    } catch (err: any) {
      setRows([]);
      setNotice({ type: "error", text: err.message || "Failed to load onboarding queue" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOnboarding(); }, []);

  const readyToActivate = useMemo(() =>
    rows.filter((e) => e?.onboarding_checklist?.pre_onboarding?.status === "reviewed"), [rows]);
  const pendingPreOnboarding = useMemo(() =>
    rows.filter((e) => e?.onboarding_checklist?.pre_onboarding?.status === "submitted"), [rows]);
  const awaitingForm = useMemo(() =>
    rows.filter((e) => !e?.onboarding_checklist?.pre_onboarding?.status || e.onboarding_checklist?.pre_onboarding?.status === "pending"), [rows]);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function toggleTask(empId: string, taskId: string) {
    setChecklistState((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [taskId]: !prev[empId]?.[taskId] },
    }));
  }

  function getChecklist(emp: EmployeeRow) {
    const tasks = emp.onboarding_checklist?.tasks || DEFAULT_CHECKLIST.map((t) => ({ ...t, done: false }));
    return tasks.map((t) => ({
      ...t,
      label: CHECKLIST_METADATA[t.id]?.label || t.label || t.title || "Checklist item",
      done:
        checklistState[emp.id]?.[t.id] ??
        t.done ??
        String(t.status || "").toLowerCase() === "completed",
    }));
  }

  async function activateEmployee(emp: EmployeeRow) {
    setActivatingId(emp.id);
    setNotice(null);
    try {
      const tasks = getChecklist(emp);
      const res = await fetch(`/api/hrms/v2/employees/${emp.id}/activate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          reviewed_by: "HR Admin",
          checklist_tasks: tasks,
        }),
      });
      let body: any = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        body = { error: text || "Activation failed" };
      }
      if (!res.ok) throw new Error(body.error || "Activation failed");

      const link = body.access_link || `${window.location.origin}/hrms/v2/self-service?employee=${emp.id}`;
      setAccessLinks((prev) => ({ ...prev, [emp.id]: link }));
      try { await navigator.clipboard.writeText(link); } catch { /* ok */ }

      setRows((prev) => prev.filter((r) => r.id !== emp.id));
      setNotice({ type: "success", text: `${emp.first_name || "Employee"} has been activated and moved to Employee Directory. Access link copied to clipboard.` });
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Activation failed. Please try again." });
    } finally {
      setActivatingId(null);
    }
  }

  function renderValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      if (typeof value[0] === "object") {
        return `${value.length} item${value.length > 1 ? "s" : ""}`;
      }
      return value.map((item) => String(item)).join(", ");
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function renderFormData(form?: Record<string, any>) {
    if (!form || Object.keys(form).length === 0) return <p className="text-xs text-slate-500 italic">No form data available.</p>;
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{key.replace(/_/g, " ")}</p>
            <p className="text-sm text-slate-900">{renderValue(value)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Onboarding & Activation"
          subtitle="Review pre-onboarding data, complete joining-day checklist, and activate employees into the directory."
        />

        {/* KPIs */}
        <section className="grid gap-3 md:grid-cols-4">
          <article className="hrms-kpi-card hrms-kpi-1">
            <div className="hrms-kpi-icon"><Users size={16} /></div>
            <p className="hrms-section-label">Total in Queue</p>
            <p className="hrms-kpi-value">{rows.length}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-3">
            <div className="hrms-kpi-icon"><ClipboardList size={16} /></div>
            <p className="hrms-section-label">Awaiting Form</p>
            <p className="hrms-kpi-value">{awaitingForm.length}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-2">
            <div className="hrms-kpi-icon"><FileText size={16} /></div>
            <p className="hrms-section-label">Pending Review</p>
            <p className="hrms-kpi-value">{pendingPreOnboarding.length}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-5">
            <div className="hrms-kpi-icon"><Zap size={16} /></div>
            <p className="hrms-section-label">Ready to Activate</p>
            <p className="hrms-kpi-value">{readyToActivate.length}</p>
          </article>
        </section>

        {/* Flow */}
        <section className="hrms-dashboard-shell">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Activation Flow</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { label: "Pre-Onboarding Reviewed", color: "bg-slate-100 text-slate-700 border-slate-200" },
              { label: "Docs & Checklist Complete", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "HR Activates Employee", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
              { label: "Employee Directory Created", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Access Link Shared", color: "bg-teal-50 text-teal-700 border-teal-200" },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${step.color}`}>{step.label}</span>
                {idx < arr.length - 1 && <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </section>

        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <div className="flex items-start justify-between gap-3">
              <span>{notice.text}</span>
              <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Access link display */}
        {Object.entries(accessLinks).map(([id, link]) => (
          <div key={id} className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal-800 mb-2">Employee activated! Share this access link:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white border border-teal-200 px-3 py-2 text-xs text-teal-900 font-mono break-all">{link}</code>
              <button onClick={async () => { try { await navigator.clipboard.writeText(link); } catch {} }} className="rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition">
                <Copy size={12} />
              </button>
            </div>
          </div>
        ))}

        {loading ? (
          <div className="hrms-dashboard-shell space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="hrms-dashboard-shell flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 size={40} className="mb-3 text-emerald-400" />
            <p className="font-semibold text-slate-700">Onboarding queue is empty</p>
            <p className="mt-1 text-sm text-slate-500">All employees have been activated, or no one is currently in onboarding.</p>
            <div className="mt-4 flex gap-3">
              <Link href="/team/employees" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                <Users size={14} /> View Employee Directory
              </Link>
              <Link href="/team/pre-onboarding" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                Pre-Onboarding Queue
              </Link>
            </div>
          </div>
        ) : (
          <section className="hrms-dashboard-shell">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Onboarding Queue
                <span className="ml-2 text-sm font-normal text-slate-500">— {rows.length} employee{rows.length !== 1 ? "s" : ""}</span>
              </h2>
              <Link href="/team/employees" className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition">
                Employee Directory <ChevronRight size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {rows.map((emp) => {
                const pre = emp.onboarding_checklist?.pre_onboarding;
                const preStatus = pre?.status || "pending";
                const isExpanded = expandedId === emp.id;
                const isBusy = activatingId === emp.id;
                const checklist = getChecklist(emp);
                const completedCount = checklist.filter((t) => t.done).length;
                const allDone = completedCount === checklist.length;
                const canActivate = preStatus === "reviewed";
                const isActive = String(emp.status || "").toLowerCase() === "active";
                const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unnamed";

                const nextAction = isActive
                  ? "Completed"
                  : canActivate
                  ? "Activate Employee"
                  : preStatus === "submitted"
                  ? "HR Review Pending"
                  : "Waiting for Submission";

                const preStatusConfig = {
                  pending:  { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Awaiting Form" },
                  submitted: { cls: "bg-amber-100 text-amber-700 border-amber-200", label: "Form Submitted" },
                  reviewed: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "HR Reviewed ✓" },
                }[preStatus] || { cls: "bg-slate-100 text-slate-600 border-slate-200", label: preStatus };

                return (
                  <article key={emp.id} className={`rounded-xl border transition ${canActivate ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${canActivate ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                          {fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{fullName}</h3>
                          <p className="text-xs text-slate-600">{emp.email || "No email"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${preStatusConfig.cls}`}>{preStatusConfig.label}</span>
                            {pre?.submitted_at && <span className="text-[10px] text-slate-400">Submitted {fmt(pre.submitted_at)}</span>}
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${allDone ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                              Checklist: {completedCount}/{checklist.length}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
                              Next: {nextAction}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => toggleExpand(emp.id)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                          {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><Eye size={12} /> View Details</>}
                        </button>
                        {isActive && (
                          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                            Already Active
                          </span>
                        )}
                        {!isActive && canActivate && (
                          <button
                            onClick={() => activateEmployee(emp)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-lg shadow-emerald-200"
                          >
                            {isBusy ? "Activating..." : <><Zap size={12} /> Activate Employee</>}
                          </button>
                        )}
                        {!isActive && !canActivate && (
                          <Link href="/team/pre-onboarding" className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                            Review Pre-Onboarding
                          </Link>
                        )}
                        <button
                          onClick={() => router.push(`/team/onboarding/${emp.id}`)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 transition"
                        >
                          Full Profile
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 px-4 py-4 space-y-4">
                        {/* Pre-Onboarding Form Data */}
                        {pre?.form && Object.keys(pre.form).length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Pre-Onboarding Form Data</p>
                            {renderFormData(pre.form)}
                          </div>
                        )}

                        {/* Joining-Day Checklist */}
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Joining-Day Checklist ({completedCount}/{checklist.length})</p>
                          <div className="space-y-2">
                            {checklist.map((task) => (
                              <label key={task.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={task.done}
                                  onChange={() => toggleTask(emp.id, task.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="min-w-0">
                                  <span className={`text-sm ${task.done ? "text-slate-500" : "text-slate-700"}`}>{task.label}</span>
                                  <p className="text-xs text-slate-500">{CHECKLIST_METADATA[task.id]?.help || "Complete this step before activation."}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                          {!canActivate && (
                            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              ⚠️ Complete HR review of pre-onboarding form in{" "}
                              <Link href="/team/pre-onboarding" className="underline font-semibold">Pre-Onboarding</Link> before activation.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <button onClick={fetchOnboarding} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link href="/team/pre-onboarding" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
            Pre-Onboarding Queue
          </Link>
          <Link href="/team/employees" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
            <Users size={14} /> Employee Directory
          </Link>
        </div>
      </div>
    </main>
  );
}
