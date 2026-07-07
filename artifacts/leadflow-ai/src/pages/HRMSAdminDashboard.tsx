

import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowRight, Briefcase, CheckCircle2, Clock, DollarSign,
  FileText, LogOut, TrendingUp, UserCheck, Users, UserPlus,
  Activity, ChevronRight, RefreshCw, Sparkles,
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

// gradient pair for icon chips / accents
const grad = (hex: string) => `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)`;

type PendingTask = {
  type: "leave" | "attendance" | "onboarding" | "payroll" | "exit" | "offer";
  count: number;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
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

  // greeting + date
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // ── KPI cards (real data) ──
  const kpis = [
    { label: "Active Employees", value: V(stats.activeEmployees),    sub: "Currently on payroll",  accent: C.emerald, icon: Users },
    { label: "In Onboarding",    value: V(stats.onboardingEmployees), sub: "Being activated",       accent: C.violet,  icon: UserCheck },
    { label: "Open Pipeline",    value: V(stats.totalCandidates),     sub: "Candidates in process", accent: C.amber,   icon: Briefcase },
    { label: "Offer Accepted",   value: V(stats.candidateHired),      sub: "This cycle",            accent: C.primary, icon: CheckCircle2 },
    { label: "Pending Actions",  value: V(totalPending),              sub: "Requires attention",    accent: C.rose,    icon: AlertCircle },
    { label: "Offered",          value: V(stats.candidateOffered),    sub: "Awaiting response",     accent: C.blue,    icon: TrendingUp },
  ];

  // ── Hiring pipeline (real data) ──
  const pipelineStages = [
    { label: "Applied",      count: stats.candidateApplied,       color: C.blue },
    { label: "Interviewing", count: stats.candidateInterviewing,  color: C.violet },
    { label: "Offered",      count: stats.candidateOffered,       color: C.primary },
    { label: "Accepted",     count: stats.candidateHired,         color: C.amber },
    { label: "Onboarding",   count: stats.onboardingEmployees,    color: C.emerald },
    { label: "Active",       count: stats.activeEmployees,        color: "#059669" },
  ];

  const quickActions = [
    { label: "Add Candidate",     href: "/team/recruitment",     icon: UserPlus,     color: C.primary },
    { label: "Employee Directory",href: "/team/employees",       icon: Users,        color: C.emerald },
    { label: "Process Payroll",   href: "/team/payroll",         icon: DollarSign,   color: "#059669" },
    { label: "Attendance",        href: "/team/attendance",      icon: Activity,     color: C.blue },
    { label: "Leave Management",  href: "/team/leave",           icon: Clock,        color: C.amber },
    { label: "Reports",           href: "/hrms/v2/reports",      icon: TrendingUp,   color: C.violet },
    { label: "Organization",      href: "/hrms/v2/organization", icon: Briefcase,    color: C.textSec },
    { label: "Templates",         href: "/hrms/v2/templates",    icon: FileText,     color: C.rose },
  ];

  const taskColor = (u: PendingTask["urgency"]) =>
    u === "high" ? { c: C.rose, bg: C.roseLt } : u === "medium" ? { c: C.amber, bg: C.amberLt } : { c: C.emerald, bg: C.emeraldLt };

  const cardStyle: React.CSSProperties = {
    background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.04)",
  };

  return (
    <>
      <HRMSMainNav />
      <div className="flex h-screen overflow-hidden">
        <HRMSSidebarNav />
        <main className="hrms-enterprise flex-1 overflow-y-auto" style={{ background: C.pageBg }}>
          <div className="w-full px-4 py-6 md:px-8 md:py-7">
            <div className="w-full hrms-main-with-nav" style={{ fontFamily: "'Inter', sans-serif", gap: 18 }}>

              {/* ── Hero header ── */}
              <div
                className="hrms-animate-in"
                style={{
                  position: "relative", overflow: "hidden", borderRadius: 20,
                  border: `1px solid ${C.border}`,
                  background: "linear-gradient(120deg, #ffffff 0%, #f6f5ff 46%, #eef2ff 100%)",
                  boxShadow: "0 10px 30px rgba(91,76,245,0.07)",
                  padding: "22px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  flexWrap: "wrap", gap: 16,
                }}
              >
                {/* decorative glow */}
                <div style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 68%)", pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(91,76,245,0.10)", color: C.primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <Sparkles size={12} /> HR Command Center
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: "10px 0 0", letterSpacing: "-0.02em" }}>
                    {greeting}, Admin
                  </h1>
                  <p style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
                    {today} · {loading ? "Loading workforce overview…" : (
                      <>You have <span style={{ color: C.rose, fontWeight: 700 }}>{totalPending} pending action{totalPending !== 1 ? "s" : ""}</span> waiting today.</>
                    )}
                  </p>
                </div>
                <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill label={`${V(stats.activeEmployees)} Active`} color={C.emerald} dot />
                  <Pill label={`${V(stats.onboardingEmployees)} Onboarding`} color={C.primary} dot />
                  <Pill label={`${V(totalPending)} Actions`} color={C.amber} dot />
                  <button
                    onClick={() => loadDashboard()}
                    disabled={loading}
                    className="hrms-icon-btn"
                    title="Refresh"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.7)", color: C.textSec, fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer" }}
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>
              </div>

              {/* ── KPI Row ── */}
              <section className="hrms-kpi-grid hrms-animate-in" style={{ animationDelay: "60ms" }}>
                {kpis.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="hrms-card-hover" style={{ ...cardStyle, padding: 18, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: grad(k.accent) }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 11, background: grad(k.accent), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 14px ${k.accent}33` }}>
                          <Icon size={19} color="#fff" />
                        </div>
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1, marginTop: 14, letterSpacing: "-0.02em" }}>{k.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 8 }}>{k.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.textMute, marginTop: 2 }}>{k.sub}</div>
                    </div>
                  );
                })}
              </section>

              {/* ── Hiring Pipeline ── */}
              <section className="hrms-animate-in" style={{ ...cardStyle, padding: 24, animationDelay: "120ms" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Hiring-to-Activation Pipeline</h2>
                    <p style={{ fontSize: 12.5, color: C.textMute, marginTop: 3 }}>From first application to active employee</p>
                  </div>
                  <Link to="/team/recruitment" className="hrms-pill-btn" style={{ fontSize: 12.5, color: C.primary, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.pageBg }}>
                    Open Recruitment <ChevronRight size={14} />
                  </Link>
                </div>

                {/* rail */}
                <div style={{ position: "relative", display: "flex", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ position: "absolute", top: 29, left: "8%", right: "8%", height: 3, borderRadius: 3, background: "linear-gradient(90deg,#3B82F6,#8B5CF6,#5B4CF5,#F59E0B,#10B981,#059669)", opacity: 0.35, zIndex: 0 }} />
                  {pipelineStages.map((s) => (
                    <div key={s.label} style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 1 }}>
                      <div className="hrms-pipe-node" style={{ width: 58, height: 58, borderRadius: "50%", background: "#fff", border: `2.5px solid ${s.color}`, boxShadow: `0 6px 16px ${s.color}2e`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20, fontWeight: 800, color: s.color }}>
                        {loading ? "—" : s.count}
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Recruitment Board", href: "/team/recruitment", icon: Briefcase },
                    { label: "Offer Management", href: "/team/offer-management", icon: FileText },
                    { label: "Pre-Onboarding", href: "/team/pre-onboarding", icon: UserCheck },
                    { label: "Activate Employees", href: "/team/onboarding", icon: UserPlus },
                  ].map((b) => {
                    const Icon = b.icon;
                    return (
                      <Link key={b.label} to={b.href} className="hrms-pill-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.pageBg, fontSize: 12.5, fontWeight: 600, color: C.textSec }}>
                        <Icon size={14} /> {b.label}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* ── Pending Approvals + Quick Actions ── */}
              <div className="hrms-lower-grid hrms-animate-in" style={{ animationDelay: "180ms" }}>

                {/* Pending Approvals */}
                <section style={{ ...cardStyle, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Pending Approvals</h2>
                      <p style={{ fontSize: 12.5, color: C.textMute, marginTop: 3 }}>Items awaiting your review and action</p>
                    </div>
                    {totalPending > 0 && <Pill label={`${totalPending} pending`} color={C.rose} />}
                  </div>

                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2, 3].map((i) => <div key={i} style={{ height: 62, borderRadius: 12, background: "#F1F5F9" }} className="animate-pulse" />)}
                    </div>
                  ) : totalPending === 0 ? (
                    <div style={{ borderRadius: 14, border: `1px solid ${C.emerald}33`, background: C.emeraldLt, padding: 32, textAlign: "center" }}>
                      <CheckCircle2 style={{ margin: "0 auto 8px" }} color={C.emerald} size={32} />
                      <p style={{ fontWeight: 700, color: "#065F46", margin: 0 }}>All caught up!</p>
                      <p style={{ fontSize: 12.5, color: C.emerald, marginTop: 4 }}>No pending approvals at this time.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {tasks.map((task) => {
                        const tc = taskColor(task.urgency);
                        const Icon = task.icon;
                        return (
                          <Link key={task.type} href={task.href}>
                            <div className="hrms-approval-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", ["--row-accent" as string]: tc.c }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 11, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <Icon size={18} color={tc.c} />
                                </div>
                                <div>
                                  <p style={{ fontSize: 13.5, fontWeight: 600, color: C.text, margin: 0 }}>{task.label}</p>
                                  <p style={{ fontSize: 11.5, color: C.textMute, margin: 0 }}>
                                    {task.count === 0 ? "No pending items" : `${task.count} item${task.count !== 1 ? "s" : ""} pending`}
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ borderRadius: 20, padding: "3px 11px", fontSize: 12.5, fontWeight: 800, background: task.count > 0 ? tc.bg : "#F1F5F9", color: task.count > 0 ? tc.c : C.textSec, minWidth: 26, textAlign: "center" }}>{task.count}</span>
                                <ChevronRight size={15} color={C.textMute} />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Quick Actions */}
                <section style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Quick Actions</h2>
                  <p style={{ fontSize: 12.5, color: C.textMute, margin: "0 0 16px" }}>Jump to any module instantly</p>
                  <div className="hrms-quick-grid">
                    {quickActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.label} href={a.href}>
                          <div className="hrms-quick-action" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "16px 8px", borderRadius: 13, border: `1px solid ${C.border}`, background: C.pageBg, cursor: "pointer", textAlign: "center" }}>
                            <div style={{ width: 38, height: 38, borderRadius: 11, background: grad(a.color), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 5px 12px ${a.color}30` }}>
                              <Icon size={17} color="#fff" />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{a.label}</span>
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

// ─── Pill helper ──────────────────────────────────────────────────────────────
function Pill({ label, color, dot }: { label: string; color: string; dot?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.75)", border: `1px solid ${color}33`, color, fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 20 }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />}
      {label}
    </span>
  );
}
