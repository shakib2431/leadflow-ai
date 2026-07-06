"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, X, Clock } from "lucide-react";
import HRMSHeaderWithFilters from "@/app/hrms/v2/components/hrms-header-with-filters";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";

type AttendanceException = {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  exception_type: string;
  severity: "low" | "medium" | "high";
  status: "open" | "in_review" | "resolved" | "dismissed";
  proposed_correction?: string;
  notes?: string;
  created_at: string;
  employees?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  };
};

type AttendanceCorrection = {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  current_status: string;
  requested_status: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_note?: string | null;
  employees?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  };
};

function isOpenExceptionStatus(status: string) {
  return status === "open" || status === "in_review";
}

function resolveEmployeeDisplayName(input: {
  employee_name?: string;
  employee_id?: string;
  employees?: { first_name?: string; last_name?: string; employee_code?: string };
}) {
  const fullName = `${input.employees?.first_name || ""} ${input.employees?.last_name || ""}`.trim();
  if (input.employee_name) return input.employee_name;
  if (fullName) return fullName;
  if (input.employees?.employee_code) return input.employees.employee_code;
  if (input.employee_id) return `Employee ${String(input.employee_id).slice(0, 8)}`;
  return "Employee";
}

function getExceptionEmployeeName(exc: AttendanceException) {
  return resolveEmployeeDisplayName(exc);
}

function getCorrectionEmployeeName(corr: AttendanceCorrection) {
  return resolveEmployeeDisplayName(corr);
}

