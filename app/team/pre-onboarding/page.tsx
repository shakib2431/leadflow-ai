"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { supabaseAuth } from "@/lib/auth";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";

type EmployeeRow = {
  id: string;
  intake_link?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  source?: string;
  position?: string;
  department?: string;
  department_name?: string;
  onboarding_checklist?: {
    pre_onboarding?: {
      status?: string;
      submitted_at?: string;
      reviewed_at?: string;
      form?: Record<string, string>;
    };
  };
};

type QueueStage = "awaiting" | "submitted" | "reviewed" | "ready";
type TimeFilter = "all" | "today" | "last7" | "last30";

const stageMeta: { key: QueueStage; label: string; dot: string; badgeClass: string }[] = [
  { key: "awaiting", label: "Awaiting Form", dot: "bg-violet-500", badgeClass: "bg-violet-50 text-violet-700" },
  { key: "submitted", label: "Form Submitted", dot: "bg-amber-500", badgeClass: "bg-amber-50 text-amber-700" },
  { key: "reviewed", label: "HR Reviewed", dot: "bg-sky-500", badgeClass: "bg-sky-50 text-sky-700" },
  { key: "ready", label: "Ready for Activation", dot: "bg-emerald-500", badgeClass: "bg-emerald-50 text-emerald-700" },
];

function getStageFromEmployee(emp: EmployeeRow): QueueStage {
  const status = (emp.onboarding_checklist?.pre_onboarding?.status || "pending").toLowerCase();
  if (status === "reviewed") return "reviewed";
  if (status === "ready" || status === "ready_for_activation" || status === "activated") return "ready";
  if (status === "submitted") return "submitted";
  return "awaiting";
}

function getPosition(employee: EmployeeRow) {
  return employee.position || employee.source || "-";
}

function getDepartment(employee: EmployeeRow) {
  return employee.department || employee.department_name || "-";
}

function fullName(employee: EmployeeRow) {
  const name = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  return name || "Unnamed";
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "NA";
}

function fmtDate(input?: string) {
  if (!input) return "-";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString();
}

