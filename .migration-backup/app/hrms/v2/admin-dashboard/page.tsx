"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowRight, Briefcase, CheckCircle2, Clock, DollarSign,
  FileText, LogOut, Plus, RefreshCw, TrendingUp, UserCheck, Users, UserPlus,
  Activity, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSMainNav from "@/app/hrms/v2/components/hrms-main-nav";

type PendingTask = {
  type: "leave" | "attendance" | "onboarding" | "payroll" | "exit" | "offer";
  count: number;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  urgency: "high" | "medium" | "low";
};

type DashStats = {
  activeEmployees: number;
  onboardingEmployees: number;
  totalCandidates: number;
  candidateApplied: number;
  candidateInterviewing: number;
  candidateOffered: number;
  candidateHired: number;
  pendingLeave: number;
  pendingAttendance: number;
  pendingPreOnboarding: number;
  pendingPayroll: number;
  pendingExit: number;
  pendingOffers: number;
};

export default function HRAdminDashboardPage() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashStats>({
    activeEmployees: 0, onboardingEmployees: 0, totalCandidates: 0,
    candidateApplied: 0, candidateInterviewing: 0, candidateOffered: 0, candidateHired: 0,
    pendingLeave: 0, pendingAttendance: 0, pendingPreOnboarding: 0,
    pendingPayroll: 0, pendingExit: 0, pendingOffers: 0,
  });
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" && !window.location.hostname.includes("prod") && {
        "x-dev-mode": "true",
        "x-dev-role": "HR Admin",
      }),
    };
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const [
        leaveRes, attRes, onboardRes, payrollRes, exitRes,
        activeEmpRes, onboardingEmpRes,
      ] = await Promise.all([
        fetch("/api/hrms/v2/leave/requests?status=pending", { headers: authHeaders() }),
        fetch("/api/hrms/v2/attendance/exceptions?status=pending", { headers: authHeaders() }),
        fetch("/api/hrms/v2/pre-onboarding/queue", { headers: authHeaders() }),
        fetch("/api/hrms/v2/payroll/runs?status=pending", { headers: authHeaders() }),
        fetch("/api/hrms/v2/exit-management", { headers: authHeaders() }),
        fetch("/api/hrms/v2/employees?status=active&pageSize=500", { headers: authHeaders() }),
        fetch("/api/hrms/v2/employees?status=onboarding&pageSize=500", { headers: authHeaders() }),
      ]);

      const leaveData = leaveRes.ok ? await leaveRes.json() : { data: [] };
      const attData = attRes.ok ? await attRes.json() : { data: [] };
      const onboardData = onboardRes.ok ? await onboardRes.json() : { data: [] };
      const payrollData = payrollRes.ok ? await payrollRes.json() : { data: [] };
      const exitData = exitRes.ok ? await exitRes.json() : { data: [] };
      const activeEmpData = activeEmpRes.ok ? await activeEmpRes.json() : { data: [] };
      const onboardingEmpData = onboardingEmpRes.ok ? await onboardingEmpRes.json() : { data: [] };

      // Fetch candidates from supabase
      const { data: candidates } = await supabase.from("candidates").select("id,stage,created_at");
      const allCandidates = candidates || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const pendingLeave = leaveData.data?.length || 0;
      const pendingAtt = attData.data?.length || 0;
      const preOnboardQueue = onboardData.data?.length || 0;
      const pendingPay = payrollData.data?.length || 0;
      const pendingExit = exitData.data?.length || 0;
      const activeEmps = activeEmpData.data?.length || 0;
      const onboardingEmps = onboardingEmpData.data?.length || 0;

      // New hires this month = active employees joined this month (approximate via created_at)
      const newThisMonth = (activeEmpData.data || []).filter((e: { created_at?: string }) =>
        e.created_at && e.created_at >= monthStart
      ).length;

      const totalPending = pendingLeave + pendingAtt + preOnboardQueue + pendingPay + pendingExit;

      setStats({
        activeEmployees: activeEmps,
        onboardingEmployees: onboardingEmps,
        totalCandidates: allCandidates.length,
        candidateApplied: allCandidates.filter((c) => !c.stage || c.stage === "Applied").length,
        candidateInterviewing: allCandidates.filter((c) => c.stage === "Interviewing").length,
        candidateOffered: allCandidates.filter((c) => c.stage === "Offered").length,
        candidateHired: allCandidates.filter((c) => c.stage === "Hired").length,
        pendingLeave,
        pendingAttendance: pendingAtt,
        pendingPreOnboarding: preOnboardQueue,
        pendingPayroll: pendingPay,
        pendingExit,
        pendingOffers: onboardingEmps,
      });

      setTasks([
        { type: "leave", count: pendingLeave, label: "Leave Requests", href: "/team/leave", icon: Clock, urgency: pendingLeave > 5 ? "high" : pendingLeave > 0 ? "medium" : "low" },
        { type: "attendance", count: pendingAtt, label: "Attendance Exceptions", href: "/team/attendance-exceptions", icon: AlertCircle, urgency: pendingAtt > 3 ? "high" : pendingAtt > 0 ? "medium" : "low" },
        { type: "onboarding", count: preOnboardQueue, label: "Pre-Onboarding Queue", href: "/team/pre-onboarding", icon: UserCheck, urgency: preOnboardQueue > 0 ? "medium" : "low" },
        { type: "offer", count: onboardingEmps, label: "Offer Management", href: "/team/offer-management", icon: FileText, urgency: onboardingEmps > 3 ? "high" : onboardingEmps > 0 ? "medium" : "low" },
        { type: "payroll", count: pendingPay, label: "Payroll Runs", href: "/team/payroll", icon: DollarSign, urgency: pendingPay > 0 ? "high" : "low" },
        { type: "exit", count: pendingExit, label: "Exit Management", href: "/team/exit", icon: LogOut, urgency: pendingExit > 0 ? "medium" : "low" },
      ]);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
      setRefreshedAt(new Date());
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const totalPending = tasks.reduce((sum, t) => sum + t.count, 0);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const pipelineStages = [
    { label: "Applied", count: stats.candidateApplied, color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
    { label: "Interviewing", count: stats.candidateInterviewing, color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
    { label: "Offered", count: stats.candidateOffered, color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
    { label: "Offer Accepted", count: stats.candidateHired, color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    { label: "Onboarding", count: stats.onboardingEmployees, color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    { label: "Active", count: stats.activeEmployees, color: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  ];

  const urgencyColors = {
    high: { bg: "bg-rose-50 border-rose-200", badge: "bg-rose-500 text-white", icon: "text-rose-600", dot: "bg-rose-500" },
    medium: { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-500 text-white", icon: "text-amber-600", dot: "bg-amber-500" },
    low: { bg: "bg-slate-50 border-slate-200", badge: "bg-emerald-500 text-white", icon: "text-slate-400", dot: "bg-emerald-400" },
  };

  const quickActions = [
    { label: "Add Candidate", href: "/team/recruitment", icon: UserPlus, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "Employee Directory", href: "/team/employees", icon: Users, color: "text-teal-600 bg-teal-50 border-teal-200" },
    { label: "Process Payroll", href: "/team/payroll", icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Attendance Report", href: "/team/attendance", icon: Activity, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Leave Management", href: "/team/leave", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Analytics & Reports", href: "/hrms/v2/reports", icon: TrendingUp, color: "text-violet-600 bg-violet-50 border-violet-200" },
    { label: "Organization Setup", href: "/hrms/v2/organization", icon: Briefcase, color: "text-slate-600 bg-slate-50 border-slate-200" },
    { label: "Templates", href: "/hrms/v2/templates", icon: FileText, color: "text-rose-600 bg-rose-50 border-rose-200" },
  ];

  return (
    <>
      <HRMSMainNav />
      <div className="flex h-screen overflow-hidden">
        <HRMSSidebarNav />
        <main className="hrms-enterprise flex-1 overflow-y-auto bg-slate-50/50">
          <div className="w-full px-4 py-6 md:px-8 md:py-8">
            <div className="w-full hrms-main-with-nav">

        {/* ── Header ── */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">HR Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time workforce overview</p>
        </div>

        {/* ── KPI Strip ── */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <article className="hrms-kpi-card hrms-kpi-1">
            <div className="hrms-kpi-icon"><Users size={16} /></div>
            <p className="hrms-section-label">Active Employees</p>
            <p className="hrms-kpi-value">{loading ? "—" : stats.activeEmployees}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-4">
            <div className="hrms-kpi-icon"><UserCheck size={16} /></div>
            <p className="hrms-section-label">In Onboarding</p>
            <p className="hrms-kpi-value">{loading ? "—" : stats.onboardingEmployees}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-2">
            <div className="hrms-kpi-icon"><Briefcase size={16} /></div>
            <p className="hrms-section-label">Open Pipeline</p>
            <p className="hrms-kpi-value">{loading ? "—" : stats.totalCandidates}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-5">
            <div className="hrms-kpi-icon"><CheckCircle2 size={16} /></div>
            <p className="hrms-section-label">Offer Accepted This Cycle</p>
            <p className="hrms-kpi-value">{loading ? "—" : stats.candidateHired}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-3">
            <div className="hrms-kpi-icon"><AlertCircle size={16} /></div>
            <p className="hrms-section-label">Pending Actions</p>
            <p className="hrms-kpi-value">{loading ? "—" : totalPending}</p>
          </article>
          <article className="hrms-kpi-card hrms-kpi-4">
            <div className="hrms-kpi-icon"><TrendingUp size={16} /></div>
            <p className="hrms-section-label">Offered</p>
            <p className="hrms-kpi-value">{loading ? "—" : stats.candidateOffered}</p>
          </article>
        </section>

        {/* ── Hiring Lifecycle Pipeline ── */}
        <section className="hrms-dashboard-shell">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hiring-to-Activation Pipeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">End-to-end journey: from first application to active employee</p>
            </div>
            <Link href="/team/recruitment" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition">
              Open Recruitment <ChevronRight size={13} />
            </Link>
          </div>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {pipelineStages.map((stage, idx) => (
              <div key={stage.label} className="flex items-center gap-2 min-w-0">
                <div className={`flex-shrink-0 min-w-[110px] rounded-xl border px-4 py-3 text-center ${stage.color}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{stage.label}</span>
                  </div>
                  <div className="text-2xl font-black">{loading ? "—" : stage.count}</div>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/team/recruitment" className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              <Briefcase size={12} /> Recruitment Board
            </Link>
            <Link href="/team/offer-management" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">
              <FileText size={12} /> Offer Management
            </Link>
            <Link href="/team/pre-onboarding" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
              <UserCheck size={12} /> Pre-Onboarding
            </Link>
            <Link href="/team/onboarding" className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition">
              <UserPlus size={12} /> Activate Employees
            </Link>
          </div>
        </section>

        {/* ── Pending Approvals + Quick Actions ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

          {/* Pending Approvals */}
          <section className="hrms-dashboard-shell">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pending Approvals</h2>
                <p className="text-xs text-slate-500 mt-0.5">Items awaiting your review and action</p>
              </div>
              {totalPending > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                  {totalPending} pending
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const uc = urgencyColors[task.urgency];
                  return (
                    <Link key={task.type} href={task.href}>
                      <div className={`flex items-center justify-between rounded-xl border p-4 hover:shadow-md transition cursor-pointer ${uc.bg}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${uc.bg}`}>
                            <task.icon size={16} className={uc.icon} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{task.label}</p>
                            <p className="text-xs text-slate-500">
                              {task.count === 0 ? "No pending items" : `${task.count} item${task.count !== 1 ? "s" : ""} pending`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${task.count > 0 ? uc.badge : "bg-slate-200 text-slate-600"}`}>
                            {task.count}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {!loading && totalPending === 0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={32} />
                <p className="font-semibold text-emerald-800">All caught up!</p>
                <p className="text-xs text-emerald-600 mt-1">No pending approvals at this time.</p>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="hrms-dashboard-shell flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Jump to any module instantly</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center hover:shadow-md transition cursor-pointer ${action.color}`}>
                    <action.icon size={20} />
                    <span className="text-xs font-semibold leading-tight">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── Lifecycle Flow Guide ── */}
        <section className="hrms-dashboard-shell">
          <h2 className="text-base font-bold text-slate-900 mb-4">Recruitment-to-Activation Flow</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { label: "Add Candidate", href: "/team/recruitment", color: "bg-slate-100 text-slate-700 border-slate-200" },
              { label: "Move to Offered", href: "/team/recruitment", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Hire & Create Employee", href: "/team/recruitment", color: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Send Offer Letter", href: "/team/offer-management", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
              { label: "Employee Signs", href: "/team/offer-management", color: "bg-violet-50 text-violet-700 border-violet-200" },
              { label: "Pre-Onboarding Form", href: "/team/pre-onboarding", color: "bg-pink-50 text-pink-700 border-pink-200" },
              { label: "HR Reviews", href: "/team/onboarding", color: "bg-orange-50 text-orange-700 border-orange-200" },
              { label: "Activate Employee", href: "/team/onboarding", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Employee Directory", href: "/team/employees", color: "bg-teal-50 text-teal-700 border-teal-200" },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <Link href={step.href}>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:shadow-sm transition ${step.color}`}>
                    <span className="text-[10px] font-black opacity-60">{idx + 1}</span>
                    {step.label}
                  </span>
                </Link>
                {idx < arr.length - 1 && <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </section>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
