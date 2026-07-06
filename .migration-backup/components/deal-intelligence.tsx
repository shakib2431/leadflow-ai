"use client";

import React from "react";
import { 
  DollarSign, TrendingUp, Calendar, AlertTriangle, 
  BarChart3, RefreshCw, Zap, CheckCircle2, Target
} from "lucide-react";
import { DealIntelligenceData } from "@/types/deal-intelligence";

interface Props {
  data: DealIntelligenceData | null;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}

// Utility to format currency
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const ProgressBar = ({ value, label, colorClass }: { value: number, label: string, colorClass: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      {/* ADD the || 0 fallback here so it defaults to 0 instead of empty */}
      <span className="font-semibold text-gray-200">{value || 0}%</span> 
    </div>
    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${value || 0}%` }} />
    </div>
  </div>
);

export default function DealIntelligenceCard({ data, onAnalyze, isAnalyzing }: Props) {
  
  const getForecastColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'commit': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'best case': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'pipeline': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'at risk': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      case 'lost likely': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-gray-400 border-white/10 bg-white/5';
    }
  };

  return (
    <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 flex flex-col h-full relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-400" /> 
          Deal Intelligence
        </h2>
        
        <button 
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {data ? 'Refresh Forecast' : 'Analyze Deal'}
        </button>
      </div>

      {!data ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 relative z-10">
          <TrendingUp className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400 mb-4 text-sm max-w-xs">
            Generate executive revenue forecasts, predict win probability, and assess deal momentum.
          </p>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {isAnalyzing ? 'Generating Forecast...' : 'Generate Revenue Forecast'}
          </button>
        </div>
      ) : (
        <div className="space-y-6 relative z-10 animate-in fade-in duration-500">
          
          {/* Top Revenue Cards */}
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 rounded-2xl border border-white/5 bg-black/30 flex flex-col justify-center">
               <span className="text-xs text-gray-400 mb-1">Revenue Potential</span>
               <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(data.deal_value)}</span>
             </div>
             <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-center">
               <span className="text-xs text-indigo-400/80 mb-1">Expected Contribution</span>
               <span className="text-2xl font-bold text-indigo-400 tracking-tight">{formatCurrency(data.revenue_contribution)}</span>
             </div>
          </div>

          {/* Forecast Badges */}
          <div className="flex flex-wrap gap-2">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${getForecastColor(data.forecast_category)}`}>
              <BarChart3 className="w-3.5 h-3.5" /> {data.forecast_category}
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 text-xs font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" /> {data.expected_close_date}
            </div>
          </div>

          {/* AI Metrics */}
          <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <ProgressBar value={data.win_probability} label="Win Probability" colorClass="bg-green-500" />
            <ProgressBar value={data.momentum_score} label="Momentum Score" colorClass="bg-blue-500" />
            <ProgressBar value={data.stakeholder_alignment} label="Stakeholder Alignment" colorClass="bg-purple-500" />
            <ProgressBar value={data.engagement_score} label="Engagement Score" colorClass="bg-indigo-500" />
          </div>

          {/* Action Center */}
          <div className="space-y-3">
             <p className="text-sm font-semibold text-gray-200 border-b border-white/10 pb-2">Action Center</p>
             
             {data.positive_signals?.length > 0 && (
               <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                 <p className="text-xs text-green-400 font-semibold mb-1 flex items-center gap-1.5">
                   <CheckCircle2 className="w-3.5 h-3.5" /> Positive Signals
                 </p>
                 <ul className="pl-5 space-y-1">
                   {data.positive_signals.map((signal, idx) => (
                     <li key={idx} className="text-sm text-green-200/80 list-disc">{signal}</li>
                   ))}
                 </ul>
               </div>
             )}

             {data.key_risks?.length > 0 && (
               <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                 <p className="text-xs text-orange-400 font-semibold mb-1 flex items-center gap-1.5">
                   <AlertTriangle className="w-3.5 h-3.5" /> Top Risks
                 </p>
                 <ul className="pl-5 space-y-1">
                   {data.key_risks.map((risk, idx) => (
                     <li key={idx} className="text-sm text-orange-200/80 list-disc">{risk}</li>
                   ))}
                 </ul>
               </div>
             )}

             {data.recommended_actions?.length > 0 && (
               <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                 <p className="text-xs text-indigo-400 font-semibold mb-1 flex items-center gap-1.5">
                   <Target className="w-3.5 h-3.5" /> Recommended Actions
                 </p>
                 <ul className="pl-5 space-y-1">
                   {data.recommended_actions.map((action, idx) => (
                     <li key={idx} className="text-sm text-indigo-100 list-disc">{action}</li>
                   ))}
                 </ul>
               </div>
             )}
          </div>

          {/* Executive Summary */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-1">Executive Forecast</p>
            <p className="text-sm text-gray-300 italic">"{data.executive_forecast}"</p>
          </div>

        </div>
      )}
    </div>
  );
}