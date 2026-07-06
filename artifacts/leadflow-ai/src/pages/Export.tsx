

import React, { useState } from "react";
import { DownloadCloud, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function ExportPage() {
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Trigger native browser download from API
      window.location.href = `/api/export-data?filter=${filter}`;
    } finally {
      setTimeout(() => setExporting(false), 2000); // Reset UI after brief delay
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <DownloadCloud className="w-8 h-8 text-emerald-500" /> Data Export Center
            </h1>
            <p className="text-gray-400 mt-2">Generate reporting spreadsheets and backup CRM data.</p>
          </div>
          <Link to="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#0d0e12] border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-bold mb-6">Select Export Segment</h2>
          
          <div className="space-y-4 mb-8">
            <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'all' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}>
              <input type="radio" name="exportFilter" value="all" checked={filter === 'all'} onChange={() => setFilter('all')} className="hidden" />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filter === 'all' ? 'border-emerald-500' : 'border-gray-500'}`}>
                {filter === 'all' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
              </div>
              <div>
                <p className="font-bold text-white">Full Database</p>
                <p className="text-xs text-gray-400 mt-0.5">Export all leads, regardless of status or score.</p>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'pipeline' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}>
              <input type="radio" name="exportFilter" value="pipeline" checked={filter === 'pipeline'} onChange={() => setFilter('pipeline')} className="hidden" />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filter === 'pipeline' ? 'border-emerald-500' : 'border-gray-500'}`}>
                {filter === 'pipeline' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
              </div>
              <div>
                <p className="font-bold text-white">Active Pipeline Only</p>
                <p className="text-xs text-gray-400 mt-0.5">Exclude leads marked as 'Closed Lost'.</p>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'hot' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}>
              <input type="radio" name="exportFilter" value="hot" checked={filter === 'hot'} onChange={() => setFilter('hot')} className="hidden" />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filter === 'hot' ? 'border-emerald-500' : 'border-gray-500'}`}>
                {filter === 'hot' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
              </div>
              <div>
                <p className="font-bold text-white">Hot Leads (AI Score 70+)</p>
                <p className="text-xs text-gray-400 mt-0.5">Export only high-intent prospects identified by the AI.</p>
              </div>
            </label>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 mb-8 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Data is exported in a secure, widely compatible CSV format. Your export will include AI Lead Scores and creation timestamps.
            </p>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleExport} 
              disabled={exporting}
              className="px-8 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 transition text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {exporting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating File...</> : <><DownloadCloud className="w-4 h-4" /> Download CSV Report</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}