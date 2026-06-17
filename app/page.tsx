"use client";

import { supabaseAuth } from "@/lib/auth";
import { 
  Filter, Download, Upload, Sparkles, Send, Clock, ArrowRight, Flame, CheckCircle2, 
  BarChart3, TrendingUp, AlertTriangle, Zap, Target, Phone, Mail, RotateCcw, 
  RefreshCw, ShieldCheck, BrainCircuit, Activity 
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchLeads, Lead } from "@/lib/leads";
import AddLeadModal from "@/components/add-lead-modal";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import RecentLeadsTable from "@/components/recent-leads-table";
import HotLeadsPanel from "@/components/hot-leads-panel";
import { GLOBAL_STYLES } from "@/constants";
import { DashboardIntelligenceData } from "@/types/dashboard";

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

export default function Dashboard() {
  // --- ORIGINAL STATE ---
  const [userName, setUserName] = useState("User");
  const [pendingFollowups, setPendingFollowups] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW DASHBOARD V2 STATE ---
  const [generating, setGenerating] = useState(false);
  const [dashboardIntel, setDashboardIntel] = useState<DashboardIntelligenceData | null>(null);
  const [rawDeals, setRawDeals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    pipeline: 0, expected: 0, commit: 0, atRisk: 0, bestCase: 0,
    avgWinProb: 0, avgDealHealth: 0
  });

  // --- ORIGINAL FUNCTIONS ---
  const loadLeads = async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
      return data;
    } catch (error) {
      console.error("Failed loading leads:", error);
      return [];
    }
  };

  async function loadFollowups() {
    const { data, error } = await supabaseAuth
      .from("follow_ups")
      .select("*, leads(full_name, phone, ai_score, ai_next_action)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setPendingFollowups(data || []);
  }

  async function sendAiFollowupQuick(item: any) {
    if (!item.leads?.phone) return;
    try {
      await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: item.leads.phone, message: item.ai_message }),
      });

      await supabaseAuth.from("follow_ups").update({ status: "completed" }).eq("id", item.id);
      loadFollowups();
    } catch (err) {
      console.error("Followup Send Error:", err);
    }
  }

  // --- NEW DASHBOARD V2 DATA FETCHING ---
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: deals } = await supabaseAuth
        .from('leads')
        .select(`id, full_name, deal_intelligence (*)`)
        .not('status', 'eq', 'lost');

      if (deals) {
        setRawDeals(deals);
        let pl = 0, exp = 0, com = 0, risk = 0, best = 0, totalProb = 0, totalHealth = 0, validDeals = 0;
        
        deals.forEach(d => {
          const intel = d.deal_intelligence?.[0];
          if (intel) {
            validDeals++;
            exp += (intel.revenue_contribution || 0);
            totalProb += (intel.win_probability || 0);
            totalHealth += (intel.confidence_score || 0);

            if (intel.forecast_category === 'Pipeline') pl += intel.deal_value;
            if (intel.forecast_category === 'Commit') com += intel.deal_value;
            if (intel.forecast_category === 'Best Case') best += intel.deal_value;
            if (intel.forecast_category === 'At Risk' || intel.deal_risk === 'High' || intel.deal_risk === 'Critical') risk += intel.deal_value;
          }
        });

        setMetrics({
          pipeline: pl, expected: exp, commit: com, atRisk: risk, bestCase: best,
          avgWinProb: validDeals ? Math.round(totalProb / validDeals) : 0,
          avgDealHealth: validDeals ? Math.round(totalHealth / validDeals) : 0
        });
      }

      const { data: snapshot } = await supabaseAuth
        .from('dashboard_intelligence')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();
        
      if (snapshot) setDashboardIntel(snapshot);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runRevenueEngine = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/dashboard-intelligence', { method: 'POST' });
      const data = await res.json();
      if (data.success) setDashboardIntel(data.data);
    } catch (err) {
      alert("Error generating dashboard intelligence.");
    } finally {
      setGenerating(false);
    }
  };

  const getDealData = (leadId: string) => {
    const deal = rawDeals.find(d => d.id === leadId);
    return deal?.deal_intelligence?.[0] || {};
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user?.email) setUserName(user.email.split("@")[0]);
    };
    getUser();
    loadLeads();
    loadFollowups();
    fetchDashboardData();
  }, []);

  return (
    <div
      className="min-h-screen bg-[#07070a] text-white font-sans selection:bg-violet-500/30 selection:text-white"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{GLOBAL_STYLES}</style>

      <div className="flex h-screen overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0c0d12]/80 backdrop-blur-md z-30 relative">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            <button
              onClick={() => setLeadModalOpen(true)}
              className="mr-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all text-white shadow-lg shadow-violet-900/20"
            >
              + Add Lead
            </button>
          </div>

          <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {/* --- ACTION QUEUE & GREETING WITH LINKED DATA CENTER PORTALS --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 fade-in fade-in-1">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Command Center</h1>
                <p className="text-sm text-white/50 font-medium">
                  Good morning, {userName}. You have <span className="text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 mx-1">{pendingFollowups.length} high-priority actions</span> queued today.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 bg-black/40 border border-white/[0.06] hover:text-white/90 hover:bg-white/5 transition-all">
                  <Filter size={14} /> Filter Queue
                </button>
                <Link href="/import" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 bg-black/40 border border-white/[0.06] hover:text-white/90 hover:bg-white/5 transition-all">
                  <Upload size={14} /> Import Data
                </Link>
                <Link href="/export" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 bg-black/40 border border-white/[0.06] hover:text-white/90 hover:bg-white/5 transition-all">
                  <Download size={14} /> Export Data
                </Link>
              </div>
            </div>

            <section className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5 flex items-center gap-2">
                <Sparkles size={14} className="text-violet-400" /> AI Action Queue
              </h2>
              
              <div className="space-y-4">
                {pendingFollowups.length === 0 ? (
                  <div className="bg-[#0d0e12] border border-white/[0.04] border-dashed rounded-3xl p-12 text-center flex flex-col items-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mb-3 opacity-80" />
                    <h3 className="text-lg font-semibold text-white/90">Inbox Zero</h3>
                    <p className="text-sm text-white/40 mt-1">All AI-recommended actions are completed.</p>
                  </div>
                ) : (
                  pendingFollowups.map((item) => {
                    const isHot = (item.leads?.ai_score || 0) >= 70;
                    return (
                      <div key={item.id} className="bg-[#0d0e12] border border-white/[0.06] rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between hover:border-violet-500/30 transition-all duration-300 shadow-xl shadow-black/20 group">
                        <div className="flex gap-4 items-start w-full lg:w-auto flex-1">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${isHot ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
                            {isHot ? <Flame size={20} /> : <Clock size={20} />}
                          </div>
                          <div className="w-full">
                            <div className="flex items-center gap-3 mb-1.5">
                              <h3 className="text-lg font-bold text-white/90 tracking-tight">{item.leads?.full_name || "Unknown Lead"}</h3>
                              {isHot && <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">Score {item.leads.ai_score}</span>}
                            </div>
                            <p className="text-sm text-white/60 mb-4 max-w-3xl leading-relaxed">{item.title} — {item.description}</p>
                            {item.ai_message && (
                              <div className="bg-violet-950/20 border border-violet-500/10 rounded-xl p-4 max-w-2xl relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500/50"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2 flex items-center gap-1.5"><Sparkles size={12}/> AI Drafted Response</span>
                                <p className="text-sm text-violet-100/70 italic line-clamp-2 leading-relaxed font-medium">"{item.ai_message}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row gap-3 w-full lg:w-auto shrink-0 justify-end">
                          {item.ai_message && (
                            <button onClick={() => sendAiFollowupQuick(item)} className="px-5 py-3 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-sm font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20">
                              <Send size={16} /> Dispatch
                            </button>
                          )}
                          <Link href={`/leads/${item.lead_id}`} className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold tracking-wide rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all">
                            Review <ArrowRight size={16} className="text-white/40 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>

            {/* --- REVENUE ENGINE V2 DISPLAY --- */}
            <section className="mb-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-violet-500" /> Revenue Operating System
                  </h2>
                  <p className="text-gray-400 mt-1 text-sm">Enterprise AI Pipeline Intelligence</p>
                </div>
                <button onClick={runRevenueEngine} disabled={generating} className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Running Engine...' : 'Sync AI Engine'}
                </button>
              </div>

              {loading ? (
                <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500"></div></div>
              ) : (
                <>
                  {/* Smart Metrics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                    <MetricCard label="Expected Revenue" value={formatCurrency(metrics.expected)} color="text-violet-400" icon={<TrendingUp className="w-4 h-4" />} />
                    <MetricCard label="Commit" value={formatCurrency(metrics.commit)} color="text-emerald-400" icon={<ShieldCheck className="w-4 h-4" />} />
                    <MetricCard label="Pipeline" value={formatCurrency(metrics.pipeline)} color="text-blue-400" icon={<BarChart3 className="w-4 h-4" />} />
                    <MetricCard label="At Risk" value={formatCurrency(metrics.atRisk)} color="text-orange-400" icon={<AlertTriangle className="w-4 h-4" />} />
                    <MetricCard label="Avg Win Prob" value={`${metrics.avgWinProb}%`} color="text-white" icon={<Target className="w-4 h-4 text-white/40" />} />
                    <MetricCard label="AI Deal Health" value={`${metrics.avgDealHealth}/100`} color="text-white" icon={<Activity className="w-4 h-4 text-white/40" />} />
                  </div>

                  {!dashboardIntel ? (
                    <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl p-10 text-center">
                      <BrainCircuit className="w-12 h-12 text-violet-500/50 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Initialize Revenue Engine</h2>
                      <p className="text-gray-400 mb-6 text-sm">Run the AI engine to generate your first executive pipeline snapshot.</p>
                      <button onClick={runRevenueEngine} disabled={generating} className="bg-violet-600 hover:bg-violet-500 transition px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 mx-auto font-bold text-sm">
                         {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</> : 'Run AI Engine'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* AI Executive Brief */}
                        <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl p-6 lg:col-span-2 relative overflow-hidden shadow-xl shadow-black/10">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                          <h2 className="text-sm uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-violet-400" /> AI Executive Brief</h2>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-4">
                            <p className="text-gray-200 leading-relaxed text-sm">{dashboardIntel.executive_summary}</p>
                          </div>
                          <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                            <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">Biggest Revenue Blocker</p>
                            <p className="text-orange-200/80 text-sm">{dashboardIntel.biggest_revenue_blocker}</p>
                          </div>
                        </div>

                        {/* AI Recommendations Center */}
                        <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl p-6 shadow-xl shadow-black/10">
                          <h2 className="text-sm uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-emerald-400" /> Action Center</h2>
                          <div className="space-y-4 text-sm">
                            <ActionList icon={<Phone className="w-4 h-4 text-blue-400" />} title="Recommended Calls" items={dashboardIntel.ai_recommendations?.calls} />
                            <ActionList icon={<Mail className="w-4 h-4 text-violet-400" />} title="Draft Emails" items={dashboardIntel.ai_recommendations?.emails} />
                            <ActionList icon={<RotateCcw className="w-4 h-4 text-orange-400" />} title="Revivals Needed" items={dashboardIntel.ai_recommendations?.revivals} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {/* Today's Revenue Priorities */}
                        <div className="bg-[#0d0e12] border border-violet-500/20 rounded-3xl p-6 shadow-xl shadow-black/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                          <h2 className="text-sm uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-violet-400" /> Revenue Priorities</h2>
                          <div className="space-y-4">
                            {dashboardIntel.priorities?.map((p, i) => {
                              const deal = getDealData(p.lead_id);
                              return (
                                <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white/90">{p.lead_name}</h3>
                                    <span className="bg-violet-500/10 text-violet-400 text-xs px-2 py-1 rounded-md font-bold border border-violet-500/20">Score: {p.priority_score}</span>
                                  </div>
                                  <div className="flex gap-4 text-xs mb-3 border-b border-white/5 pb-3 font-medium">
                                    <span className="text-emerald-400">{formatCurrency(deal.deal_value)}</span>
                                    <span className="text-white/40">Prob: <span className="text-white/80">{deal.win_probability || 0}%</span></span>
                                  </div>
                                  <p className="text-sm text-white/60 mb-2">{p.reason}</p>
                                  <p className="text-xs font-bold text-violet-300 bg-violet-500/10 inline-block px-3 py-1.5 rounded-lg border border-violet-500/20">Action: {p.recommended_action}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-6">
                          {/* Opportunity Radar */}
                          <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl p-6 shadow-xl shadow-black/10">
                            <h2 className="text-sm uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Opportunity Radar</h2>
                            <div className="space-y-3">
                              {dashboardIntel.opportunity_radar?.map((op, i) => {
                                const deal = getDealData(op.lead_id);
                                return (
                                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                      <p className="font-bold text-sm text-white/90">{op.lead_name}</p>
                                      <p className="text-xs text-white/50 mt-0.5">{op.next_action}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(deal.deal_value)}</p>
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mt-0.5">{deal.forecast_category}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Deal Risk Center */}
                          <div className="bg-[#0d0e12] border border-orange-500/20 rounded-3xl p-6 shadow-xl shadow-black/10 relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                            <h2 className="text-sm uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-orange-400" /> Deal Risk Center</h2>
                            <div className="space-y-3">
                              {dashboardIntel.deal_risks?.map((risk, i) => {
                                const deal = getDealData(risk.lead_id);
                                return (
                                  <div key={i} className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="font-bold text-sm text-orange-200">{risk.lead_name}</p>
                                      <span className="text-xs text-orange-400 font-bold">{formatCurrency(deal.deal_value)}</span>
                                    </div>
                                    <p className="text-xs text-orange-200/60 mb-3 leading-relaxed">{risk.risk_reason}</p>
                                    <p className="text-[11px] font-medium text-orange-300 bg-orange-500/10 px-2.5 py-1.5 rounded-lg inline-block border border-orange-500/10">Rescue: {risk.suggested_rescue}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>

            {/* --- TRADITIONAL DATABASE VIEW (PRESERVED) --- */}
            <section className="opacity-90">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Raw Pipeline Data</h2>
                <span className="text-xs text-white/30 font-medium">Auto-synced securely</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2"><RecentLeadsTable leads={leads} loading={loading} /></div>
                <div className="xl:col-span-1"><HotLeadsPanel /></div>
              </div>
            </section>

          </main>
        </div>
      </div>

      <AddLeadModal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} onLeadCreated={loadLeads} />

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}} />
    </div>
  );
}

// --- SUB-COMPONENTS ---
const MetricCard = ({ label, value, color, icon }: any) => (
  <div className="bg-[#0d0e12] p-5 rounded-2xl border border-white/[0.04] flex flex-col justify-center shadow-lg shadow-black/10">
    <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">{icon} {label}</p>
    <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
  </div>
);

const ActionList = ({ icon, title, items }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">{icon} {title}</h3>
      <ul className="space-y-2 pl-6">
        {items.map((item: string, i: number) => (
          <li key={i} className="text-white/70 list-disc font-medium">{item}</li>
        ))}
      </ul>
    </div>
  );
};