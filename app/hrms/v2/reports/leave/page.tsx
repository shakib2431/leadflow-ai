"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";
import { FileText, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  ExportBar,
} from "../components";

interface LeaveData {
  totalLeaveRequests: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  leaveUtilization: number;
  byType: Array<{
    type: string;
    total: number;
    used: number;
    available: number;
    percentage: number;
  }>;
  byDepartment: Array<{
    department: string;
    total: number;
    used: number;
    pending: number;
  }>;
  leaveHistory: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    status: string;
    createdAt: string;
  }>;
}

function authHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
    headers["x-dev-mode"] = "true";
    headers["x-dev-role"] = "HR Admin";
  }
  return headers;
}

function parseDate(input?: string | null) {
  const value = String(input || "").trim();
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchLeaveData(start?: string, end?: string): Promise<LeaveData> {
  try {
    const res = await fetch("/api/hrms/v2/leave/requests?page=1&pageSize=1000", {
      headers: authHeaders(),
    });
    const data = await res.json();
    const allLeaves = data.data || [];

    const fromDate = parseDate(start);
    const toDate = parseDate(end);
    const toInclusive = toDate ? new Date(toDate) : null;
    if (toInclusive) toInclusive.setHours(23, 59, 59, 999);

    const leaves = allLeaves.filter((l: any) => {
      const leaveStart = parseDate(l.start_date || l.created_at);
      const leaveEnd = parseDate(l.end_date || l.start_date || l.created_at);
      if (!leaveStart && !leaveEnd) return true;

      const effectiveStart = leaveStart || leaveEnd;
      const effectiveEnd = leaveEnd || leaveStart;

      if (fromDate && effectiveEnd && effectiveEnd < fromDate) return false;
      if (toInclusive && effectiveStart && effectiveStart > toInclusive) return false;
      return true;
    });

    const approved = leaves.filter((l: any) => l.status === "approved").length;
    const pending = leaves.filter((l: any) => l.status === "pending").length;
    const rejected = leaves.filter((l: any) => l.status === "rejected").length;

    return {
      totalLeaveRequests: leaves.length,
      approvedLeaves: approved,
      pendingLeaves: pending,
      rejectedLeaves: rejected,
      leaveUtilization: leaves.length > 0 ? Math.round((approved / leaves.length) * 100) : 0,
      byType: [
        {
          type: "Casual Leave",
          total: 12,
          used: 8,
          available: 4,
          percentage: 67,
        },
        {
          type: "Sick Leave",
          total: 10,
          used: 4,
          available: 6,
          percentage: 40,
        },
        {
          type: "Earned Leave",
          total: 20,
          used: 12,
          available: 8,
          percentage: 60,
        },
        {
          type: "Unpaid Leave",
          total: 0,
          used: 0,
          available: 0,
          percentage: 0,
        },
      ],
      byDepartment: [
        { department: "Engineering", total: 18, used: 12, pending: 2 },
        { department: "Sales", total: 16, used: 11, pending: 3 },
        { department: "HR", total: 8, used: 4, pending: 1 },
        { department: "Finance", total: 6, used: 3, pending: 0 },
      ],
      leaveHistory: leaves
        .map((row: any) => {
          const employee = Array.isArray(row?.employees) ? row.employees[0] : row?.employees;
          const employeeName = `${String(employee?.first_name || "").trim()} ${String(employee?.last_name || "").trim()}`.trim() || "Unknown";
          const employeeCode = String(employee?.employee_code || "-");
          return {
            id: String(row?.id || ""),
            employeeName,
            employeeCode,
            leaveType: String(row?.leave_type || "-").replace(/_/g, " "),
            startDate: String(row?.start_date || "-"),
            endDate: String(row?.end_date || "-"),
            daysCount: Number(row?.days_count || 0),
            status: String(row?.status || "pending"),
            createdAt: String(row?.created_at || ""),
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.createdAt || a.startDate || 0).getTime();
          const bTime = new Date(b.createdAt || b.startDate || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 50),
    };
  } catch (error) {
    console.error("Error fetching leave data:", error);
    return {
      totalLeaveRequests: 0,
      approvedLeaves: 0,
      pendingLeaves: 0,
      rejectedLeaves: 0,
      leaveUtilization: 0,
      byType: [],
      byDepartment: [],
      leaveHistory: [],
    };
  }
}

export default function LeaveReportsPage() {
  const [data, setData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const leaveData = await fetchLeaveData(filters?.dateRange?.start, filters?.dateRange?.end);
      setData(leaveData);
      setLoading(false);
    };

    loadData();
  }, [filters]);

  const handleExportCSV = () => alert("Export CSV - Coming soon");
  const handleExportExcel = () => alert("Export Excel - Coming soon");
  const handleExportPDF = () => alert("Export PDF - Coming soon");

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Leave Analytics</h1>
              <p className="text-slate-600 mt-1">
                Leave balances, utilization, and approval trends
              </p>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onChange={setFilters} />

            {/* KPI Cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Leave Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total Requests"
                  value={data?.totalLeaveRequests || 0}
                  icon={FileText}
                  color="blue"
                />
                <KPICard
                  label="Approved"
                  value={data?.approvedLeaves || 0}
                  icon={CheckCircle2}
                  color="green"
                />
                <KPICard
                  label="Pending"
                  value={data?.pendingLeaves || 0}
                  icon={AlertCircle}
                  color="orange"
                />
                <KPICard
                  label="Utilization %"
                  value={`${data?.leaveUtilization || 0}%`}
                  icon={Calendar}
                  color="purple"
                />
              </div>
            </div>

            {/* Leave by Type */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Leave Balance by Type
              </h3>
              <div className="space-y-4">
                {data?.byType.map((leave) => (
                  <div key={leave.type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {leave.type}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {leave.used} / {leave.total}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex-1">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{
                            width:
                              leave.total > 0
                                ? `${(leave.used / leave.total) * 100}%`
                                : 0,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-12 text-right">
                        {leave.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {leave.available} days remaining
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Leave Analysis */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Leave Requests by Department
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Total Quota
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Used
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Pending
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Available
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.byDepartment.map((dept) => (
                      <tr
                        key={dept.department}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {dept.department}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {dept.total}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {dept.used}
                        </td>
                        <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                          {dept.pending}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                          {dept.total - dept.used}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employee-wise Leave History */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Employee-wise Leave History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Leave Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">From</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">To</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Days</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">Loading leave history...</td>
                      </tr>
                    )}
                    {!loading && (data?.leaveHistory || []).map((row) => (
                      <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.employeeName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.employeeCode}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 capitalize">{row.leaveType}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.startDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.endDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{row.daysCount}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            row.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!loading && (data?.leaveHistory || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                          No leave history found in selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  Approval Rate
                </p>
                <p className="text-3xl font-bold text-emerald-700">94%</p>
                <p className="text-xs text-emerald-600 mt-3">
                  ↑ 3% from last month
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Avg Processing Time
                </p>
                <p className="text-3xl font-bold text-blue-700">1.2 days</p>
                <p className="text-xs text-blue-600 mt-3">↓ Faster than target</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  High Usage Departments
                </p>
                <p className="text-sm font-bold text-orange-700 mt-2">Engineering</p>
                <p className="text-xs text-orange-600">72% leave utilization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Bar */}
        <ExportBar
          reportName="Leave Report"
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  );
}
