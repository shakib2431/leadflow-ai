"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, MessageSquare, Mail, ShieldAlert, Sparkles, 
  CheckCircle, RefreshCw, X, Database 
} from "lucide-react";

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
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    setProcessingId(action.lead_id);
    const channel = action.recommended_channel || "whatsapp";
    const content = action.pre_drafted_content || "Following up regarding our last conversation.";
    
    if (channel === "whatsapp") {
      const url = `https://wa.me/${action.phone}?text=${encodeURIComponent(content)}`;
      window.open(url, "_blank");
      handleDismiss(action.lead_id);
      setProcessingId(null);
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
        handleDismiss(action.lead_id);
      } catch (err) {
        alert("Failed routing email message out.");
      } finally {
        setProcessingId(null);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-violet-400" size={28} />
              AI Action Queue
            </h1>
            <p className="text-white/40 mt-2 text-sm">
              Autonomous context tracking engine routing high-priority pipeline opportunities.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Agent Active</span>
            </div>
            <button 
              onClick={fetchQueue}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              title="Re-Scan Pipeline"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-cyan-400" : ""} />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-10 h-10 border-2 border-t-transparent border-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-white/40 tracking-wide font-medium animate-pulse">
              Aggregating real-time business telemetry and generating drafts...
            </p>
          </div>
        ) : actions.length === 0 ? (
          /* EMPTY STATE (INBOX ZERO) */
          <div className="border border-white/5 border-dashed bg-white/[0.02] rounded-3xl p-16 text-center max-w-xl mx-auto mt-10">
            <CheckCircle className="mx-auto text-white/20 mb-5" size={54} />
            <h3 className="text-2xl font-bold text-white/60">Queue Cleared</h3>
            <p className="text-white/30 text-sm mt-3 leading-relaxed">
              All active accounts possess live conversational traction. No manual oversight constraints detected.
            </p>
          </div>
        ) : (
     /* QUEUE LIST */
          <div className="space-y-5">
            {actions.map((action) => {
              const currentChannel = action.recommended_channel || "whatsapp";
              const currentScore = action.ai_score ?? 50;
              const isProcessing = processingId === action.lead_id;
              
              // 1. ADDED THIS LINE: Creates a fallback if the API returns an empty draft
              const currentContent = action.pre_drafted_content || "Hi! Just following up to see if you had any questions regarding our previous discussion.";

              return (
                <div 
                  key={action.lead_id} 
                  className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
                    isProcessing ? "opacity-50 scale-[0.99] border-white/5" : "bg-[#0d0e12] border-white/5 hover:border-white/20"
                  }`}
                >
                  {/* Left Highlight Bar */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    currentChannel === "whatsapp" ? "bg-green-500" : "bg-violet-500"
                  }`} />

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Info Section */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{action.full_name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          currentScore >= 70 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          Score: {currentScore}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-2 mt-3 text-sm text-white/50 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                        <ShieldAlert size={16} className="text-cyan-400 shrink-0 mt-0.5" /> 
                        <p>{action.reasoning || "Requires proactive baseline conversational follow-up."}</p>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-[1.5] bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                            {currentChannel === "whatsapp" ? <MessageSquare size={12} className="text-green-400"/> : <Mail size={12} className="text-violet-400"/>}
                            Pre-Drafted {currentChannel}
                          </span>
                          <Link href={`/leads/${action.lead_id}`} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                            Workspace <ArrowRight size={10} />
                          </Link>
                        </div>
                        
                        {currentChannel === "email" && action.subject_line && (
                          <p className="text-xs font-semibold text-white/70 mb-2 truncate">Subject: {action.subject_line}</p>
                        )}
                        
                        {/* 2. CHANGED THIS LINE: Now uses currentContent instead of action.pre_drafted_content */}
                        <p className="text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {currentContent}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => handleDismiss(action.lead_id)}
                          disabled={isProcessing}
                          className="p-2 rounded-lg text-white/30 hover:bg-white/5 hover:text-white/80 transition-colors"
                          title="Skip Action"
                        >
                          <X size={16} />
                        </button>
                        <button 
                          onClick={() => executeAction(action)}
                          disabled={isProcessing}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            isProcessing ? "bg-white/10 text-white/40 cursor-wait" :
                            currentChannel === "whatsapp" 
                              ? "bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20" 
                              : "bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-500/20"
                          }`}
                        >
                          {isProcessing ? (
                            <span className="animate-pulse">Dispatching...</span>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              {currentChannel === "whatsapp" ? "Approve & Send WA" : "Approve & Send Email"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}