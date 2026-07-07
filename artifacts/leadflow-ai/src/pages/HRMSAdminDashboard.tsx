

import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowRight, Briefcase, CheckCircle2, Clock, DollarSign,
  FileText, LogOut, TrendingUp, UserCheck, Users, UserPlus,
  Activity, ChevronRight, CalendarCheck, PlayCircle, Settings,
} from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSMainNav from "@/components/hrms/hrms-main-nav";

// ─── Palette (matches approved light-theme mockup) ────────────────────────────
const C = {
  card:      "#FFFFFF",
  primary:   "#5B4CF5",
  primaryLt: "#EEF2FF",
  emerald:   "#10B981",
  emeraldLt: "#ECFDF5",
  amber:     "#F59E0B",
  amberLt:   "#FFFBEB",
  rose:      "#EF4444",
  roseLt:    "#FFF1F2",
  blue:      "#3B82F6",
  blueLt:    "#EFF6FF",
  violet:    "#8B5CF6",
  violetLt:  "#F5F3FF",
  border:    "#E8ECF4",
  pageBg:    "#F4F6FB",
  text:      "#111827",
  textSec:   "#6B7280",
  textMute:  "#9CA3AF",
};

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

      const { data: candidates } = await supabase.from("candidates").select("id,stage,created_at");
      const allCandidates = candidates || [];

      const pendingLeave = leaveData.data?.length || 0;
      const pendingAtt = attData.data?.length || 0;
      const preOnboardQueue = onboardData.data?.length || 0;
      const pendingPay = payrollData.data?.length || 0;
      const pendingExit = exitData.data?.length || 0;
      const activeEmps = activeEmpData.data?.length || 0;
      const onboardingEmps = onboardingEmpData.data?.length || 0;

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
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const totalPending = tasks.reduce((sum, t) => sum + t.count, 0);
  const V = (n: number) => (loading ? "—" : String(n));

  // ── KPI cards (real data) ──
  const kpis = [
    { label: "Active Employees", value: V(stats.activeEmployees),    sub: "Currently on payroll",    subColor: C.emerald, accent: C.emerald, icon: Users },
    { label: "In Onboarding",    value: V(stats.onboardingEmployees), sub: "Being activated",         subColor: C.violet,  accent: C.violet,  icon: UserCheck },
    { label: "Open Pipeline",    value: V(stats.totalCandidates),     sub: "Candidates in process",   subColor: C.amber,   accent: C.amber,   icon: Briefcase },
    { label: "Offer Accepted",   value: V(stats.candidateHired),      sub: "This cycle",              subColor: C.emerald, accent: C.primary, icon: CheckCircle2 },
    { label: "Pending Actions",  value: V(totalPending),              sub: "Requires attention",      subColor: C.rose,    accent: C.rose,    icon: AlertCircle },
    { label: "Offered",          value: V(stats.candidateOffered),    sub: "Awaiting response",       subColor: C.blue,    accent: C.blue,    icon: TrendingUp },
  ];

  // ── Hiring pipeline (real data) ──
  const pipelineStages = [
    { label: "Applied",      count: stats.candidateApplied,       color: C.blue,    bg: C.blueLt },
    { label: "Interviewing", count: stats.candidateInterviewing,  color: C.violet,  bg: C.violetLt },
    { label: "Offered",      count: stats.candidateOffered,       color: C.primary, bg: C.primaryLt },
    { label: "Accepted",     count: stats.candidateHired,         color: C.amber,   bg: C.amberLt },
    { label: "Onboarding",   count: stats.onboardingEmployees,    color: C.emerald, bg: C.emeraldLt },
    { label: "Active",       count: stats.activeEmployees,        color: "#059669", bg: "#D1FAE5" },
  ];

  const quickActions = [
    { label: "Add Candidate",     href: "/team/recruitment",     icon: UserPlus,     color: C.primary, bg: C.primaryLt },
    { label: "Employee Directory",href: "/team/employees",       icon: Users,        color: C.emerald, bg: C.emeraldLt },
    { label: "Process Payroll",   href: "/team/payroll",         icon: DollarSign,   color: "#059669", bg: "#D1FAE5" },
    { label: "Attendance",        href: "/team/attendance",      icon: Activity,     color: C.blue,    bg: C.blueLt },
    { label: "Leave Management",  href: "/team/leave",           icon: Clock,        color: C.amber,   bg: C.amberLt },
    { label: "Reports",           href: "/hrms/v2/reports",      icon: TrendingUp,   color: C.violet,  bg: C.violetLt },
    { label: "Organization",      href: "/hrms/v2/organization", icon: Briefcase,    color: C.textSec, bg: "#F3F4F6" },
    { label: "Templates",         href: "/hrms/v2/templates",    icon: FileText,     color: C.rose,    bg: C.roseLt },
  ];

  const taskColor = (u: PendingTask["urgency"]) =>
    u === "high" ? { c: C.rose, bg: C.roseLt } : u === "medium" ? { c: C.amber, bg: C.amberLt } : { c: C.emerald, bg: C.emeraldLt };

  const cardStyle: React.CSSProperties = {
    background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };

  return (
    <>
      <HRMSMainNav />
      <div className="flex h-screen overflow-hidden">
        <HRMSSidebarNav />
        <main className="hrms-enterprise flex-1 overflow-y-auto" style={{ background: C.pageBg }}>
          <div className="w-full px-4 py-6 md:px-8 md:py-6">
            <div className="w-full hrms-main-with-nav" style={{ fontFamily: "'Inter', sans-serif" }}>

              {/* ── Greeting ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>HR Command Center</h1>
                  <p style={{ fontSize: 13, color: C.textMute, marginTop: 2 }}>
                    {loading ? "Loading workforce overview…" : (
                      <>You have <span style={{ color: C.amber, fontWeight: 600 }}>{totalPending} pending action{totalPending !== 1 ? "s" : ""}</span> waiting today.</>
                    )}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge label={`● ${V(stats.activeEmployees)} Active`} color={C.emerald} bg={C.emeraldLt} />
                  <Badge label={`${V(stats.onboardingEmployees)} Onboarding`} color={C.primary} bg={C.primaryLt} />
                  <Badge label={`${V(totalPending)} Actions`} color={C.amber} bg={C.amberLt} />
                </div>
              </div>

              {/* ── KPI Row ── */}
              <section style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }} className="hrms-kpi-grid">
                {kpis.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} style={{ ...cardStyle, padding: "16px 18px", borderLeft: `3px solid ${k.accent}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: k.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={16} color={k.accent} />
                        </div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, marginTop: 8 }}>{k.value}</div>
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 500, color: k.subColor }}>{k.sub}</div>
                    </div>
                  );
                })}
              </section>

              {/* ── Hiring Pipeline ── */}
              <section style={{ ...cardStyle, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Hiring-to-Activation Pipeline</h2>
                    <p style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>From first application to active employee</p>
                  </div>
                  <Link to="/team/recruitment" style={{ fontSize: 12, color: C.primary, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    Open Recruitment <ChevronRight size={13} />
                  </Link>
                </div>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                  {pipelineStages.map((s, i) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: s.bg, border: `2px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18, fontWeight: 800, color: s.color }}>
                          {loading ? "—" : s.count}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: C.textMute, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                      </div>
                      {i < pipelineStages.length - 1 && (
                        <div style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                          <ArrowRight size={15} color={C.textMute} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "Recruitment Board", href: "/team/recruitment", icon: Briefcase },
                    { label: "Offer Management", href: "/team/offer-management", icon: FileText },
                    { label: "Pre-Onboarding", href: "/team/pre-onboarding", icon: UserCheck },
                    { label: "Activate Employees", href: "/team/onboarding", icon: UserPlus },
                  ].map((b) => {
                    const Icon = b.icon;
                    return (
                      <Link key={b.label} to={b.href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.pageBg, fontSize: 12, fontWeight: 500, color: C.textSec }}>
                        <Icon size={13} /> {b.label}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* ── Pending Approvals + Quick Actions ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }} className="hrms-lower-grid">

                {/* Pending Approvals */}
                <section style={{ ...cardStyle, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Pending Approvals</h2>
                      <p style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>Items awaiting your review and action</p>
                    </div>
                    {totalPending > 0 && <Badge label={`${totalPending} pending`} color={C.rose} bg={C.roseLt} />}
                  </div>

                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2, 3].map((i) => <div key={i} style={{ height: 60, borderRadius: 10, background: "#F1F5F9" }} className="animate-pulse" />)}
                    </div>
                  ) : totalPending === 0 ? (
                    <div style={{ borderRadius: 12, border: `1px solid ${C.emerald}33`, background: C.emeraldLt, padding: 28, textAlign: "center" }}>
                      <CheckCircle2 style={{ margin: "0 auto 8px" }} color={C.emerald} size={30} />
                      <p style={{ fontWeight: 600, color: "#065F46", margin: 0 }}>All caught up!</p>
                      <p style={{ fontSize: 12, color: C.emerald, marginTop: 4 }}>No pending approvals at this time.</p>
                    </div>
                  ) : (
                    <div>
                      {tasks.map((task, idx) => {
                        const tc = taskColor(task.urgency);
                        const Icon = task.icon;
                        return (
                          <Link key={task.type} href={task.href}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: idx < tasks.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 9, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <Icon size={16} className="" />
                                </div>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{task.label}</p>
                                  <p style={{ fontSize: 11, color: C.textMute, margin: 0 }}>
                                    {task.count === 0 ? "No pending items" : `${task.count} item${task.count !== 1 ? "s" : ""} pending`}
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ borderRadius: 20, padding: "2px 9px", fontSize: 12, fontWeight: 700, background: task.count > 0 ? tc.bg : "#F1F5F9", color: task.count > 0 ? tc.c : C.textSec }}>{task.count}</span>
                                <ChevronRight size={14} color={C.textMute} />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Quick Actions */}
                <section style={{ ...cardStyle, padding: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 14px" }}>Quick Actions</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {quickActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.label} href={a.href}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 8px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.pageBg, cursor: "pointer", textAlign: "center" }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon size={16} color={a.color} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{a.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Small badge helper ───────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
      {label}
    </span>
  );
}
