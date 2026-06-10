"use client";

import { supabaseAuth } from "@/lib/auth";
import { Filter, Download, Sparkles, Send, Clock, ArrowRight, Flame, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchLeads, Lead } from "@/lib/leads";
import AddLeadModal from "@/components/add-lead-modal";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import AnalyticsCards from "@/components/analytics-cards";
import RecentLeadsTable from "@/components/recent-leads-table";
import HotLeadsPanel from "@/components/hot-leads-panel";
import { GLOBAL_STYLES } from "@/constants";

export default function Dashboard() {
  const [userName, setUserName] = useState("User");
  const [pendingFollowups, setPendingFollowups] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await fetchLeads();
      setLeads(data);
      return data;
    } catch (error) {
      console.error("Failed loading leads:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  async function loadFollowups() {
    // Fetch pending followups and join with the leads table to get context
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
        body: JSON.stringify({
          phone: item.leads.phone,
          message: item.ai_message,
        }),
      });

      await supabaseAuth
        .from("follow_ups")
        .update({ status: "completed" })
        .eq("id", item.id);

      loadFollowups();
    } catch (err) {
      console.error("Followup Send Error:", err);
    }
  }

  useEffect(() => {
    loadLeads();
    loadFollowups();
  }, []);
  useEffect(() => {
  const getUser = async () => {
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (user?.email) {
      setUserName(
        user.email.split("@")[0]
      );
    }
  };

  getUser();
}, []);

  return (
    <div
      className="min-h-screen bg-[#07070a] text-white font-sans selection:bg-violet-500/30 selection:text-white"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{GLOBAL_STYLES}</style>

      <div className="flex h-screen overflow-hidden">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
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
            {/* Background Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {/* NEW AI COMMAND CENTER HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 fade-in fade-in-1">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                  Command Center
                </h1>
                <p className="text-sm text-white/50 font-medium">
                  Good morning, {userName}. You have <span className="text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 mx-1">{pendingFollowups.length} high-priority actions</span> queued today.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 bg-black/40 border border-white/[0.06] hover:text-white/90 hover:bg-white/5 transition-all">
                  <Filter size={14} /> Filter Queue
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 bg-black/40 border border-white/[0.06] hover:text-white/90 hover:bg-white/5 transition-all">
                  <Download size={14} /> Export
                </button>
              </div>
            </div>

            {/* 🚀 THE ACTION QUEUE (PRIORITY 1) */}
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
                        
                        {/* Context & Description */}
                        <div className="flex gap-4 items-start w-full lg:w-auto flex-1">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                            isHot ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                          }`}>
                            {isHot ? <Flame size={20} /> : <Clock size={20} />}
                          </div>
                          <div className="w-full">
                            <div className="flex items-center gap-3 mb-1.5">
                              <h3 className="text-lg font-bold text-white/90 tracking-tight">
                                {item.leads?.full_name || "Unknown Lead"}
                              </h3>
                              {isHot && (
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  Score {item.leads.ai_score}
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
                                Pending
                              </span>
                            </div>
                            
                            <p className="text-sm text-white/60 mb-4 max-w-3xl leading-relaxed">
                              {item.title} — {item.description}
                            </p>
                            
                            {/* AI Draft Message Preview */}
                            {item.ai_message && (
                              <div className="bg-violet-950/20 border border-violet-500/10 rounded-xl p-4 max-w-2xl relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500/50"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2 flex items-center gap-1.5">
                                  <Sparkles size={12}/> AI Drafted Response
                                </span>
                                <p className="text-sm text-violet-100/70 italic line-clamp-2 leading-relaxed font-medium">"{item.ai_message}"</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* One-Tap Execution Buttons */}
                        <div className="flex flex-row gap-3 w-full lg:w-auto shrink-0 justify-end">
                          {item.ai_message && (
                            <button 
                              onClick={() => sendAiFollowupQuick(item)}
                              className="flex-1 lg:flex-none px-5 py-3 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-sm font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20"
                            >
                              <Send size={16} /> Dispatch
                            </button>
                          )}
                          <Link 
                            href={`/leads/${item.lead_id}`} 
                            className="flex-1 lg:flex-none px-5 py-3 bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold tracking-wide rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all"
                          >
                            Review <ArrowRight size={16} className="text-white/40 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* DIVIDER */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>

            {/* TRADITIONAL DATABASE / REPORTING VIEW */}
            <section className="opacity-90">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Pipeline Intelligence
                </h2>
                <span className="text-xs text-white/30 font-medium">Auto-synced securely</span>
              </div>
              
              <div className="mb-8">
                <AnalyticsCards />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <RecentLeadsTable leads={leads} loading={loading} />
                </div>
                <div className="xl:col-span-1">
                  <HotLeadsPanel />
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      <AddLeadModal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onLeadCreated={loadLeads}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}} />
    </div>
  );
}