

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { useHRMSRole } from "@/components/hrms/use-hrms-role";
import {
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  Gift,
} from "lucide-react";
import {
  KPICard,
  AIInsights,
  AIInsight,
  ExportBar,
} from "./components";
import { ReportCategories } from "./components/report-categories";

interface DashboardData {
  totalEmployees: number;
  newHires: number;
  newHireRate: number;
  attritionRate: number;
  attendancePercent: number;
  attendanceSampleSize: number;
  attendanceCoveragePercent: number;
  attendanceReliable: boolean;
  payrollCost: number;
  payrollAvailable: boolean;
  pendingApprovals: number;
  openRecruiments: number;
  employeesOnLeave: number;
  probationEmployees: number;
  upcomingBirthdays: number;
  birthdayDataAvailable: boolean;
  missingDobCount: number;
  upcomingConfirmations: number;
  contractExpiry: number;
  departmentStrength: Array<{ name: string; count: number; percentage: number }>;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatMonthYear(date: Date) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

async function getAuthHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Continue with dev-mode fallback below.
  }

  if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
    headers["x-dev-mode"] = "true";
    headers["x-dev-role"] = "HR Admin";
  }

  return headers;
}

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // Fetch multiple data sources in parallel using Supabase
    const [employeesRes, departmentsRes, attendanceRes, leaveRes, candidatesRes, payrollRunsRes] = await Promise.all([
      supabase.from("employees").select("*").limit(1000),
      supabase.from("departments").select("id, name").limit(1000),
      supabase.from("attendance_records").select("*").limit(5000),
      supabase.from("leave_requests").select("*").limit(1000),
      supabase.from("candidates").select("*").limit(1000),
      supabase
        .from("payroll_runs")
        .select("id, status, period_month, period_year")
        .in("status", ["finalized", "paid"])
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(1),
    ]);

    const employees = employeesRes.data || [];
    const departments = departmentsRes.data || [];
    const departmentNameById = new Map<string, string>(
      departments
        .filter((row: any) => row?.id && row?.name)
        .map((row: any) => [String(row.id), String(row.name).trim()])
    );

    // Process employee data
    const totalEmployees = employees.length;

    // Calculate new hires (joined in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newHires = employees.filter(
      (e: any) => e.created_at && new Date(e.created_at) > thirtyDaysAgo
    ).length;
    const newHireRate = totalEmployees > 0 ? Math.round((newHires / totalEmployees) * 100) : 0;

    // Attendance calculation - today's attendance
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendanceRes.data?.filter(
      (a: any) => a.date?.split("T")?.[0] === today
    ) || [];
    const presentCount = todayAttendance.filter((a: any) => a.status === "present").length;
    const attendancePercent =
      todayAttendance.length > 0
        ? Math.round((presentCount / todayAttendance.length) * 100)
        : 0;
    const attendanceCoveragePercent = totalEmployees > 0 ? Math.round((todayAttendance.length / totalEmployees) * 100) : 0;
    const minReliableSample = Math.max(3, Math.ceil(totalEmployees * 0.3));
    const attendanceReliable = todayAttendance.length >= minReliableSample;

    // Leave data - pending approvals
    const pendingLeave = leaveRes.data?.filter((l: any) => l.status === "pending").length || 0;

    // Employees on leave today
    const employeesOnLeaveToday = leaveRes.data?.filter((leave: any) => {
      if (leave.status !== "approved") return false;
      const startDate = leave.start_date?.split("T")?.[0];
      const endDate = leave.end_date?.split("T")?.[0];
      return startDate && endDate && startDate <= today && endDate >= today;
    }).length || 0;

    let payrollCost = 0;
    let payrollAvailable = false;
    const latestRun = (payrollRunsRes.data || [])[0] as any;
    if (latestRun?.id) {
      const lineRes = await supabase
        .from("payroll_line_items")
        .select("net_pay")
        .eq("payroll_run_id", latestRun.id)
        .limit(5000);

      if (!lineRes.error) {
        payrollCost = (lineRes.data || []).reduce((sum: number, row: any) => sum + Number(row?.net_pay || 0), 0);
        payrollAvailable = payrollCost > 0;
      }
    }

    // Recruitment data
    const openPositions =
      candidatesRes.data?.filter((c: any) => c.stage === "Applied" || c.stage === "Interviewing")
        .length || 0;

    // Probation employees
    const probationEmployees = employees.filter((e: any) => e.employment_status === "probation").length;

    const resignedEmployees = employees.filter((e: any) => {
      const status = String(e.status || e.employment_status || "").toLowerCase();
      return status === "resigned" || status === "terminated";
    }).length;
    const attritionRate = totalEmployees > 0 ? Number(((resignedEmployees / totalEmployees) * 100).toFixed(1)) : 0;

    const todayDate = new Date();
    const currentMonth = todayDate.getMonth();
    const upcomingBirthdays = employees.filter((e: any) => {
      const dob = e.date_of_birth || e.dob;
      if (!dob) return false;
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth;
    }).length;
    const birthdayDataAvailable = employees.some((e: any) => {
      const dob = e.date_of_birth || e.dob;
      if (!dob) return false;
      const d = new Date(dob);
      return !Number.isNaN(d.getTime());
    });
    const missingDobCount = employees.filter((e: any) => {
      const dob = e.date_of_birth || e.dob;
      if (!dob) return true;
      const d = new Date(dob);
      return Number.isNaN(d.getTime());
    }).length;

    const departmentMap = new Map<string, number>();
    for (const employee of employees) {
      const departmentId = String(employee.department_id || "").trim();
      const departmentRaw = String(employee.department_name || employee.department || "").trim();

      const fromDepartmentId = departmentId ? departmentNameById.get(departmentId) : undefined;
      const fromRawAsId = isUuidLike(departmentRaw) ? departmentNameById.get(departmentRaw) : undefined;
      const resolvedName = fromDepartmentId || fromRawAsId || departmentRaw || "Unassigned";
      const name = resolvedName.trim() || "Unassigned";
      departmentMap.set(name, (departmentMap.get(name) || 0) + 1);
    }
    const departmentStrength = Array.from(departmentMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEmployees,
      newHires,
      newHireRate,
      attritionRate,
      attendancePercent,
      attendanceSampleSize: todayAttendance.length,
      attendanceCoveragePercent,
      attendanceReliable,
      payrollCost,
      payrollAvailable,
      pendingApprovals: pendingLeave,
      openRecruiments: openPositions,
      employeesOnLeave: employeesOnLeaveToday,
      probationEmployees,
      upcomingBirthdays,
      birthdayDataAvailable,
      missingDobCount,
      upcomingConfirmations: probationEmployees,
      contractExpiry: 0,
      departmentStrength,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      totalEmployees: 0,
      newHires: 0,
      newHireRate: 0,
      attritionRate: 0,
      attendancePercent: 0,
      attendanceSampleSize: 0,
      attendanceCoveragePercent: 0,
      attendanceReliable: false,
      payrollCost: 0,
      payrollAvailable: false,
      pendingApprovals: 0,
      openRecruiments: 0,
      employeesOnLeave: 0,
      probationEmployees: 0,
      upcomingBirthdays: 0,
      birthdayDataAvailable: false,
      missingDobCount: 0,
      upcomingConfirmations: 0,
      contractExpiry: 0,
      departmentStrength: [],
    };
  }
}