export default function AttendanceExceptionsPage() {
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"exceptions" | "corrections">("exceptions");
  const [filter, setFilter] = useState({ type: "", severity: "", status: "" });
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [focusExceptionId, setFocusExceptionId] = useState<string | null>(null);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" && !window.location.hostname.includes("prod") && {
        "x-dev-mode": "true",
        "x-dev-role": "HR Admin",
      }),
    };
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [excRes, corRes] = await Promise.all([
        fetch("/api/hrms/v2/attendance/exceptions", { headers: authHeaders() }),
        fetch("/api/hrms/v2/attendance/corrections", { headers: authHeaders() }),
      ]);

      const excRows: AttendanceException[] = excRes.ok ? (((await excRes.json()).data || []) as AttendanceException[]) : [];
      const corRows: AttendanceCorrection[] = corRes.ok ? (((await corRes.json()).data || []) as AttendanceCorrection[]) : [];

      const idsToHydrate = Array.from(
        new Set(
          [...excRows.map((row) => row.employee_id), ...corRows.map((row) => row.employee_id)]
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        )
      );

      const employeeNameById = new Map<string, string>();
      await Promise.all(
        idsToHydrate.map(async (id) => {
          try {
            const res = await fetch(`/api/hrms/v2/employees/${id}`, { headers: authHeaders() });
            if (!res.ok) return;
            const payload = await res.json();
            const emp = payload?.data;
            const fullName = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();
            const label = fullName || String(emp?.employee_code || "").trim() || String(emp?.email || "").trim();
            if (label) employeeNameById.set(id, label);
          } catch {
            // Keep fallback behavior when employee lookup fails.
          }
        })
      );

      const normalizedExceptions = excRows.map((row) => ({
        ...row,
        employee_name: employeeNameById.get(row.employee_id) || resolveEmployeeDisplayName(row),
      }));

      const normalizedCorrections = corRows.map((row) => ({
        ...row,
        employee_name: employeeNameById.get(row.employee_id) || resolveEmployeeDisplayName(row),
      }));

      setExceptions(normalizedExceptions);
      setCorrections(normalizedCorrections);
    } catch (err) {
      setNotice({ type: "error", text: "Failed to load attendance data" });
    } finally {
      setLoading(false);
    }
  }

  async function resolveException(exceptionId: string, action: "in_review" | "resolved" | "dismissed") {
    try {
      const res = await fetch(`/api/hrms/v2/attendance/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          status: action,
          ...(action === "resolved" || action === "dismissed"
            ? { resolution_note: action === "resolved" ? "Marked as resolved by HR." : "Dismissed by HR after review." }
            : {}),
        }),
      });
      if (res.ok) {
        if (action === "in_review") {
          setTab("exceptions");
          setFilter({ type: "", severity: "", status: "in_review" });
          setFocusExceptionId(exceptionId);
          setNotice({ type: "success", text: "Moved to In Review. Filter updated to show reviewed items." });
        } else {
          setNotice({ type: "success", text: `Exception moved to ${action}` });
        }
        fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update exception");
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to resolve exception" });
    }
  }

  async function approveCorrection(correctionId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/attendance/corrections/${correctionId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Correction approved" });
        fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to approve correction");
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to approve correction" });
    }
  }

  async function rejectCorrection(correctionId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/attendance/corrections/${correctionId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ action: "reject", review_note: "Rejected by HR after review." }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Correction rejected" });
        fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reject correction");
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to reject correction" });
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!focusExceptionId) return;
    const row = document.getElementById(`attendance-exception-${focusExceptionId}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusExceptionId(null);
    }
  }, [exceptions, focusExceptionId]);

  const filteredExceptions = exceptions.filter(
    (exc) =>
      (!filter.type || exc.exception_type === filter.type) &&
      (!filter.severity || exc.severity === filter.severity) &&
      (!filter.status || exc.status === filter.status)
  );

  const filteredCorrections = corrections.filter((corr) => !filter.status || corr.status === filter.status);

  const severityColors = {
    low: "text-blue-700 bg-blue-50 border-blue-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    high: "text-rose-700 bg-rose-50 border-rose-200",
  };

  const statusColors = {
    open: "text-amber-700 bg-amber-50 border-amber-200",
    in_review: "text-indigo-700 bg-indigo-50 border-indigo-200",
    resolved: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dismissed: "text-slate-700 bg-slate-50 border-slate-200",
    pending: "text-amber-700 bg-amber-50 border-amber-200",
    approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rejected: "text-rose-700 bg-rose-50 border-rose-200",
  };

  const pendingExceptionCount = exceptions.filter((e) => isOpenExceptionStatus(e.status)).length;
  const pendingCorrectionCount = corrections.filter((c) => c.status === "pending").length;

  return (
    <main className="hrms-enterprise min-h-screen bg-slate-50">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSHeaderWithFilters
          title="Attendance Exceptions & Corrections"
          subtitle={`${pendingExceptionCount} exceptions, ${pendingCorrectionCount} corrections pending`}
          tabs={[
            {
              label: `Auto-Detected Exceptions (${pendingExceptionCount})`,
              id: "exceptions",
              active: tab === "exceptions",
              onClick: () => setTab("exceptions"),
            },
            {
              label: `Manual Corrections (${pendingCorrectionCount})`,
              id: "corrections",
              active: tab === "corrections",
              onClick: () => setTab("corrections"),
            },
          ]}
          filters={[
            {
              id: "type",
              label: "Exception Type",
              type: "select",
              options: [
                { label: "All", value: "" },
                { label: "Missing Attendance", value: "missing_attendance" },
                { label: "Unplanned Absence", value: "unplanned_absence" },
                { label: "Pending Correction", value: "pending_correction" },
                { label: "Repeated Absence", value: "repeated_absence" },
              ],
              value: filter.type,
              onChange: (val) => setFilter({ ...filter, type: val }),
            },
            {
              id: "severity",
              label: "Severity",
              type: "select",
              options: [
                { label: "All", value: "" },
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
              ],
              value: filter.severity,
              onChange: (val) => setFilter({ ...filter, severity: val }),
            },
            {
              id: "status",
              label: "Status",
              type: "select",
              options: [
                { label: "All", value: "" },
                { label: "Open", value: "open" },
                { label: "In Review", value: "in_review" },
                { label: "Resolved", value: "resolved" },
                { label: "Dismissed", value: "dismissed" },
                { label: "Correction Pending", value: "pending" },
                { label: "Correction Approved", value: "approved" },
                { label: "Correction Rejected", value: "rejected" },
              ],
              value: filter.status,
              onChange: (val) => setFilter({ ...filter, status: val }),
            },
          ]}
        />

        {notice && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {notice.text}
          </div>
        )}

        {/* Exceptions Tab */}
        {tab === "exceptions" && (
          <div className="p-6 space-y-4">
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : filteredExceptions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Check className="mx-auto mb-2 text-emerald-400" size={32} />
                <p className="text-slate-600">No attendance exceptions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExceptions.map((exc) => (
                  <div id={`attendance-exception-${exc.id}`} key={exc.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={16} className={exc.severity === "high" ? "text-rose-500" : "text-amber-500"} />
                          <p className="font-semibold text-slate-900">{getExceptionEmployeeName(exc)}</p>
                          <span className={`px-2 py-1 text-xs font-medium border rounded ${severityColors[exc.severity]}`}>
                            {exc.severity}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[exc.status]}`}>
                            {String(exc.status).replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {exc.exception_type.replace(/_/g, " ")} • {new Date(exc.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-2">Proposed: {exc.proposed_correction || "-"}</p>
                        {exc.notes && <p className="text-xs text-slate-500 mt-1">Notes: {exc.notes}</p>}
                      </div>
                      {(exc.status === "open" || exc.status === "in_review") && (
                        <div className="flex gap-2 ml-4">
                          {exc.status === "open" && (
                            <button
                              onClick={() => resolveException(exc.id, "in_review")}
                              className="flex items-center gap-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
                            >
                              <Clock size={16} /> Review
                            </button>
                          )}
                          <button
                            onClick={() => resolveException(exc.id, "resolved")}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                          >
                            <Check size={16} /> Resolve
                          </button>
                          <button
                            onClick={() => resolveException(exc.id, "dismissed")}
                            className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                          >
                            <X size={16} /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Corrections Tab */}
        {tab === "corrections" && (
          <div className="p-6 space-y-4">
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : filteredCorrections.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Check className="mx-auto mb-2 text-emerald-400" size={32} />
                <p className="text-slate-600">No correction records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCorrections.map((corr) => (
                    <div key={corr.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={16} className="text-blue-500" />
                            <p className="font-semibold text-slate-900">{getCorrectionEmployeeName(corr)}</p>
                            <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[corr.status]}`}>
                              {String(corr.status).replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{new Date(corr.date).toLocaleDateString()}</p>
                          <p className="text-sm text-slate-600 mt-2">
                            {corr.current_status} → {corr.requested_status}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Employee note: {corr.reason}</p>
                          {corr.review_note && <p className="text-xs text-slate-500 mt-1">HR note: {corr.review_note}</p>}
                        </div>
                        {corr.status === "pending" && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => approveCorrection(corr.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                            >
                              <Check size={16} /> Approve
                            </button>
                            <button
                              onClick={() => rejectCorrection(corr.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-200"
                            >
                              <X size={16} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
