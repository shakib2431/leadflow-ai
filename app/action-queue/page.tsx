"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Mail, ShieldAlert, Sparkles, CheckCircle, RefreshCw } from "lucide-react";

interface ActionItem {
  lead_id: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  ai_score?: number;
  context_type?: string;
  reasoning?: string;
  recommended_channel?: "whatsapp" | "email";
  subject_line?: string;
  pre_drafted_content?: string;
}

export default function ActionQueuePage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch("/api/action-queue");
      const data = await res.json();
      if (res.ok) setActions(data.actions || []);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  function handleDismiss(leadId: string) {
    setActions(prev => prev.filter(item => item.lead_id !== leadId));
  }

  async function executeAction(action: ActionItem) {
    const channel = action.recommended_channel || "whatsapp";
    const content = action.pre_drafted_content || "Following up regarding our last conversation.";
    
    if (channel === "whatsapp") {
      const url = `https://wa.me/${action.phone}?text=${encodeURIComponent(content)}`;
      window.open(url, "_blank");
    } else {
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: action.lead_id,
            to: action.email,
            subject: action.subject_line || "Following up",
            body: content,
          }),
        });
        alert(`Email dispatched successfully to ${action.full_name}`);
      } catch (err) {
        alert("Failed routing email message out.");
      }
    }
    handleDismiss(action.lead_id);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            <Sparkles className="text-cyan-400 animate-pulse" /> Kinetic Command Center
          </h1>
          <p className="text-white/40 mt-1.5 text-sm">
            Autonomous context tracking engine routing high-priority pipeline opportunities.
          </p>
        </div>
        <button 
          onClick={fetchQueue}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Re-Scan Pipeline
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-9 h-9 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin" />
          <p className="text-sm text-white/40 tracking-wide font-medium animate-pulse">
            Aggregating real-time business telemetry and building asset drafts...
          </p>
        </div>
      ) : actions.length === 0 ? (
        <div className="border border-white/5 bg-[#111827]/30 rounded-3xl p-12 text-center max-w-xl mx-auto mt-10 shadow-xl shadow-black/50">
          <CheckCircle className="mx-auto text-green-400 mb-4" size={44} />
          <h3 className="text-xl font-semibold">Queue Fully Cleared</h3>
          <p className="text-white/40 text-sm mt-2 leading-relaxed">
            All active accounts possess live conversational traction. No manual oversight constraints detected.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {actions.map((action) => {
            const currentChannel = action.recommended_channel || "whatsapp";
            const currentScore = action.ai_score ?? 50;
            const currentReasoning = action.reasoning || "Lead requires proactive baseline conversational follow-up loop.";
            const currentContent = action.pre_drafted_content || "Hi! Just following up to see if you had any questions regarding our previous discussion.";

            return (
              <div 
                key={action.lead_id} 
                className="bg-[#111827] border border-white/10 rounded-3xl p-6 transition-all hover:border-white/20 relative overflow-hidden shadow-lg"
              >
                {/* SIDE CHANNEL INDICATOR BAND */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  action.context_type === "INBOUND_REPLY" ? "bg-cyan-500" : "bg-violet-500"
                }`} />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold tracking-tight text-white/90">{action.full_name}</h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-white/5 text-white/50 border border-white/10 uppercase tracking-wider">
                        {action.status || "active"}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        currentScore >= 70 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        Score: {currentScore}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mt-2 flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 w-fit">
                      <ShieldAlert size={14} className="text-cyan-400 flex-shrink-0" /> 
                      <span>{currentReasoning}</span>
                    </p>
                  </div>

                  <Link 
                    href={`/leads/${action.lead_id}`}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 group bg-cyan-500/5 px-3.5 py-2 rounded-xl border border-cyan-500/10 transition-all self-end sm:self-auto"
                  >
                    Deep Workspace <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                {/* COPYWRITING DRAFT BOX */}
                <div className="bg-black/30 border border-white/5 rounded-2xl p-5 mb-5 shadow-inner">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      {currentChannel === "whatsapp" ? (
                        <MessageSquare size={13} className="text-green-400" />
                      ) : (
                        <Mail size={13} className="text-violet-400" />
                      )}
                      Pre-Drafted Action ({currentChannel})
                    </span>
                  </div>
                  {currentChannel === "email" && action.subject_line && (
                    <p className="text-sm font-semibold text-white/70 mb-2">Subject: {action.subject_line}</p>
                  )}
                  <p className="text-sm font-mono text-white/80 whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                    {currentContent}
                  </p>
                </div>

                {/* ACTION ROW */}
                <div className="flex justify-end items-center gap-3 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => handleDismiss(action.lead_id)}
                    className="px-4 py-2 rounded-xl border border-white/5 text-xs font-medium text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
                  >
                    Skip Action
                  </button>
                  <button 
                    onClick={() => executeAction(action)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                      currentChannel === "whatsapp" 
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/10" 
                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/10"
                    }`}
                  >
                    {currentChannel === "whatsapp" ? "Approve & Send via WhatsApp" : "Approve & Dispatch Email"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}