function generateAIInsights(data: DashboardData): AIInsight[] {
  const insights: AIInsight[] = [];

  // Attendance insight
  if (data.attendanceSampleSize === 0) {
    insights.push({
      id: "att-0",
      type: "action",
      title: "Attendance Data Pending",
      description: "No attendance records captured for today yet. Insights will update after the first check-ins.",
      metric: "Waiting for check-ins",
    });
  } else if (!data.attendanceReliable) {
    insights.push({
      id: "att-cov-1",
      type: "action",
      title: "Attendance Snapshot Is Partial",
      description: `Only ${data.attendanceSampleSize} attendance record(s) captured today (${data.attendanceCoveragePercent ?? 0}% coverage).`,
      metric: `${data.attendancePercent}% provisional`,
    });
  } else if (data.attendancePercent < 80) {
    const gapToBenchmark = Math.max(0, 85 - data.attendancePercent);
    insights.push({
      id: "att-1",
      type: "alert",
      title: "Low Attendance Alert",
      description: `Current attendance is at ${data.attendancePercent}%. Below the 85% benchmark.`,
      metric: `${data.attendancePercent}%`,
      trend: -gapToBenchmark,
    });
  }

  // New hires insight
  if (data.newHires > 0) {
    insights.push({
      id: "hire-1",
      type: "observation",
      title: "New Talent Onboarded",
      description: `${data.newHires} new employee${data.newHires > 1 ? "s" : ""} joined in the last 30 days.`,
      metric: `${data.newHires} new hire${data.newHires > 1 ? "s" : ""}`,
    });
  }

  // Probation insights
  if (data.probationEmployees > 0) {
    insights.push({
      id: "prob-1",
      type: "action",
      title: "Probation Confirmations Pending",
      description: `${data.probationEmployees} employee${
        data.probationEmployees > 1 ? "s" : ""
      } completing probation this month.`,
      metric: `${data.probationEmployees} confirmation${data.probationEmployees > 1 ? "s" : ""}`,
    });
  }

  // Recruitment insight
  if (data.openRecruiments > 5) {
    insights.push({
      id: "rec-1",
      type: "observation",
      title: "Active Recruitment Pipeline",
      description: `${data.openRecruiments} candidates in active recruitment pipeline.`,
      metric: `${data.openRecruiments} candidates`,
      trend: 12,
    });
  }

  // Pending approvals
  if (data.pendingApprovals > 10) {
    insights.push({
      id: "app-1",
      type: "alert",
      title: "Pending Approvals",
      description: `${data.pendingApprovals} leave and other approvals pending HR review.`,
      metric: `${data.pendingApprovals} pending`,
    });
  }

  // Employees on leave
  if (data.employeesOnLeave > 0) {
    insights.push({
      id: "leave-1",
      type: "observation",
      title: "Leave Coverage Alert",
      description: `${data.employeesOnLeave} employee${data.employeesOnLeave > 1 ? "s" : ""} currently on leave.`,
      metric: `${data.employeesOnLeave} on leave`,
    });
  }

  if (!data.payrollAvailable) {
    insights.push({
      id: "payroll-0",
      type: "action",
      title: "Payroll Data Unavailable",
      description: "No finalized/paid payroll run data is available yet for monthly payroll insights.",
      metric: "Finalize payroll run",
    });
  }

  if (!data.birthdayDataAvailable) {
    insights.push({
      id: "bday-0",
      type: "action",
      title: "Birthday Data Missing",
      description: "Date-of-birth is missing on employee profiles. Open Employees, edit each employee profile, and fill the DOB field.",
      metric: `${data.missingDobCount} profile${data.missingDobCount === 1 ? "" : "s"} missing DOB`,
    });
  }

  return insights.slice(0, 4); // Return top 4 insights
}

