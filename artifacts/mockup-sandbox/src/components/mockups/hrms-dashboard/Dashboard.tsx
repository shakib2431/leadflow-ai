import {
  LayoutDashboard, Users, Briefcase, ClipboardCheck, Clock, Calendar,
  DollarSign, BarChart2, Settings, Bell, Search, ChevronDown,
  TrendingUp, TrendingDown, ArrowUpRight, Plus, Download,
  UserCheck, AlertCircle, CheckCircle2, Circle, ArrowRight,
  UserPlus, FileText, CalendarCheck, PlayCircle
} from "lucide-react";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  pageBg:   "#F4F6FB",
  sidebar:  "#FFFFFF",
  card:     "#FFFFFF",
  primary:  "#5B4CF5",
  primaryLt:"#EEF2FF",
  emerald:  "#10B981",
  emeraldLt:"#ECFDF5",
  amber:    "#F59E0B",
  amberLt:  "#FFFBEB",
  rose:     "#EF4444",
  roseLt:   "#FFF1F2",
  blue:     "#3B82F6",
  blueLt:   "#EFF6FF",
  border:   "#E8ECF4",
  text:     "#111827",
  textSec:  "#6B7280",
  textMute: "#9CA3AF",
};

// ─── Tiny helpers ────────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 20 }}>
      {label}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, accent, icon: Icon }:
  { label: string; value: string; sub: string; subColor: string; accent: string; icon: any }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: "18px 20px", flex: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMute, textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={accent} />
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: subColor }}>{sub}</div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar() {
  const sections = [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", active: true },
      ]
    },
    {
      title: "WORKFORCE",
      items: [
        { icon: Users,         label: "Employees" },
        { icon: Briefcase,     label: "Recruitment" },
        { icon: ClipboardCheck,label: "Onboarding" },
        { icon: Clock,         label: "Attendance" },
        { icon: Calendar,      label: "Leave" },
        { icon: DollarSign,    label: "Payroll" },
      ]
    },
    {
      title: "ANALYTICS",
      items: [
        { icon: BarChart2,  label: "Reports" },
        { icon: Settings,   label: "Settings" },
      ]
    },
  ];

  return (
    <div style={{ width: 220, background: C.sidebar, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0, height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primary,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>L</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>LeadFlow</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.primary, letterSpacing: "0.08em" }}>HRMS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
        {sections.map((sec, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            {sec.title && (
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMute, letterSpacing: "0.08em",
                padding: "8px 8px 4px" }}>
                {sec.title}
              </div>
            )}
            {sec.items.map((item, ii) => {
              const Icon = item.icon;
              return (
                <div key={ii} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 8, marginBottom: 1, cursor: "pointer",
                  background: item.active ? C.primary : "transparent",
                  color: item.active ? "#fff" : C.textSec,
                  fontWeight: item.active ? 600 : 500, fontSize: 13,
                }}>
                  <Icon size={16} />
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
          borderRadius: 8, background: C.pageBg }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>HR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>HR Admin</div>
            <div style={{ fontSize: 10, color: C.textMute }}>Super Admin</div>
          </div>
          <ChevronDown size={14} color={C.textMute} />
        </div>
      </div>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar() {
  const now = new Date("2025-07-07T10:30:00");
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`,
      padding: "0 24px", height: 56, display: "flex", alignItems: "center",
      justifyContent: "space-between", flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>HR Command Center</div>
        <div style={{ fontSize: 11, color: C.textMute }}>{dateStr}</div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.pageBg,
        border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", width: 220 }}>
        <Search size={14} color={C.textMute} />
        <span style={{ fontSize: 13, color: C.textMute }}>Search anything…</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Notif */}
        <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8,
          background: C.pageBg, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Bell size={16} color={C.textSec} />
          <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7,
            borderRadius: "50%", background: C.rose, border: "1.5px solid #fff" }} />
        </div>
        {/* Export */}
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          borderRadius: 8, border: `1px solid ${C.border}`, background: C.card,
          fontSize: 13, fontWeight: 500, color: C.textSec, cursor: "pointer" }}>
          <Download size={14} /> Export
        </button>
        {/* Add */}
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          borderRadius: 8, border: "none", background: C.primary,
          fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
          <Plus size={14} /> Add Employee
        </button>
      </div>
    </div>
  );
}

// ─── Hiring Pipeline ─────────────────────────────────────────────────────────
function HiringPipeline() {
  const stages = [
    { label: "Applied",   count: 42, color: C.blue,    bg: C.blueLt },
    { label: "Screening", count: 28, color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "Interview", count: 18, color: C.primary, bg: C.primaryLt },
    { label: "Offered",   count: 15, color: C.amber,   bg: C.amberLt },
    { label: "Accepted",  count: 15, color: C.emerald, bg: C.emeraldLt },
    { label: "Active",    count: 12, color: "#059669", bg: "#D1FAE5" },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Hiring Pipeline</div>
          <div style={{ fontSize: 12, color: C.textMute }}>End-to-end recruitment funnel</div>
        </div>
        <span style={{ fontSize: 12, color: C.primary, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4 }}>
          View All <ArrowRight size={13} />
        </span>
      </div>

      {/* Funnel stages */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.bg,
                border: `2px solid ${s.color}20`, display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 6px",
                fontSize: 16, fontWeight: 700, color: s.color }}>
                {s.count}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMute,
                textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                <ArrowRight size={14} color={C.textMute} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        {["Recruitment Board", "Offer Management", "Pre-Onboarding"].map((btn, i) => (
          <button key={i} style={{ flex: 1, padding: "6px 0", borderRadius: 7,
            border: `1px solid ${C.border}`, background: C.pageBg,
            fontSize: 12, fontWeight: 500, color: C.textSec, cursor: "pointer" }}>
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed() {
  const items = [
    { name: "Ananya Sharma",  action: "Joined as Senior Designer",   time: "2h ago",  color: C.emerald },
    { name: "Rahul Mehta",    action: "Offer letter sent",            time: "4h ago",  color: C.amber },
    { name: "Priya Nair",     action: "Interview scheduled",          time: "6h ago",  color: C.blue },
    { name: "Vikram Singh",   action: "Onboarding started",           time: "1d ago",  color: C.primary },
    { name: "3 Leave Requests",action:"Pending approval",             time: "1d ago",  color: C.rose },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Recent Activity</div>
        <span style={{ fontSize: 12, color: C.primary, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4 }}>
          View All <ArrowRight size={13} />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <Dot color={item.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.name} </span>
              <span style={{ fontSize: 13, color: C.textSec }}>{item.action}</span>
            </div>
            <span style={{ fontSize: 11, color: C.textMute, flexShrink: 0,
              background: C.pageBg, padding: "2px 8px", borderRadius: 20,
              border: `1px solid ${C.border}` }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Attendance Chart ────────────────────────────────────────────────────────
function AttendanceChart() {
  const days = [
    { day: "Mon", pct: 96 }, { day: "Tue", pct: 94 }, { day: "Wed", pct: 92 },
    { day: "Thu", pct: 95 }, { day: "Fri", pct: 91 }, { day: "Sat", pct: 78 },
  ];
  const maxH = 80;
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Attendance This Week</div>
          <div style={{ fontSize: 12, color: C.textMute }}>Daily presence rate</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: C.emerald }} />
            <span style={{ fontSize: 11, color: C.textMute }}>Present</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#E5E7EB" }} />
            <span style={{ fontSize: 11, color: C.textMute }}>Absent</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: maxH + 28 }}>
        {days.map((d, i) => {
          const h = Math.round((d.pct / 100) * maxH);
          const absentH = maxH - h;
          const isLow = d.pct < 80;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isLow ? C.rose : C.text }}>
                {d.pct}%
              </div>
              <div style={{ width: "100%", height: maxH, display: "flex",
                flexDirection: "column", justifyContent: "flex-end", gap: 0, borderRadius: 6, overflow: "hidden",
                background: "#F3F4F6" }}>
                {absentH > 0 && <div style={{ height: absentH, background: "#E5E7EB" }} />}
                <div style={{ height: h, background: isLow ? C.amber : C.emerald, borderRadius: "4px 4px 0 0" }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMute, fontWeight: 500 }}>{d.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { icon: UserPlus,     label: "Add Employee",       color: C.primary,  bg: C.primaryLt },
    { icon: DollarSign,   label: "Run Payroll",         color: C.emerald,  bg: C.emeraldLt },
    { icon: CheckCircle2, label: "Approve Leaves",      color: C.amber,    bg: C.amberLt },
    { icon: FileText,     label: "Generate Report",     color: C.blue,     bg: C.blueLt },
    { icon: CalendarCheck,label: "Schedule Interview",  color: "#8B5CF6",  bg: "#F5F3FF" },
    { icon: PlayCircle,   label: "Send Offer",          color: C.rose,     bg: C.roseLt },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center",
              gap: 7, padding: "12px 8px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.pageBg,
              cursor: "pointer", transition: "background 0.15s" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: a.bg,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={a.color} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: C.text,
                textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pending Approvals ────────────────────────────────────────────────────────
function PendingApprovals() {
  const items = [
    { name: "Priya Nair",    type: "Leave Request",   days: "3 days",    status: "Casual",   color: C.amber },
    { name: "Arjun Desai",   type: "WFH Request",     days: "Tomorrow",  status: "WFH",      color: C.blue },
    { name: "Meera Pillai",  type: "Expense Claim",   days: "₹4,200",    status: "Expense",  color: C.primary },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Pending Approvals</div>
        <Badge label="7 pending" color={C.amber} bg={C.amberLt} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: item.color + "18",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: 12, fontWeight: 700, color: item.color }}>
              {item.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.name}</div>
              <div style={{ fontSize: 11, color: C.textMute }}>{item.type} · {item.days}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.emerald}`,
                background: C.emeraldLt, fontSize: 11, fontWeight: 600, color: C.emerald, cursor: "pointer" }}>
                Approve
              </button>
              <button style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: C.pageBg, fontSize: 11, fontWeight: 500, color: C.textSec, cursor: "pointer" }}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export function Dashboard() {
  const kpis = [
    { label: "Active Employees", value: "147", sub: "↑ +3 this month",      subColor: C.emerald, accent: C.emerald, icon: Users },
    { label: "In Onboarding",    value: "12",  sub: "4 pending activation",  subColor: C.amber,   accent: C.amber,   icon: UserCheck },
    { label: "Open Positions",   value: "18",  sub: "6 urgent",              subColor: C.rose,    accent: C.rose,    icon: Briefcase },
    { label: "Offer Accepted",   value: "15",  sub: "This cycle",            subColor: C.emerald, accent: C.primary, icon: CheckCircle2 },
    { label: "Pending Actions",  value: "7",   sub: "Requires attention",    subColor: C.amber,   accent: C.amber,   icon: AlertCircle },
    { label: "Avg Attendance",   value: "94.2%", sub: "↑ +1.3% vs last mo", subColor: C.emerald, accent: C.emerald, icon: TrendingUp },
  ];

  return (
    <div style={{ width: 1600, height: 900, overflow: "hidden", display: "flex",
      fontFamily: "'Inter', -apple-system, sans-serif", background: C.pageBg }}>

      <Sidebar />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar />

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex",
          flexDirection: "column", gap: 16 }}>

          {/* Greeting */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
                Good morning, HR Admin! 👋
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 2 }}>
                You have <span style={{ color: C.amber, fontWeight: 600 }}>7 pending actions</span> and{" "}
                <span style={{ color: C.primary, fontWeight: 600 }}>3 approvals</span> waiting today.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge label="● 147 Active" color={C.emerald} bg={C.emeraldLt} />
              <Badge label="12 Onboarding" color={C.primary} bg={C.primaryLt} />
              <Badge label="7 Actions" color={C.amber} bg={C.amberLt} />
            </div>
          </div>

          {/* KPI Row */}
          <div style={{ display: "flex", gap: 12 }}>
            {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
          </div>

          {/* Row 2: Pipeline + Activity */}
          <div style={{ display: "flex", gap: 16, flex: "0 0 auto" }}>
            <div style={{ flex: "0 0 60%" }}><HiringPipeline /></div>
            <div style={{ flex: 1 }}><ActivityFeed /></div>
          </div>

          {/* Row 3: Attendance + Quick Actions + Pending */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: "0 0 34%" }}><AttendanceChart /></div>
            <div style={{ flex: "0 0 26%" }}><QuickActions /></div>
            <div style={{ flex: 1 }}><PendingApprovals /></div>
          </div>

        </div>
      </div>
    </div>
  );
}
