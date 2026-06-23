"use client";

import { 
  MessageCircle, X, Zap, LayoutDashboard, Users, 
  Layers, Sparkles, Mail, Settings, Bot, BarChart3, Building2,
  Workflow, Map, Clock, DollarSign, UserPlus, Briefcase, Target, CreditCard // Added CreditCard
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDEBAR_NAV = [
  { 
    group: "Workspace", 
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Action Queue", href: "/action-queue", icon: Sparkles, badge: "AI Agent" },
      { label: "Unified Inbox", href: "/inbox", icon: Mail },
      { label: "Triage Portal", href: "/triage", icon: Target, badge: "AI" }, 
      { label: "Pipeline", href: "/pipeline", icon: Layers },
    ]
  },
  { 
    group: "Database", 
    items: [
      { label: "Companies", href: "/companies", icon: Building2 },
      { label: "Contacts", href: "/contacts", icon: Users },
    ]
  },
  { 
    group: "HRMS Portal", 
    items: [
      { label: "Hiring Pipeline", href: "/team/recruitment", icon: Briefcase },
      { label: "Onboarding", href: "/team/onboarding", icon: UserPlus },
      { label: "Directory", href: "/team", icon: Users },
      { label: "Time & PTO", href: "/team/attendance", icon: Clock },
      { label: "Payroll Prep", href: "/team/payroll", icon: DollarSign },
    ]
  },
  { 
    group: "Intelligence", 
    items: [
      { label: "Playbooks", href: "/playbooks", icon: Bot, badge: "AI" },
      { label: "Automations", href: "/automations", icon: Workflow }, 
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ]
  },
  { 
    group: "System", 
    items: [
      { label: "Financials", href: "/financials", icon: CreditCard }, // Added Financials here
      { label: "Roadmap", href: "/roadmap", icon: Map }, 
      { label: "Settings", href: "/settings", icon: Settings },
    ]
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={15} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">LeadFlow AI</h1>
        <button className="ml-auto lg:hidden text-white/40 hover:text-white/70" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-3 py-6 space-y-7 overflow-y-auto custom-scrollbar">
        {SIDEBAR_NAV.map((group) => (
          <div key={group.group}>
            <div className="px-3 mb-2.5">
              <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase">{group.group}</span>
            </div>
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
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
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Usage Analytics Panel */}
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