function daysSince(input?: string) {
  if (!input) return 0;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function getKeyDate(employee: EmployeeRow) {
  return employee.onboarding_checklist?.pre_onboarding?.submitted_at || employee.onboarding_checklist?.pre_onboarding?.reviewed_at || employee.created_at;
}

function getLocation(employee: EmployeeRow) {
  const form = employee.onboarding_checklist?.pre_onboarding?.form || {};
  return form.location || form.city || form.work_location || "-";
}

function getNextActionLabel(employee: EmployeeRow) {
  const stage = getStageFromEmployee(employee);
  if (stage === "awaiting") return "Share intake link and wait for submission";
  if (stage === "submitted") return "HR must review submitted form";
  if (stage === "reviewed") return "Move candidate to onboarding queue";
  return "Ready for activation in onboarding";
}

export default function PreOnboardingOperationsPage() {
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const calendarMenuRef = useRef<HTMLDivElement | null>(null);
  const bellMenuRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [previewEmployee, setPreviewEmployee] = useState<EmployeeRow | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState("HR Admin");
  const [statusFilter, setStatusFilter] = useState<QueueStage | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showBellMenu, setShowBellMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [newSubmissionAlertCount, setNewSubmissionAlertCount] = useState(0);
  const knownSubmittedIdsRef = useRef<Set<string>>(new Set());
  const hasInitialSnapshotRef = useRef(false);

  function apiHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      headers["x-dev-role"] = "HR Admin";
    }
    return headers;
  }

  const loadRows = useCallback(async (opts?: { silent?: boolean; source?: "manual" | "poll" }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/hrms/v2/pre-onboarding/queue", { headers: apiHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load queue");

      const nextRows = (body.data || []) as EmployeeRow[];
      setRows(nextRows);
      if (!silent) {
        setSelectedIds(new Set());
      }

      const nextSubmittedIds = new Set(
        nextRows
          .filter((employee) => getStageFromEmployee(employee) === "submitted")
          .map((employee) => employee.id),
      );

      if (hasInitialSnapshotRef.current && opts?.source === "poll") {
        const previousIds = knownSubmittedIdsRef.current;
        const freshCount = [...nextSubmittedIds].filter((id) => !previousIds.has(id)).length;
        if (freshCount > 0) {
          setNewSubmissionAlertCount((prev) => prev + freshCount);
          setMessage({
            type: "success",
            text: `${freshCount} new pre-onboarding submission${freshCount > 1 ? "s" : ""} received.`,
          });
        }
      }

      knownSubmittedIdsRef.current = nextSubmittedIds;
      if (!hasInitialSnapshotRef.current) hasInitialSnapshotRef.current = true;
    } catch (err: any) {
      setRows([]);
      setMessage({ type: "error", text: err.message || "Failed to load queue" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows({ source: "manual" });
  }, [loadRows]);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadRows({ silent: true, source: "poll" });
    }, 30000);

    return () => window.clearInterval(id);
  }, [loadRows]);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabaseAuth.auth.getUser();
      const email = data.user?.email;
      if (email) setUserName(email.split("@")[0] || "HR Admin");
    };

    loadUser();
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(target)) setShowCalendarMenu(false);
      if (bellMenuRef.current && !bellMenuRef.current.contains(target)) setShowBellMenu(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) setShowProfileMenu(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((employee) => {
      const stage = getStageFromEmployee(employee);
      const department = getDepartment(employee);
      const location = getLocation(employee);
      const dateSource = getKeyDate(employee);
      const date = dateSource ? new Date(dateSource) : null;
      const now = new Date();

      if (statusFilter !== "all" && stage !== statusFilter) return false;
      if (departmentFilter !== "all" && department !== departmentFilter) return false;
      if (locationFilter !== "all" && location !== locationFilter) return false;

      if (timeFilter !== "all") {
        if (!date || Number.isNaN(date.getTime())) {
          if (timeFilter === "today") return false;
          return true;
        }
        const msDiff = now.getTime() - date.getTime();
        const dayDiff = msDiff / (1000 * 60 * 60 * 24);
        if (timeFilter === "today" && date.toDateString() !== now.toDateString()) return false;
        if (timeFilter === "last7" && dayDiff > 7) return false;
        if (timeFilter === "last30" && dayDiff > 30) return false;
      }

      const value = [
        fullName(employee),
        employee.email,
        employee.status,
        department,
        location,
        employee.onboarding_checklist?.pre_onboarding?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return search ? value.includes(search) : true;
    });
  }, [rows, query, statusFilter, departmentFilter, locationFilter, timeFilter]);

  const buckets = useMemo(() => {
    const initial: Record<QueueStage, EmployeeRow[]> = {
      awaiting: [],
      submitted: [],
      reviewed: [],
      ready: [],
    };

    for (const employee of filteredRows) {
      const stage = getStageFromEmployee(employee);
      initial[stage].push(employee);
    }

    return initial;
  }, [filteredRows]);

  const tableRows = useMemo(() => filteredRows.slice(0, 24), [filteredRows]);
  const allVisibleSelected = tableRows.length > 0 && tableRows.every((employee) => selectedIds.has(employee.id));
  const departmentOptions = useMemo(() => {
    const set = new Set(rows.map((employee) => getDepartment(employee)).filter((value) => value && value !== "-"));
    return Array.from(set);
  }, [rows]);
  const locationOptions = useMemo(() => {
    const set = new Set(rows.map((employee) => getLocation(employee)).filter((value) => value && value !== "-"));
    return Array.from(set);
  }, [rows]);
  const notifications = useMemo(() => {
    const submittedCount = buckets.submitted.length;
    const oldAwaitingCount = buckets.awaiting.filter((employee) => daysSince(getKeyDate(employee)) >= 3).length;
    const result: string[] = [];

    if (submittedCount > 0) result.push(`${submittedCount} forms are waiting for HR review.`);
    if (oldAwaitingCount > 0) result.push(`${oldAwaitingCount} candidates are pending form submission for 3+ days.`);
    if (newSubmissionAlertCount > 0) {
      result.unshift(`${newSubmissionAlertCount} new submission${newSubmissionAlertCount > 1 ? "s" : ""} since last refresh.`);
    }
    if (result.length === 0) result.push("Queue is clear. No pending pre-onboarding actions.");

    return result;
  }, [buckets, newSubmissionAlertCount]);

  function resolveAppBaseUrl() {
    const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envBase && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(envBase)) {
      return envBase.replace(/\/$/, "");
    }
    return window.location.origin.replace(/\/$/, "");
  }

  function buildIntakeLink(employee: EmployeeRow) {
    if (employee.intake_link) return employee.intake_link;
    return `${resolveAppBaseUrl()}/pre-onboarding/invalid`;
  }

  function csvCell(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportAllRows() {
    const rowsToExport = filteredRows;
    if (rowsToExport.length === 0) {
      setMessage({ type: "error", text: "No rows to export." });
      return;
    }

    const header = [
      "Candidate",
      "Email",
      "Status",
      "Submitted At",
      "Reviewed At",
      "Intake Link",
    ];

    const lines = rowsToExport.map((employee) => {
      const pre = employee.onboarding_checklist?.pre_onboarding;
      const stage = stageMeta.find((item) => item.key === getStageFromEmployee(employee))?.label || "Awaiting Form";
      return [
        fullName(employee),
        employee.email || "",
        stage,
        fmtDate(pre?.submitted_at),
        fmtDate(pre?.reviewed_at),
        buildIntakeLink(employee),
      ]
        .map((value) => csvCell(value))
        .join(",");
    });

    const csv = [header.map(csvCell).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pre-onboarding-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: `Exported ${rowsToExport.length} records.` });
  }

  async function sendSelectedIntakeLinks() {
    const selected = filteredRows.filter((employee) => selectedIds.has(employee.id));
    const awaitingRows = filteredRows.filter((employee) => getStageFromEmployee(employee) === "awaiting");
    const finalRows = selected.length > 0 ? selected : awaitingRows;

    if (finalRows.length === 0) {
      setMessage({ type: "error", text: "No candidates available for intake link sending." });
      return;
    }

    const payload = finalRows.map((employee) => `${fullName(employee)}: ${buildIntakeLink(employee)}`).join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      setMessage({
        type: "success",
        text: `Copied ${finalRows.length} intake link${finalRows.length > 1 ? "s" : ""}. Share them by email/WhatsApp.`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to copy intake links." });
    }
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        tableRows.forEach((employee) => next.delete(employee.id));
      } else {
        tableRows.forEach((employee) => next.add(employee.id));
      }
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function copyIntakeLink(employee: EmployeeRow) {
    try {
      await navigator.clipboard.writeText(buildIntakeLink(employee));
      setMessage({ type: "success", text: `Pre-onboarding intake link copied for ${fullName(employee)}.` });
    } catch {
      setMessage({ type: "error", text: "Copy failed." });
    }
  }

  async function markHRReviewed(employee: EmployeeRow) {
    setReviewingId(employee.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({
          onboarding_checklist: {
            ...employee.onboarding_checklist,
            pre_onboarding: {
              ...employee.onboarding_checklist?.pre_onboarding,
              status: "reviewed",
              reviewed_at: new Date().toISOString(),
            },
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed");
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === employee.id
            ? {
                ...row,
                onboarding_checklist: {
                  ...row.onboarding_checklist,
                  pre_onboarding: {
                    ...row.onboarding_checklist?.pre_onboarding,
                    status: "reviewed",
                    reviewed_at: new Date().toISOString(),
                  },
                },
              }
            : row,
        ),
      );

      setMessage({
        type: "success",
        text: `HR review complete for ${fullName(employee)}. Ready for activation in onboarding queue.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed" });
    } finally {
      setReviewingId(null);
    }
  }

  function renderValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return "-";
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
    if (!form || Object.keys(form).length === 0) {
      return <p className="text-xs text-[#667085] italic">No form data submitted yet.</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]">{key.replace(/_/g, " ")}</p>
            <p className="text-sm text-[#101828]">{renderValue(value)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <section className="min-w-0 rounded-2xl border border-[#e9ecf4] bg-white p-4 shadow-[0_8px_28px_rgba(16,24,40,0.05)] lg:p-6">
          <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-[#101828]">Pre-Onboarding</h1>
              <p className="text-sm text-[#667085]">
                Track intake form submissions, review data, and route candidates for joining-day activation.
              </p>
            </div>

            <div className="flex w-full items-center justify-end gap-3 xl:w-auto">
              <label className="hidden h-11 w-[260px] items-center gap-2 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-3 md:flex lg:w-[320px] xl:w-[360px]">
                <Search size={16} className="text-[#98a2b3]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, status..."
                  className="h-full w-full border-none bg-transparent text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
                />
              </label>

              <div ref={calendarMenuRef} className="relative">
                <button
                  onClick={() => setShowCalendarMenu((prev) => !prev)}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e4e7ec] text-[#667085] hover:bg-[#f9fafb]"
                >
                  <CalendarDays size={16} />
                </button>
                {showCalendarMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[#e4e7ec] bg-white p-1.5 shadow-lg">
                    {[
                      { key: "all", label: "All Time" },
                      { key: "today", label: "Today" },
                      { key: "last7", label: "Last 7 Days" },
                      { key: "last30", label: "Last 30 Days" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setTimeFilter(option.key as TimeFilter);
                          setShowCalendarMenu(false);
                        }}
                        className={`w-full rounded-lg px-2.5 py-2 text-left text-sm ${timeFilter === option.key ? "bg-[#eef0ff] text-[#4f46e5]" : "text-[#344054] hover:bg-[#f9fafb]"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={bellMenuRef} className="relative">
                <button
                  onClick={() => {
                    setShowBellMenu((prev) => !prev);
                    if (newSubmissionAlertCount > 0) setNewSubmissionAlertCount(0);
                  }}
                  className="relative grid h-11 w-11 place-items-center rounded-xl border border-[#e4e7ec] text-[#667085] hover:bg-[#f9fafb]"
                >
                  <Bell size={16} />
                  {notifications.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ef4444] px-1 text-[10px] font-semibold text-white">
                      {Math.min(notifications.length, 9)}
                    </span>
                  )}
                </button>
                {showBellMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-[#e4e7ec] bg-white p-3 shadow-lg">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">Notifications</p>
                    <div className="space-y-2">
                      {notifications.map((note) => (
                        <div key={note} className="rounded-lg border border-[#edf0f5] bg-[#fafbff] px-3 py-2 text-sm text-[#344054]">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={profileMenuRef} className="relative">
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-[#e4e7ec] px-2 py-1.5"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#5b5cf0] text-xs font-semibold text-white">{initials(userName)}</div>
                  <div className="leading-tight text-left">
                    <p className="text-sm font-semibold text-[#101828]">{userName}</p>
                    <p className="text-xs text-[#667085]">Operations</p>
                  </div>
                  <ChevronDown size={14} className="text-[#98a2b3]" />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-[#e4e7ec] bg-white p-1.5 shadow-lg">
                    <Link href="/hrms/v2/settings" className="block rounded-lg px-2.5 py-2 text-sm text-[#344054] hover:bg-[#f9fafb]">Profile Settings</Link>
                    <button
                      onClick={async () => {
                        await supabaseAuth.auth.signOut();
                        window.location.href = "/login";
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-[#b42318] hover:bg-[#fff5f5]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total in Queue" value={filteredRows.length} hint="live records" color="violet" />
            <MetricCard title="Awaiting Form" value={buckets.awaiting.length} hint="needs response" color="amber" />
            <MetricCard title="Form Submitted" value={buckets.submitted.length} hint="awaiting review" color="rose" />
            <MetricCard title="HR Reviewed" value={buckets.reviewed.length} hint="processed" color="emerald" />
          </section>

          <section className="mb-5 rounded-2xl border border-[#eaecf5] bg-[#fbfcff] p-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {[
                "Offer Signed",
                "Intake Link Sent",
                "Employee Fills Form",
                "HR Reviews Data",
                "Ready for Activation",
              ].map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                    index <= 2 ? "bg-[#eef0ff] text-[#4f46e5]" : "bg-white text-[#667085]"
                  }`}
                >
                  {index <= 1 ? <Check size={14} /> : <Circle size={12} />}
                  <span className="truncate">{step}</span>
                </div>
              ))}
            </div>
          </section>

          {message && (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border-[#abefc6] bg-[#ecfdf3] text-[#067647]"
                  : "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
            {stageMeta.map((stage) => {
              const list = buckets[stage.key];
              return (
                <div key={stage.key} className="rounded-2xl border border-[#eaecf5] bg-white">
                  <div className="flex items-center justify-between border-b border-[#f1f3f8] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
                      <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                      {stage.label}
                    </p>
                    <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">{list.length}</span>
                  </div>

                  <div className="space-y-2 p-3">
                    {list.slice(0, 5).map((employee, index) => {
                      const name = fullName(employee);
                      const pre = employee.onboarding_checklist?.pre_onboarding;
                      const canReview = stage.key === "submitted";
                      const isBusy = reviewingId === employee.id;
                      const age = daysSince(getKeyDate(employee));
                      const nextActionLabel = getNextActionLabel(employee);

                      return (
                        <div key={employee.id} className="rounded-xl border border-[#edf0f5] bg-[#fcfdff] px-3 py-2.5">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-[#101828]">{name}</p>
                            <span className="rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#4f46e5]">
                              {Math.max(1, age || index + 1)}d
                            </span>
                          </div>
                          <p className="line-clamp-1 text-xs text-[#667085]">{employee.email || "No email"}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => copyIntakeLink(employee)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#e4e7ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#475467] hover:border-[#cfd4e6]"
                            >
                              <Copy size={11} /> Link
                            </button>

                            {canReview && (
                              <button
                                onClick={() => markHRReviewed(employee)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-md bg-[#12b76a] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                              >
                                <UserCheck size={11} /> {isBusy ? "Reviewing" : "Review"}
                              </button>
                            )}

                            {stage.key === "ready" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#ecfdf3] px-2 py-1 text-[11px] font-semibold text-[#067647]">
                                <CheckCircle2 size={11} /> Ready
                              </span>
                            )}

                            {stage.key === "reviewed" && (
                              <Link
                                href="/team/onboarding"
                                className="inline-flex items-center gap-1 rounded-md border border-[#dbeafe] bg-[#eff6ff] px-2 py-1 text-[11px] font-semibold text-[#1d4ed8]"
                              >
                                Move to Onboarding
                              </Link>
                            )}

                            {pre?.form && (
                              <button
                                onClick={() => setPreviewEmployee(employee)}
                                className="inline-flex items-center gap-1 rounded-md border border-[#e4e7ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#475467]"
                              >
                                <Eye size={11} /> Form
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <Link href="#pre-onboarding-table" className="block px-1 pt-1 text-xs font-semibold text-[#4f46e5] hover:underline">
                      View all {list.length}
                    </Link>
                    {list.length === 0 && (
                      <div className="rounded-lg border border-dashed border-[#e4e7ec] px-3 py-5 text-center text-xs text-[#98a2b3]">
                        No candidates in this stage.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {previewEmployee?.onboarding_checklist?.pre_onboarding?.form && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#eaecf5] px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">Pre-Onboarding Form</p>
                    <p className="text-xs text-[#667085]">{fullName(previewEmployee)} • {previewEmployee.email || "No email"}</p>
                  </div>
                  <button
                    onClick={() => setPreviewEmployee(null)}
                    className="rounded-lg border border-[#e4e7ec] p-2 text-[#667085] hover:bg-[#f9fafb]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-[calc(86vh-58px)] overflow-y-auto p-5">
                  {renderFormData(previewEmployee.onboarding_checklist.pre_onboarding.form as Record<string, any>)}
                  <p className="mt-3 text-xs font-medium text-[#475467]">Next Action: {getNextActionLabel(previewEmployee)}</p>
                </div>
              </div>
            </div>
          )}

          <section id="pre-onboarding-table" className="rounded-2xl border border-[#eaecf5] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#f1f3f8] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5">
                  <Search size={14} className="text-[#98a2b3]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search candidates..."
                    className="h-full w-full border-none bg-transparent text-xs outline-none placeholder:text-[#98a2b3]"
                  />
                </label>
                <button
                  onClick={() => {
                    const options: Array<QueueStage | "all"> = ["all", "awaiting", "submitted", "reviewed", "ready"];
                    const index = options.indexOf(statusFilter);
                    setStatusFilter(options[(index + 1) % options.length]);
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#e4e7ec] px-2.5 text-xs font-medium text-[#475467]"
                >
                  {statusFilter === "all" ? "Status" : stageMeta.find((item) => item.key === statusFilter)?.label || "Status"} <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => {
                    const options = ["all", ...departmentOptions];
                    const index = options.indexOf(departmentFilter);
                    setDepartmentFilter(options[(index + 1) % options.length] || "all");
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#e4e7ec] px-2.5 text-xs font-medium text-[#475467]"
                >
                  {departmentFilter === "all" ? "Department" : departmentFilter} <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => {
                    const options = ["all", ...locationOptions];
                    const index = options.indexOf(locationFilter);
                    setLocationFilter(options[(index + 1) % options.length] || "all");
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#e4e7ec] px-2.5 text-xs font-medium text-[#475467]"
                >
                  {locationFilter === "all" ? "Location" : locationFilter} <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => {
                    const options: TimeFilter[] = ["all", "today", "last7", "last30"];
                    const index = options.indexOf(timeFilter);
                    setTimeFilter(options[(index + 1) % options.length]);
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#e4e7ec] px-2.5 text-xs font-medium text-[#475467]"
                >
                  {timeFilter === "all" ? "All Time" : timeFilter === "today" ? "Today" : timeFilter === "last7" ? "Last 7 Days" : "Last 30 Days"} <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadRows({ source: "manual" })}
                  disabled={loading}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#d7dcf0] bg-white px-3 text-xs font-semibold text-[#475467]"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
                <button
                  onClick={exportAllRows}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#d7dcf0] bg-white px-3 text-xs font-semibold text-[#475467]"
                >
                  <Download size={14} /> Export
                </button>
                <button
                  onClick={sendSelectedIntakeLinks}
                  className="flex h-9 items-center gap-1 rounded-lg bg-[#4f46e5] px-3 text-xs font-semibold text-white"
                >
                  <Plus size={14} /> Send Intake Link
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[#f1f3f8] bg-[#f9fafb] text-[11px] uppercase tracking-wide text-[#667085]">
                    <th className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                      />
                    </th>
                    <th className="px-4 py-2.5">Candidate</th>
                    <th className="px-4 py-2.5">Position</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Intake Link</th>
                    <th className="px-4 py-2.5">Form Filled On</th>
                    <th className="px-4 py-2.5">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#667085]">Loading queue...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#667085]">No records found.</td>
                    </tr>
                  ) : (
                    tableRows.map((employee) => {
                      const name = fullName(employee);
                      const stage = getStageFromEmployee(employee);
                      const stageStyle = stageMeta.find((item) => item.key === stage);
                      const pre = employee.onboarding_checklist?.pre_onboarding;
                      const isSubmitted = stage === "submitted";
                      const isAwaiting = stage === "awaiting";
                      const isDoneStage = stage === "reviewed" || stage === "ready";
                      const nextActionLabel = getNextActionLabel(employee);

                      return (
                        <tr key={employee.id} className="border-b border-[#f6f7fb] text-sm text-[#344054]">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${name}`}
                              checked={selectedIds.has(employee.id)}
                              onChange={() => toggleSelectOne(employee.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#eef2ff] text-xs font-semibold text-[#4f46e5]">
                                {initials(name)}
                              </div>
                              <div>
                                <p className="font-semibold text-[#101828]">{name}</p>
                                <p className="text-xs text-[#667085]">{employee.email || "-"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{getPosition(employee)}</td>
                          <td className="px-4 py-3">{getDepartment(employee)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stageStyle?.badgeClass || "bg-gray-50 text-gray-700"}`}>
                              {stageStyle?.label || "Awaiting Form"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isAwaiting ? (
                              <button
                                onClick={() => copyIntakeLink(employee)}
                                className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-1 text-xs font-semibold text-[#4338ca]"
                              >
                                <Copy size={12} /> Copy Link
                              </button>
                            ) : (
                              <button
                                onClick={() => copyIntakeLink(employee)}
                                className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#027a48]"
                              >
                                <Check size={12} /> Link Shared
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#667085]">{fmtDate(pre?.submitted_at || pre?.reviewed_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1 text-[#98a2b3]">
                              {isSubmitted && (
                                <button
                                  onClick={() => markHRReviewed(employee)}
                                  disabled={reviewingId === employee.id}
                                  className="rounded-md border border-[#d0d5dd] px-2 py-1 text-[11px] font-semibold text-[#344054] disabled:opacity-60"
                                >
                                  {reviewingId === employee.id ? "..." : "Review"}
                                </button>
                              )}
                              {isDoneStage && (
                                <Link
                                  href="/team/onboarding"
                                  className="rounded-md border border-[#dbeafe] bg-[#eff6ff] px-2 py-1 text-[11px] font-semibold text-[#1d4ed8]"
                                >
                                  Onboarding Queue
                                </Link>
                              )}
                              {isAwaiting && (
                                <span className="rounded-md border border-[#e4e7ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#667085]">Awaiting Employee</span>
                              )}
                              <span className="text-[11px] text-[#667085]">{nextActionLabel}</span>
                              <MoreHorizontal size={16} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-xs text-[#667085]">
              <p>Showing 1 to {Math.min(filteredRows.length, 24)} of {filteredRows.length} entries</p>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 rounded-md border border-[#e4e7ec]">1</button>
                <button className="h-7 w-7 rounded-md border border-[#e4e7ec]">2</button>
                <button className="h-7 w-7 rounded-md border border-[#e4e7ec]">3</button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  hint,
  color,
}: {
  title: string;
  value: number;
  hint: string;
  color: "violet" | "amber" | "rose" | "emerald";
}) {
  const styles: Record<typeof color, string> = {
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-[#eaecf5] bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-[#667085]">{title}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${styles[color]}`}>
          <Circle size={14} />
        </div>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-[#101828]">{value}</p>
      <p className="mt-1 text-xs text-[#12b76a]">{hint}</p>
    </div>
  );
}
