import { RoadmapSmbOs } from "@/components/roadmap-smb-os";
import { Target, ArrowLeft, Milestone } from "lucide-react";
import { Link } from "wouter";

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#07070a] text-white selection:bg-violet-500/30 font-sans">
      
      {/* Premium Top Navigation */}
      <header className="border-b border-white/[0.04] bg-[#0c0d12]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Target size={20} className="text-violet-400" /> Product Roadmap
            </h1>
          </div>
          
          <div className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-400 uppercase tracking-wider">
            Public View
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        
        {/* Page Hero */}
        <div className="max-w-2xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
            The Future of LeadFlow
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed">
            We are evolving beyond a CRM. Explore our strategic timeline as we build the ultimate, unified operating system for modern SMBs.
          </p>
        </div>

        {/* Visual Timeline Container */}
        <div className="relative border-l-2 border-white/5 pl-8 md:pl-12 ml-4 md:ml-6 space-y-16">
          
          {/* Phase 4 (Placeholder to show history) */}
          <div className="relative opacity-40 hover:opacity-100 transition-opacity">
            <div className="absolute w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#07070a] -left-[41px] md:-left-[57px] top-1.5" />
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Milestone size={16} className="text-emerald-400" /> Phase 4: Core CRM
            </h3>
            <p className="text-sm text-zinc-500">Completed & Deployed</p>
          </div>

          {/* Phase 5 (Placeholder to show current state) */}
          <div className="relative opacity-60 hover:opacity-100 transition-opacity">
            <div className="absolute w-4 h-4 rounded-full bg-blue-500 border-4 border-[#07070a] -left-[41px] md:-left-[57px] top-1.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Milestone size={16} className="text-blue-400" /> Phase 5: Revenue Intelligence
            </h3>
            <p className="text-sm text-zinc-500">Currently in active development</p>
          </div>

          {/* Phase 6 (The new interactive component) */}
          <div className="relative">
            <div className="absolute w-5 h-5 rounded-full bg-violet-500 border-4 border-[#07070a] -left-[43px] md:-left-[59px] top-10 shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse" />
            <RoadmapSmbOs />
          </div>

        </div>
      </main>
    </div>
  );
}