export default function ExecutiveDashboard() {
  const { role, loading: roleLoading } = useHRMSRole();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const canViewReports = role === "HR Admin" || role === "HR Executive";

  const exportReport = async (format: "csv" | "excel" | "pdf", section: "summary" | "department" | "employees" = "summary") => {
    setExporting(true);
    try {
      const now = formatMonthYear(new Date());
      const params = new URLSearchParams({
        month: String(now.month),
        year: String(now.year),
        section,
        format: "csv",
      });

      const res = await fetch(`/api/hrms/v2/reports/export?${params.toString()}`, {
        headers: await getAuthHeaders(),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.error || "Failed to export report");
      }

      const blob = await res.blob();
      const filename = `executive-dashboard-${section}-${now.year}-${String(now.month).padStart(2, "0")}.csv`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      if (format !== "csv") {
        alert(`${format.toUpperCase()} export is queued for rollout. Downloaded CSV for now.`);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (roleLoading || !canViewReports) {
      setLoading(false);
      setData(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const dashboardData = await fetchDashboardData();
      setData(dashboardData);
      setLoading(false);
    };

    loadData();
  }, [roleLoading, canViewReports]);

  const insights = data ? generateAIInsights(data) : [];

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 ml-60">
        <HRMSTopHeader title="" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
          <div className="w-full px-8 py-8 space-y-8 box-border">
            <div className="w-full">
              <h1 className="text-3xl font-bold text-slate-900">Executive Dashboard</h1>
              <p className="text-slate-600 mt-1">Real-time HR analytics and insights for data-driven decisions</p>
            </div>

            {!roleLoading && !canViewReports ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-semibold text-amber-900">Access restricted</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Reporting Center is available only to HR Admin and HR Executive roles.
                </p>
              </div>
            ) : null}

            {canViewReports ? (
              <>
                {data && <AIInsights insights={insights} loading={loading} />}

                <div className="w-full">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Key Performance Indicators</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <KPICard
                      label="Total Employees"
                      value={data?.totalEmployees || 0}
                      icon={Users}
                      color="blue"
                      trend={{
                        value: data?.newHireRate || 0,
                        direction: "up",
                        label: "new this month",
                      }}
                    />
                    <KPICard
                      label="Attendance"
                      value={
                        !data || data.attendanceSampleSize === 0
                          ? "N/A"
                          : data.attendanceReliable
                          ? `${data.attendancePercent}%`
                          : `Partial (${data.attendanceSampleSize})`
                      }
                      icon={Calendar}
                      color="green"
                    />
                    <KPICard
                      label="Open Positions"
                      value={data?.openRecruiments || 0}
                      icon={Briefcase}
                      color="purple"
                    />
                    <KPICard
                      label="Pending Approvals"
                      value={data?.pendingApprovals || 0}
                      icon={AlertCircle}
                      color="orange"
                    />
                    <KPICard
                      label="Monthly Payroll (Latest Run)"
                      value={data?.payrollAvailable ? formatCurrency(data?.payrollCost || 0) : "N/A"}
                      icon={DollarSign}
                      color="slate"
                    />
                    <KPICard
                      label="On Leave Today"
                      value={data?.employeesOnLeave || 0}
                      icon={Clock}
                      color="red"
                    />
                    <KPICard
                      label="Probation Review"
                      value={data?.probationEmployees || 0}
                      icon={CheckCircle2}
                      color="blue"
                    />
                    <KPICard
                      label="Upcoming Birthdays (DOB)"
                      value={data?.birthdayDataAvailable ? (data?.upcomingBirthdays || 0) : "N/A"}
                      icon={Gift}
                      color="purple"
                    />
                  </div>
                </div>

                <div className="w-full space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Explore Reports</h2>
                    <ReportCategories showAll={true} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)] p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Department Strength</h3>
                      <div className="space-y-3">
                        {(data?.departmentStrength || []).map((dept) => {
                          return (
                            <div key={dept.name} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">{dept.name}</span>
                              <div className="flex-1 mx-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${dept.percentage}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-900 tabular-nums">{dept.percentage}%</span>
                            </div>
                          );
                        })}
                        {(data?.departmentStrength || []).length === 0 && (
                          <div className="text-sm text-slate-500">No department data available.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)] p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => exportReport("csv", "summary")}
                          disabled={exporting}
                          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200 disabled:opacity-50"
                        >
                          <p className="font-semibold text-slate-900 text-sm">Generate Monthly Report</p>
                          <p className="text-xs text-slate-600">Export complete workforce summary</p>
                        </button>
                        <button
                          onClick={() => exportReport("csv", "department")}
                          disabled={exporting}
                          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200 disabled:opacity-50"
                        >
                          <p className="font-semibold text-slate-900 text-sm">Schedule Reports</p>
                          <p className="text-xs text-slate-600">Download department-level export</p>
                        </button>
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = "/hrms/v2/reports/custom";
                            }
                          }}
                          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                        >
                          <p className="font-semibold text-slate-900 text-sm">Custom Report Builder</p>
                          <p className="text-xs text-slate-600">Create reports on-demand</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <ExportBar
                  reportName="Executive Dashboard"
                  loading={exporting}
                  onExportCSV={() => exportReport("csv", "summary")}
                  onExportExcel={() => exportReport("excel", "summary")}
                  onExportPDF={() => exportReport("pdf", "summary")}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
