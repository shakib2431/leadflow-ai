"use client";

import { Sparkles } from "lucide-react";

export function AiExecutiveSummary({ leadId }: { leadId: string }) {
  return (
    <div className="mt-8 p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
      {/* Subtle top glow line */}
      <div className="absolute top-0 left-8 w-32 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Sparkles size={16} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-medium text-white">AI Executive Summary</h2>
      </div>
      
      <p className="text-zinc-400 leading-relaxed text-sm">
        Project is currently tracking smoothly. We have finalized the discovery phase and are preparing the deliverables for review. No critical blockers detected at this time.
      </p>
    </div>
  );
}