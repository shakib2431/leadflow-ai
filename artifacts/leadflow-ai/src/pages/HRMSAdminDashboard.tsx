

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
  primary:   "#4F46E5",
  primaryLt: "#EEF0FF",
  emerald:   "#059669",
  emeraldLt: "#E7F8F1",
  amber:     "#F59E0B",
  amberLt:   "#FEF6E7",
  rose:      "#F43F5E",
  roseLt:    "#FEEEF1",
  blue:      "#2563EB",
  blueLt:    "#EAF1FE",
  violet:    "#7C3AED",
  violetLt:  "#F2EDFE",
  border:    "#E9ECF5",
  pageBg:    "#F5F6FB",
  text:      "#0F172A",
  textSec:   "#475569",
  textMute:  "#64748B",
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

  // ── Derived analytics (all real data) ──
  const maxStage = Math.max(1, ...pipelineStages.map((s) => s.count));
  const totalWorkforce = stats.activeEmployees + stats.onboardingEmployees + stats.totalCandidates;
  const composition = [
    { label: "Active Employees", value: stats.activeEmployees,     color: C.emerald },
    { label: "In Onboarding",    value: stats.onboardingEmployees, color: C.violet },
    { label: "In Pipeline",      value: stats.totalCandidates,     color: C.amber },
  ];
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const offerAcceptRate = pct(stats.candidateHired, stats.candidateOffered + stats.candidateHired);
  const pipelineConversion = pct(stats.candidateHired, stats.totalCandidates);

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
    background: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 2px rgba(16,24,40,0.03), 0 12px 30px rgba(16,24,40,0.05)",
  };

  return (
    <>
      <HRMSMainNav />
      <div className="flex h-screen overflow-hidden w-full">
        <HRMSSidebarNav />
        <main className="hrms-enterprise flex-1 min-w-0 overflow-y-auto" style={{ background: "linear-gradient(180deg, #F7F8FC 0%, #F1F2F9 100%)" }}>
          <div className="w-full px-4 py-6 md:px-8 md:py-7">
            <div className="w-full hrms-main-with-nav" style={{ fontFamily: "'Inter', sans-serif", gap: 18 }}>

              {/* ── Hero header ── */}
              <div
                className="hrms-animate-in"
                style={{
                  position: "relative", overflow: "hidden", borderRadius: 22,
                  border: `1px solid ${C.border}`,
                  background: "linear-gradient(115deg, #ffffff 0%, #f3f2ff 42%, #e9f0ff 100%)",
                  boxShadow: "0 14px 40px rgba(79,70,229,0.09)",
                  padding: "26px 28px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  flexWrap: "wrap", gap: 18,
                }}
              >
                {/* decorative glows */}
                <div style={{ position: "absolute", top: -90, right: 90, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 68%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -130, right: -70, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 58, height: 58, borderRadius: 17, background: "linear-gradient(135deg, #6366F1, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(79,70,229,0.35)", flexShrink: 0 }}>
                    <Sparkles size={27} color="#fff" />
                  </div>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px", borderRadius: 20, background: "rgba(79,70,229,0.10)", color: C.primary, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                      HR Command Center
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: "9px 0 0", letterSpacing: "-0.03em" }}>
                      {greeting}, Admin
                    </h1>
                    <p style={{ fontSize: 13, color: C.textSec, marginTop: 5 }}>
                      {today} · {loading ? "Loading workforce overview…" : (
                        <>You have <span style={{ color: C.rose, fontWeight: 700 }}>{totalPending} pending action{totalPending !== 1 ? "s" : ""}</span> waiting today.</>
                      )}
                    </p>
                  </div>
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
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.85)", color: C.textSec, fontSize: 12, fontWeight: 600, cursor: loading ? "default" : "pointer", boxShadow: "0 2px 6px rgba(16,24,40,0.05)" }}
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
                    <div key={k.label} className="hrms-card-hover" style={{ ...cardStyle, padding: 22, position: "relative", overflow: "hidden" }}>
                      {/* soft accent corner glow */}
                      <div style={{ position: "absolute", top: -34, right: -34, width: 118, height: 118, borderRadius: "50%", background: `radial-gradient(circle, ${k.accent}22, transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: 3 }}>{k.label}</span>
                        <div style={{ width: 42, height: 42, borderRadius: 13, background: `${k.accent}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={19} color={k.accent} />
                        </div>
                      </div>
                      <div style={{ position: "relative", fontSize: 38, fontWeight: 800, color: C.text, lineHeight: 1, marginTop: 18, letterSpacing: "-0.03em" }}>{k.value}</div>
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: k.accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: C.textMute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.sub}</span>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* ── Composition + Recruitment Health ── */}
              <div className="hrms-feature-grid hrms-animate-in" style={{ animationDelay: "120ms" }}>
                {/* Workforce composition donut */}
                <section style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Workforce Composition</h2>
                  <p style={{ fontSize: 12.5, color: C.textMute, margin: "3px 0 20px" }}>Live headcount across every stage</p>
                  <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", width: 176, height: 176, flexShrink: 0, margin: "0 auto" }}>
                      <Donut segments={composition} size={176} thickness={22} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1 }}>{loading ? "—" : totalWorkforce}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 5 }}>Total People</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 15 }}>
                      {composition.map((c) => (
                        <div key={c.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: C.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{loading ? "—" : c.value}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMute, minWidth: 34, textAlign: "right" }}>{loading ? "" : `${pct(c.value, totalWorkforce)}%`}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Recruitment health rings */}
                <section style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Recruitment Health</h2>
                  <p style={{ fontSize: 12.5, color: C.textMute, margin: "3px 0 22px" }}>Conversion through your funnel</p>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "space-around", alignItems: "center" }}>
                    <Ring value={offerAcceptRate} color={C.primary} label="Offer Acceptance" loading={loading} />
                    <Ring value={pipelineConversion} color={C.emerald} label="Pipeline → Hire" loading={loading} />
                  </div>
                </section>
              </div>

              {/* ── Hiring Pipeline (funnel) ── */}
              <section className="hrms-animate-in" style={{ ...cardStyle, padding: 24, animationDelay: "150ms" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Hiring-to-Activation Pipeline</h2>
                    <p style={{ fontSize: 12.5, color: C.textMute, marginTop: 3 }}>From first application to active employee</p>
                  </div>
                  <Link to="/team/recruitment" className="hrms-pill-btn" style={{ fontSize: 12.5, color: C.primary, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.pageBg }}>
                    Open Recruitment <ChevronRight size={14} />
                  </Link>
                </div>

                {/* proportional funnel bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 18 }}>
                  {pipelineStages.map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ width: 92, flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.03em" }}>{s.label}</span>
                      <div style={{ flex: 1, height: 30, borderRadius: 8, background: C.pageBg, overflow: "hidden", position: "relative" }}>
                        <div className="hrms-funnel-bar" style={{ height: "100%", width: loading ? "0%" : `${s.count > 0 ? Math.max(8, (s.count / maxStage) * 100) : 0}%`, borderRadius: 8, background: grad(s.color) }} />
                      </div>
                      <span style={{ width: 34, flexShrink: 0, textAlign: "right", fontSize: 15, fontWeight: 800, color: C.text }}>{loading ? "—" : s.count}</span>
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
                    <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `1px solid ${C.emerald}33`, background: C.emeraldLt, padding: 32, textAlign: "center" }}>
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

// ─── Donut chart (multi-segment SVG) ─────────────────────────────────────────
function Donut({ segments, size, thickness }: { segments: { value: number; color: string }[]; size: number; thickness: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF0F7" strokeWidth={thickness} />
      {total > 0 && segments.map((seg, i) => {
        const len = (seg.value / total) * circ;
        const el = (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

// ─── Progress ring (single-value SVG) ────────────────────────────────────────
function Ring({ value, color, label, loading }: { value: number; color: string; label: string; loading?: boolean }) {
  const size = 118, thickness = 11;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const pctVal = Math.min(100, Math.max(0, value));
  const len = (pctVal / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF0F7" strokeWidth={thickness} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={`${len} ${circ - len}`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#111827" }}>
          {loading ? "—" : `${pctVal}%`}
        </div>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6B7280" }}>{label}</span>
    </div>
  );
}
