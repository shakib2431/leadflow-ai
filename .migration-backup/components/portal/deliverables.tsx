"use client";

import { FileBox, ArrowRight } from "lucide-react";

export function Deliverables({ leadId }: { leadId: string }) {
  const deliverables = [
    { name: "Brand Guidelines (v1)", status: "completed" },
    { name: "UI/UX Wireframes", status: "in_progress" },
    { name: "Final Presentation", status: "pending" }
  ];

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white">Deliverables</h2>
        <button className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
          View All <ArrowRight size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {deliverables.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-800/50">
                <FileBox size={16} className="text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">{item.name}</span>
            </div>
            
            {item.status === 'completed' && <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">Completed</span>}
            {item.status === 'in_progress' && <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20">In Progress</span>}
            {item.status === 'pending' && <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-white/5">Pending</span>}
          </div>
        ))}
      </div>
    </div>
  );
}