

import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { Shield, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  ExportBar,
} from "../components";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PFByPeriod = {
  month: number;
  year: number;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
};

type PFSummaryPayload = {
  totals: {
    employee_contribution: number;
    employer_contribution: number;
    total_contribution: number;
  };
  coverage: {
    active_employees: number;
    payroll_employees: number;
    pf_applicable_employees: number;
    pf_coverage_percent: number;
  };
  byPeriod: PFByPeriod[];
};

type PayrollRun = {
  id: string;
  period_month: number;
  period_year: number;
  status: string;
};

function formatINR(value?: number) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function monthName(month: number) {
  const d = new Date(2000, Math.max(0, month - 1), 1);
  return d.toLocaleString("en-US", { month: "long" });
}

function parseMonth(input?: string) {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1 || value > 12) return null;
  return Math.floor(value);
}

function parseYear(input?: string) {
  if (!input) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 2000 || value > 2100) return null;
  return Math.floor(value);
}

export default function ComplianceReportsPage() {
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pfSummary, setPfSummary] = useState<PFSummaryPayload | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
    }

    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      const roleOverride = String(window.localStorage.getItem("hrms-dev-role") || "").trim();
      const headers: Record<string, string> = {
        "x-dev-mode": "true",
        ...(roleOverride === "HR Admin" || roleOverride === "HR Executive" || roleOverride === "Employee"
          ? { "x-dev-role": roleOverride }
          : { "x-dev-role": "HR Admin" }),
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return headers;
    }

    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }

    throw new Error("No active session");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadComplianceData() {
      try {
        setLoading(true);
        setError(null);

        const headers = await authHeaders();
        const month = parseMonth(filters?.month);
        const year = parseYear(filters?.year);
        const query = new URLSearchParams();
        if (month) query.set("month", String(month));
        if (year) query.set("year", String(year));
        const suffix = query.toString() ? `?${query.toString()}` : "";

        const [pfSummaryRes, payrollRes] = await Promise.all([
          fetch(`/api/hrms/v2/pf/summary${suffix}`, { headers }),
          fetch(`/api/hrms/v2/payroll/reports${suffix}`, { headers }),
        ]);

        const pfBody = await pfSummaryRes.json();
        const payrollBody = await payrollRes.json();

        if (!pfSummaryRes.ok) throw new Error(pfBody?.error || "Failed to load PF summary");
        if (!payrollRes.ok) throw new Error(payrollBody?.error || "Failed to load payroll report");

        if (!cancelled) {
          setPfSummary((pfBody?.data || null) as PFSummaryPayload | null);
          setRuns((payrollBody?.data?.runs || []) as PayrollRun[]);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load compliance data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadComplianceData();
    return () => {
      cancelled = true;
    };
  }, [filters?.month, filters?.year]);

  const runStatusByPeriod = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of runs) {
      const key = `${run.period_year}-${String(run.period_month).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, String(run.status || "unknown").toLowerCase());
    }
    return map;
  }, [runs]);

  const completedRunCount = useMemo(() => {
    return runs.filter((run) => {
      const status = String(run.status || "").toLowerCase();
      return status === "finalized" || status === "paid";
    }).length;
  }, [runs]);

  const pendingRunCount = Math.max(0, runs.length - completedRunCount);
  const filingPercent = runs.length > 0 ? (completedRunCount / runs.length) * 100 : 0;
  const pfCoveragePercent = Number(pfSummary?.coverage?.pf_coverage_percent || 0);
  const compliancePercent = Math.round((filingPercent + pfCoveragePercent) / 2);

  const periodRows = (pfSummary?.byPeriod || []).slice(0, 8);

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Compliance & PF Reports
              </h1>
              <p className="text-slate-600 mt-1">
                Statutory compliance, PF filings, and regulatory tracking
              </p>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onChange={setFilters} />

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* KPI Cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Compliance Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="PF Contribution"
                  value={loading ? "..." : formatINR(pfSummary?.totals?.total_contribution || 0)}
                  icon={Shield}
                  color="blue"
                />
                <KPICard
                  label="Tax Filings"
                  value={loading ? "..." : `${completedRunCount}/${Math.max(runs.length, 1)}`}
                  icon={CheckCircle2}
                  color="green"
                />
                <KPICard
                  label="Pending Filings"
                  value={loading ? "..." : pendingRunCount}
                  icon={AlertCircle}
                  color="red"
                />
                <KPICard
                  label="Compliance %"
                  value={loading ? "..." : `${compliancePercent}%`}
                  icon={Shield}
                  color="emerald"
                />
              </div>
            </div>

            {/* Compliance Calendar */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Compliance Calendar
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: "PF Contribution",
                    dueDate: "15th of each month",
                    status: pendingRunCount === 0 ? "On Track" : "Due Soon",
                    icon: CheckCircle2,
                  },
                  {
                    name: "Income Tax (TDS)",
                    dueDate: "7th of next month",
                    status: pendingRunCount === 0 ? "On Track" : "Due Soon",
                    icon: CheckCircle2,
                  },
                  {
                    name: "ESI Contribution",
                    dueDate: "21st of each month",
                    status: "On Track",
                    icon: CheckCircle2,
                  },
                  {
                    name: "Professional Tax",
                    dueDate: "End of month",
                    status: "Due Soon",
                    icon: Clock,
                  },
                  {
                    name: "LTA Return",
                    dueDate: "30 June",
                    status: pendingRunCount > 0 ? "Pending" : "On Track",
                    icon: AlertCircle,
                  },
                ].map((comp, idx) => {
                  const Icon = comp.icon;
                  const statusColor =
                    comp.status === "On Track"
                      ? "bg-emerald-50 text-emerald-700"
                      : comp.status === "Due Soon"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700";

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={
                            comp.status === "On Track"
                              ? "text-emerald-600"
                              : comp.status === "Due Soon"
                              ? "text-amber-600"
                              : "text-red-600"
                          }
                          size={20}
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {comp.name}
                          </p>
                          <p className="text-xs text-slate-600">{comp.dueDate}</p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                      >
                        {comp.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PF Register */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                PF Register Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Month
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Employee Contribution
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Employer Contribution
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((row) => {
                      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
                      const statusRaw = runStatusByPeriod.get(key) || "unknown";
                      const status = statusRaw === "paid" || statusRaw === "finalized"
                        ? "Filed"
                        : statusRaw === "processing"
                        ? "Submitted"
                        : "Pending";
                      return (
                      <tr
                        key={key}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {monthName(row.month)} {row.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatINR(row.employee_contribution)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatINR(row.employer_contribution)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {formatINR(row.total_contribution)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              status === "Filed"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "Submitted"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                    })}
                    {!loading && periodRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          No PF ledger periods found for selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  Documents Compliant
                </p>
                <p className="text-3xl font-bold text-emerald-700">
                  {loading
                    ? "..."
                    : `${pfSummary?.coverage?.pf_applicable_employees || 0}/${pfSummary?.coverage?.payroll_employees || 0}`}
                </p>
                <p className="text-xs text-emerald-600 mt-3">
                  ✓ PF applicability mapped for active payroll employees
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Government Returns
                </p>
                <p className="text-3xl font-bold text-blue-700">{loading ? "..." : `${completedRunCount}/${Math.max(runs.length, 1)}`}</p>
                <p className="text-xs text-blue-600 mt-3">
                  Payroll cycles finalized/paid
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Audit Ready
                </p>
                <p className="text-3xl font-bold text-amber-700">{loading ? "..." : `${compliancePercent}%`}</p>
                <p className="text-xs text-amber-600 mt-3">
                  Based on PF coverage and filing completion
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Bar */}
        <ExportBar
          reportName="Compliance Report"
          onExportCSV={() => alert("Export CSV - Coming soon")}
          onExportExcel={() => alert("Export Excel - Coming soon")}
          onExportPDF={() => alert("Export PDF - Coming soon")}
        />
      </div>
    </div>
  );
}
