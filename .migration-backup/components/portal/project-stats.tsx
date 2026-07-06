"use client";

import { Activity, Clock, CheckCircle2, Ticket } from "lucide-react";

export function ProjectStats({ leadId }: { leadId: string }) {
  const stats = [
    { label: "Completion", value: "40%", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Days Active", value: "14", icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Deliverables", value: "8", icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Open Tickets", value: "1", icon: Ticket, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl hover:bg-white/[0.02] transition-colors group">
            <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 border border-white/5`}>
              <Icon size={18} className={stat.color} />
            </div>
            <p className="text-3xl font-light text-white mb-1">{stat.value}</p>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}