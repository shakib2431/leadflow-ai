"use client";

import { Lead } from "@/types/portal";
import { Activity, Clock, ShieldAlert, Target } from "lucide-react";

const STAGE_MAP = {
  new: { progress: 10, label: "Initiated" },
  contacted: { progress: 25, label: "Discovery" },
  qualified: { progress: 40, label: "Scoping" },
  proposal: { progress: 60, label: "Proposal Review" },
  negotiation: { progress: 85, label: "Finalizing" },
  won: { progress: 100, label: "Active Execution" },
};

export function ProjectHealth({ lead }: { lead: Lead }) {
  const currentStage = STAGE_MAP[lead.pipeline_stage];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl p-8 mt-8">
      {/* Subtle Top Gradient Border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Main Progress Ring */}
        <div className="col-span-1 md:col-span-2 flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
              <circle
                cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="4" fill="transparent"
                strokeDasharray="276" strokeDashoffset={276 - (276 * currentStage.progress) / 100}
                className="text-emerald-500 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-light text-white">{currentStage.progress}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">Current Phase</h3>
            <p className="text-2xl font-medium text-white">{currentStage.label}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="col-span-1 flex flex-col justify-center border-l border-white/5 pl-8">
          <div className="flex items-center gap-3 mb-2 text-zinc-400">
            <Target size={16} /> <span className="text-xs uppercase tracking-wider">Next Milestone</span>
          </div>
          <p className="text-zinc-200 font-medium">{currentStage.progress < 100 ? "Pending Approval" : "Project Deployed"}</p>
        </div>

        <div className="col-span-1 flex flex-col justify-center border-l border-white/5 pl-8">
          <div className="flex items-center gap-3 mb-2 text-zinc-400">
            <ShieldAlert size={16} /> <span className="text-xs uppercase tracking-wider">Risk Level</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-400">On Track</span>
          </div>
        </div>

      </div>
    </div>
  );
}