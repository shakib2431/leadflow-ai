

import {
  MessageCircle,
  X,
  Zap,
  LayoutDashboard,
  Users,
  Layers,
  Sparkles,
  Mail,
  Settings,
  Bot,
  BarChart3,
  Building2,
  Workflow,
  Map,
  Clock,
  DollarSign,
  UserPlus,
  Briefcase,
  Target,
  CreditCard,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

const SIDEBAR_NAV = [
  {
    group: "Workspace",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Action Queue", href: "/action-queue", icon: Sparkles, badge: "AI Agent" },
      { label: "Unified Inbox", href: "/inbox", icon: Mail },
      { label: "Triage Portal", href: "/triage", icon: Target, badge: "AI" },
      { label: "Pipeline", href: "/pipeline", icon: Layers },
    ],
  },
  {
    group: "Communication Hub",
    items: [{ label: "Communication", href: "/communication", icon: Phone }],
  },
  {
    group: "Database",
    items: [
      { label: "Companies", href: "/companies", icon: Building2 },
      { label: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    group: "HRMS Portal",
    items: [
      { label: "HRMS v2", href: "/hrms/v2", icon: Users },
      { label: "Employee Self-Service", href: "/hrms/v2/self-service", icon: Users },
      { label: "HRMS Admin", href: "/hrms/v2/admin", icon: Settings },
      { label: "Hiring Pipeline", href: "/team/recruitment", icon: Briefcase },
      { label: "Onboarding", href: "/team/onboarding", icon: UserPlus },
      { label: "Directory", href: "/team", icon: Users },
      { label: "Time & PTO", href: "/team/attendance", icon: Clock },
      { label: "Payroll Prep", href: "/team/payroll", icon: DollarSign },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "Playbooks", href: "/playbooks", icon: Bot, badge: "AI" },
      { label: "Automations", href: "/automations", icon: Workflow },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Revenue Intelligence", href: "/revenue", icon: DollarSign },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Financials", href: "/financials", icon: CreditCard },
      { label: "Roadmap", href: "/roadmap", icon: Map },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
] as const;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type HRRole = "HR Admin" | "HR Executive" | "Employee" | null;
type RolePreview = "Actual" | "HR Admin" | "HR Executive" | "Employee";

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [pathname] = useLocation();
  const [hrRole, setHrRole] = useState<HRRole>(null);
  const [rolePreview, setRolePreview] = useState<RolePreview>("Actual");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("hrms.sidebar.viewAs");
    if (saved === "HR Admin" || saved === "HR Executive" || saved === "Employee" || saved === "Actual") {
      setRolePreview(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("hrms.sidebar.viewAs", rolePreview);
  }, [rolePreview]);

  useEffect(() => {
    let isMounted = true;

    async function authHeader(): Promise<Record<string, string>> {
      const { data } = await supabase.auth.getSession();
      let token = data.session?.access_token;

      if (!token) {
        const refreshResult = await supabase.auth.refreshSession();
        token = refreshResult.data.session?.access_token;
      }

      if (token) {
        return {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
      }

      if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
        const roleOverride = String(window.localStorage.getItem("hrms-dev-role") || "").trim();
        const headers: Record<string, string> = {
          "x-dev-mode": "true",
          "Content-Type": "application/json",
        };

        if (roleOverride === "HR Admin" || roleOverride === "HR Executive" || roleOverride === "Employee") {
          headers["x-dev-role"] = roleOverride;
        }

        return headers;
      }

      throw new Error("No active session");
    }

    async function loadRole() {
      try {
        const headers = await authHeader();
        const res = await fetch("/api/hrms/v2/user-roles/me", { headers });
        const body = await res.json();
        if (!res.ok) return;

        const role = body?.data?.role;
        if (!isMounted) return;
        if (role === "HR Admin" || role === "HR Executive" || role === "Employee") {
          setHrRole(role);
        }
      } catch {
        // Keep default navigation when role is unavailable.
      }
    }

    loadRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const canPreviewRoles = hrRole === "HR Admin" || hrRole === "HR Executive";
  const effectiveRole: HRRole = rolePreview === "Actual" ? hrRole : rolePreview;

  const navByRole = useMemo(() => {
    if (effectiveRole === "HR Admin" || effectiveRole === "HR Executive") return SIDEBAR_NAV;

    return SIDEBAR_NAV.map((group) => {
      if (group.group !== "HRMS Portal") return group;

      return {
        ...group,
        items: [
          { label: "My Hub", href: "/hrms/v2/self-service", icon: Users },
          { label: "My Profile", href: "/hrms/v2/self-service/profile", icon: Users },
          { label: "My Attendance", href: "/hrms/v2/self-service/attendance", icon: Clock },
          { label: "My Leave", href: "/hrms/v2/self-service/leave", icon: Briefcase },
          { label: "My Calendar", href: "/hrms/v2/self-service/calendar", icon: Map },
          { label: "My Payroll", href: "/hrms/v2/self-service/payroll", icon: DollarSign },
          { label: "Work Mode", href: "/hrms/v2/self-service/work-mode", icon: Settings },
        ],
      };
    });
  }, [effectiveRole]);

  return (
    <aside
      className={`
        fixed lg:relative z-50 lg:z-auto
        w-[240px] h-full flex-shrink-0
        flex flex-col
        border-r border-white/[0.06]
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      style={{ background: "#0d0d14" }}
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={15} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">LeadFlow AI</h1>
        <button className="ml-auto lg:hidden text-white/40 hover:text-white/70" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-7 overflow-y-auto custom-scrollbar">
        {canPreviewRoles && (
          <div className="px-3">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/35">View As</label>
              <select
                value={rolePreview}
                onChange={(e) => setRolePreview(e.target.value as RolePreview)}
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-[#10111a] px-2 py-1.5 text-xs text-white/80 outline-none focus:border-cyan-400/50"
              >
                <option value="Actual">Actual ({hrRole || "Unknown"})</option>
                <option value="HR Admin">HR Admin</option>
                <option value="HR Executive">HR Executive</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
          </div>
        )}

        {navByRole.map((group) => (
          <div key={group.group}>
            <div className="px-3 mb-2.5">
              <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase">{group.group}</span>
            </div>

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    href={item.href}
                    key={item.label}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                      isActive ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                  >
                    <item.icon size={16} className={isActive ? "text-cyan-400" : "group-hover:text-white/60"} />
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06]">
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-violet-400" />
            <span className="text-[10px] font-bold text-violet-300 uppercase">Pro Plan</span>
          </div>
          <p className="text-[10px] text-white/40 mb-2">3,100 / 5,000 messages used</p>
          <div className="w-full bg-white/[0.06] rounded-full h-1">
            <div className="h-1 rounded-full bg-violet-500" style={{ width: "62%" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
