

import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import { 
  User, Mail, Phone, Calendar, Activity, CheckCircle, 
  AlertCircle, Clock, Sparkles, BrainCircuit, ShieldAlert,
  Target, Briefcase, ChevronRight
} from "lucide-react";

import RelationshipIntelligenceCard from "@/components/relationship-intelligence";
import { RelationshipIntelligenceData } from "@/types/relationship-intelligence";

// --- NEW: Deal Intelligence Imports ---
import DealIntelligenceCard from "@/components/deal-intelligence";
import { DealIntelligenceData } from "@/types/deal-intelligence";


// --- TypeScript Types ---
interface Lead { id: string; name: string; email: string; phone: string; status: string; source: string; ai_score: number; created_at: string; }
interface LeadMemory { id: string; lead_id: string; summary: string; budget: string; objections: string; decision_maker: string; next_action: string; }
interface EmailHistory { id: string; lead_id: string; subject: string; recipient: string; body: string; created_at: string; date?: string; }
interface ActivityLog { id: string; lead_id: string; title: string; description: string; timestamp: string; }
interface Followup { id: string; lead_id: string; title: string; due_date: string; status: 'upcoming' | 'completed' | 'overdue'; }
interface AIBriefResponse { executiveSummary: string; riskLevel: string; dealHealth: string; closeProbability: number; nextBestAction: string; recommendedOutreach: string; }

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;

  const [loading, setLoading] = useState(true);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [memory, setMemory] = useState<LeadMemory | null>(null);
  const [emails, setEmails] = useState<EmailHistory[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [aiBrief, setAiBrief] = useState<AIBriefResponse | null>(null);

  const [relIntelligence, setRelIntelligence] = useState<RelationshipIntelligenceData | null>(null);
  const [analyzingRel, setAnalyzingRel] = useState(false);

  // --- NEW: Deal Intelligence States ---
  const [dealIntelligence, setDealIntelligence] = useState<DealIntelligenceData | null>(null);
  const [analyzingDeal, setAnalyzingDeal] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    const fetchWorkspaceData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          { data: leadData, error: leadErr },
          { data: memoryData },
          { data: emailsData },
          { data: activitiesData },
          { data: followupsData },
          { data: relData },
          { data: dealData } // --- NEW: Fetch Deal Data ---
        ] = await Promise.all([
          supabase.from("leads").select("*").eq("id", leadId).single(),
          supabase.from("lead_memory").select("*").eq("lead_id", leadId).single(),
          supabase.from("email_history").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
          supabase.from("activity_log").select("*").eq("lead_id", leadId).order("timestamp", { ascending: false }),
          supabase.from("followups").select("*").eq("lead_id", leadId).order("due_date", { ascending: true }),
          supabase.from("relationship_intelligence").select("*").eq("lead_id", leadId).maybeSingle(),
          supabase.from("deal_intelligence").select("*").eq("lead_id", leadId).maybeSingle(),
        ]);

        if (leadErr) throw leadErr;

        setLead(leadData);
        setMemory(memoryData);
        setEmails(emailsData || []);
        setActivities(activitiesData || []);
        setFollowups(followupsData || []);
        setRelIntelligence(relData);
        
        // --- NEW: Set Deal Data ---
        setDealIntelligence(dealData);

      } catch (err: any) {
        console.error("Error fetching workspace data:", err);
        setError(err.message || "Failed to load workspace data.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [leadId]);

  const generateAIBrief = async () => {
    try {
      setGeneratingBrief(true);
      const response = await fetch("/api/workspace-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, memory, emails, activities, followups }),
      });
      const result = await response.json();
      setAiBrief(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleAnalyzeRelationship = async () => {
    setAnalyzingRel(true);
    try {
      const response = await fetch("/api/relationship-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, lead, memory, emails, activities, followups }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Analysis failed");
      setRelIntelligence(result.data);
    } catch (error: any) {
      alert("Error analyzing relationship data: " + error.message);
    } finally {
      setAnalyzingRel(false);
    }
  };

  // --- NEW: Deal Analysis Function ---
  const handleAnalyzeDeal = async () => {
    setAnalyzingDeal(true);
    try {
      const response = await fetch("/api/deal-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, lead, memory, relationship: relIntelligence, emails, activities, followups }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Analysis failed");
      setDealIntelligence(result.data);
    } catch (error: any) {
      alert("Error analyzing deal data: " + error.message);
    } finally {
      setAnalyzingDeal(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
  if (error || !lead) return <div className="min-h-screen bg-[#0a0a0f] text-white p-10 flex flex-col items-center justify-center"><ShieldAlert className="w-16 h-16 text-red-500 mb-4" /><h1 className="text-2xl font-bold">Error Loading Workspace</h1><p className="text-gray-400 mt-2">{error || "Lead not found"}</p></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-10 space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Sales Workspace</h1>
          <p className="text-gray-400 mt-1">Intelligence dashboard for {lead.name}</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20">
          <BrainCircuit className="w-5 h-5" />
          <span className="font-semibold">AI Score: {lead.ai_score}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Core Details */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><User className="w-5 h-5 text-gray-400" /> Executive Brief</h2>
            <div className="space-y-4">
              <div><p className="text-sm text-gray-400">Lead Name</p><p className="font-medium text-lg">{lead.name}</p></div>
              <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-200">{lead.email}</p></div>
              <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-200">{lead.phone}</p></div>
              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-400">Status</p><span className="inline-block mt-1 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium">{lead.status}</span></div>
                <div><p className="text-sm text-gray-400">Source</p><p className="mt-1 text-sm">{lead.source}</p></div>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-indigo-400" /> Lead Memory</h2>
            {memory ? (
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-white/5 rounded-xl"><p className="text-gray-400 mb-1">Summary</p><p className="text-gray-200">{memory.summary}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl"><p className="text-gray-400 mb-1">Budget</p><p className="font-medium text-green-400">{memory.budget}</p></div>
                  <div className="p-3 bg-white/5 rounded-xl"><p className="text-gray-400 mb-1">Decision Maker</p><p className="font-medium">{memory.decision_maker}</p></div>
                </div>
                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10"><p className="text-red-400 mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Objections</p><p className="text-red-200">{memory.objections}</p></div>
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10"><p className="text-indigo-400 mb-1 flex items-center gap-2"><Target className="w-4 h-4" /> Next Action</p><p className="text-indigo-200">{memory.next_action}</p></div>
              </div>
            ) : <p className="text-gray-500 text-sm">No memory data recorded yet.</p>}
          </div>
        </div>

        {/* Column 2: AI Engines */}
        <div className="space-y-6">
          <RelationshipIntelligenceCard data={relIntelligence} onAnalyze={handleAnalyzeRelationship} isAnalyzing={analyzingRel} />
          
          {/* --- NEW: Deal Intelligence Card Component --- */}
          <DealIntelligenceCard data={dealIntelligence} onAnalyze={handleAnalyzeDeal} isAnalyzing={analyzingDeal} />
        </div>

        {/* Column 3: Copilot & Followups */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 border-t-4 border-t-indigo-500">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Sales Copilot</h2>
            {!aiBrief ? (
              <div className="text-center py-6">
                <button onClick={generateAIBrief} disabled={generatingBrief} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white py-3 px-4 rounded-xl font-medium transition-colors">
                  {generatingBrief ? "Analyzing..." : "Generate AI Brief"}
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-xs text-gray-400 mb-1">Risk Level</p><p className="font-semibold">{aiBrief.riskLevel}</p></div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-xs text-gray-400 mb-1">Win Probability</p><p className="font-semibold text-indigo-400">{aiBrief.closeProbability}%</p></div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl"><p className="text-sm text-gray-400 mb-2">Executive Summary</p><p className="text-sm text-gray-200 leading-relaxed">{aiBrief.executiveSummary}</p></div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl"><p className="text-sm text-indigo-400 font-medium mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Next Best Action</p><p className="text-sm text-indigo-100">{aiBrief.nextBestAction}</p></div>
              </div>
            )}
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-400" /> Follow-up Intelligence</h2>
            <div className="space-y-4">
              {followups.filter(f => f.status === 'upcoming').map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div className="flex-1"><p className="text-sm font-medium text-blue-200">{f.title}</p><p className="text-xs text-blue-400/70">{new Date(f.due_date).toLocaleDateString()}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}