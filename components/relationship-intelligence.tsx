"use client";
import React from "react";
import { BrainCircuit, Users, AlertTriangle, Activity, HelpCircle, Zap, Shield, RefreshCw } from "lucide-react";
import { RelationshipIntelligenceData } from "@/types/relationship-intelligence";

interface Props {
  data: RelationshipIntelligenceData | null;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}

export default function RelationshipIntelligenceCard({ data, onAnalyze, isAnalyzing }: Props) {
  if (!data) {
    return (
      <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 flex flex-col items-center py-10">
        <Users className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400 mb-4 text-sm text-center">Analyze communications to map stakeholders and uncover hidden deal risks.</p>
        <button onClick={onAnalyze} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl text-sm transition-colors">
          {isAnalyzing ? 'Analyzing CRM Data...' : 'Run Intelligence Engine'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><BrainCircuit className="text-purple-400 w-5 h-5"/> Relationship Intelligence</h2>
        <button onClick={onAnalyze} disabled={isAnalyzing} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
           <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"><p className="text-xs">Risk Level</p><p className="font-bold">{data.risk_level}</p></div>
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl"><p className="text-xs text-gray-400">Engagement</p><p className="font-bold">{data.engagement_trend}</p></div>
      </div>

      <div className="bg-black/20 p-4 rounded-xl text-sm border border-white/5 space-y-2">
        <p><span className="text-gray-500">Champion:</span> <span className="text-green-300">{data.champion}</span></p>
        <p><span className="text-gray-500">Decision Maker:</span> <span className="text-blue-300">{data.decision_maker}</span></p>
      </div>

      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mt-4">
        <p className="text-xs text-purple-400 mb-1 flex items-center gap-1"><Zap className="w-4 h-4"/> Next Action</p>
        <p className="text-sm text-gray-200">{data.next_relationship_action}</p>
      </div>
    </div>
  );
}