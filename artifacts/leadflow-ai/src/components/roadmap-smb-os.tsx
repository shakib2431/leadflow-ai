

import { Zap, LayoutTemplate, Smartphone, Code2, ArrowRight, Calendar, Activity } from "lucide-react";

export function RoadmapSmbOs() {
  const features = [
    { 
      title: "Automations", 
      icon: Zap, 
      desc: "Visual workflow builder",
      color: "text-amber-400", 
      bg: "bg-amber-500/10", 
      border: "border-amber-500/20",
      glow: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]"
    },
    { 
      title: "Landing Pages", 
      icon: LayoutTemplate, 
      desc: "Drag-and-drop conversion",
      color: "text-violet-400", 
      bg: "bg-violet-500/10", 
      border: "border-violet-500/20",
      glow: "group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
    },
    { 
      title: "Mobile App", 
      icon: Smartphone, 
      desc: "LeadFlow native iOS/Android",
      color: "text-emerald-400", 
      bg: "bg-emerald-500/10", 
      border: "border-emerald-500/20",
      glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
    },
    { 
      title: "Public API", 
      icon: Code2, 
      desc: "Headless CRM capabilities",
      color: "text-blue-400", 
      bg: "bg-blue-500/10", 
      border: "border-blue-500/20",
      glow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]"
    }
  ];

  return (
    <div className="p-8 rounded-3xl bg-[#0c0d12] border border-white/5 relative overflow-hidden group/main">
      {/* Dynamic Background Glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover/main:opacity-100" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">
              6
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              SMB Operating System
            </h2>
          </div>
          <p className="text-lg text-zinc-400 font-medium">
            LeadFlow becomes the <span className="text-white">ONLY</span> tool an SMB needs.
          </p>
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-300">
            <Calendar size={14} className="text-zinc-500" /> Weeks 41–52
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400 tracking-wide uppercase">
            <Activity size={14} /> Medium Priority
          </span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div 
              key={i} 
              className={`p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group ${feature.glow}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${feature.bg} ${feature.border} ${feature.color}`}>
                <Icon size={18} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all">
                {feature.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Action */}
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
        <p className="text-xs text-zinc-500">Phase 6 Vision • Subject to capacity planning</p>
        <button className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors group/btn">
          View Tech Specs <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}