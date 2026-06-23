"use client";

import { useState } from "react";
import { Sparkles, Briefcase, Building2, Users, Target, Globe, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ContactEnrichmentPanel({ email }: { email: string }) {
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleEnrich = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      
      if (json.success) {
        setEnrichedData(json.data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-cyan-400" /> Auto-Enrichment
        </h3>
        
        {!enrichedData && !loading && (
          <span className="px-2 py-1 rounded-md bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-wider border border-white/5">
            Pending
          </span>
        )}
        {enrichedData && (
          <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> Enriched
          </span>
        )}
      </div>

      {!enrichedData ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
            <Database size={20} className="text-cyan-400" />
          </div>
          <p className="text-sm text-white/60 mb-4">Click to auto-fetch LinkedIn, company size, and tech stack.</p>
          <button 
            onClick={handleEnrich}
            disabled={loading}
            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {loading ? <Sparkles size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Scanning Data Sources..." : "Run Enrichment Engine"}
          </button>
          {error && <p className="text-xs text-red-400 mt-3 flex items-center justify-center gap-1"><AlertCircle size={12}/> Failed to fetch data</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <img src={enrichedData.company.logo} alt="Logo" className="w-12 h-12 rounded-lg bg-white" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                {enrichedData.company.name}
                <a href={`https://${enrichedData.company.domain}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-cyan-400"><Globe size={12} /></a>
              </h4>
              <p className="text-xs text-white/50">{enrichedData.person.job_title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DataPoint icon={<Building2 size={14}/>} label="Industry" value={enrichedData.company.industry} />
            <DataPoint icon={<Users size={14}/>} label="Employees" value={enrichedData.company.employee_count} />
            <DataPoint icon={<Target size={14}/>} label="Revenue" value={enrichedData.company.revenue_range} />
            <DataPoint icon={<Briefcase size={14}/>} label="Tech Stack" value={enrichedData.company.tech_stack.join(", ")} />
          </div>

          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">News Alert</p>
            <p className="text-xs text-orange-200/80 leading-relaxed">{enrichedData.company.recent_news}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPoint({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1 flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-xs text-white/80 font-medium truncate" title={value}>{value}</p>
    </div>
  );
}

function Database(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
}