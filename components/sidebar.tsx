"use client";


import { MessageCircle, X, Zap } from "lucide-react";
import { NAV_ITEMS } from "@/constants";
import Link from "next/link";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
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
        <div>
  <h1 className="text-xl font-bold text-white flex items-center gap-2">
    LeadFlow AI
  </h1>

  {/* <p className="text-sm text-zinc-400">
    AI Sales Operating System
  </p> */}
</div>
        <button
          className="ml-auto lg:hidden text-white/40 hover:text-white/70"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-medium tracking-widest text-white/20 uppercase">Menu</span>
        </div>
      {NAV_ITEMS.map((item) => (
  <Link
    href={item.href || "#"}
    key={item.label}
            className={`block w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
  item.active
    ? "bg-white/[0.08] text-white"
    : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
}`}
            
          >
            <item.icon
              size={16}
              className={item.active ? "text-violet-400" : "group-hover:text-white/60"}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-400">
                {item.badge}
              </span>
            )}
            {item.active && (
              <div className="w-1 h-1 rounded-full bg-violet-400 pulse-dot" />
            )}
          </Link>
        ))}
      </nav>

      {/* Pro Plan Card */}
      <div className="p-3 border-t border-white/[0.06]">
        <div
          className="rounded-xl p-3"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Pro Plan</span>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed mb-2.5">
            5,000 messages/mo
            <br />
            124 leads this month
          </p>
          <div className="w-full bg-white/[0.06] rounded-full h-1 mb-1">
            <div className="h-1 rounded-full score-bar" style={{ width: "62%" }} />
          </div>
          <div className="text-[10px] text-white/30">3,100 / 5,000 used</div>
        </div>
      </div>
    </aside>
  );
}