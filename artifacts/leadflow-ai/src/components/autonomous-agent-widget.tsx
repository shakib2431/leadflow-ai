

import { useEffect, useState } from "react";
import { 
  Bot, Mail, MessageSquare, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, Send, Clock, Activity, Zap 
} from "lucide-react";

interface AgentAction {
  action_id: string;
  lead_id: string;
  full_name: string;
  phone: string;
  email: string;
  type: "EMAIL" | "WHATSAPP" | "FOLLOW_UP" | "REVIVAL";
  reasoning: string;
  revenue_impact: "High" | "Medium" | "Low";
  subject_line: string;
  draft_content: string;
}

export default function AutonomousAgentWidget() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function wakeAgent() {
      try {
        // 1. Set a 15-second timeout to prevent the 30s Vercel/Browser crash
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch("/api/revenue-agent", {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if it succeeds quickly

        // 2. Catch 503 or 500 errors gracefully if the AI model is busy
        if (!res.ok) {
          console.warn(`Agent API returned status: ${res.status} - Model likely busy.`);
          return; // Exit early before trying to parse JSON
        }

        const data = await res.json();
        setActions(data.actions || []);

      } catch (err: any) {
        // 3. Log specifically if it was a timeout vs a network crash
        if (err.name === 'AbortError') {
          console.error("Agent failed to wake: Request timed out.");
        } else {
          console.error("Agent failed to wake:", err.message);
        }
      } finally {
        // 4. Always turn off the loading state, even if the API failed
        setLoading(false);
      }
    }
    
    wakeAgent();
  }, []);
  const handleReject = (actionId: string) => {
    // Optimistic UI update
    setActions(prev => prev.filter(a => a.action_id !== actionId));
  };

  const handleApprove = async (action: AgentAction) => {
    // Logic to save approved draft to DB without sending immediately
    alert(`Action for ${action.full_name} approved and queued for manual review.`);
    setActions(prev => prev.filter(a => a.action_id !== action.action_id));
  };

  const handleExecute = async (action: AgentAction) => {
    setProcessingId(action.action_id);
    
    try {
      if (action.type === "WHATSAPP" || action.type === "REVIVAL") {
        const url = `https://wa.me/${action.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(action.draft_content)}`;
        window.open(url, "_blank");
      } else {
        // Assume you have a send-email route set up with Resend/SendGrid
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: action.email,
            subject: action.subject_line || "LeadFlow AI: Priority Update",
            body: action.draft_content,
          }),
        });
      }
      
      // Remove from queue on success
      setActions(prev => prev.filter(a => a.action_id !== action.action_id));
    } catch (err) {
      console.error("Execution failed:", err);
      alert("Failed to execute action. Check logs.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden h-72 flex flex-col items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" />
        <Bot size={36} className="text-white/40 mb-4 animate-pulse" />
        <p className="text-white/60 text-sm tracking-widest uppercase font-semibold">Initializing Neural Pipeline...</p>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 text-center flex flex-col items-center justify-center h-72">
        <Activity className="text-emerald-500/50 mb-4" size={36} />
        <h3 className="text-white/90 font-bold text-lg">Pipeline Optimized</h3>
        <p className="text-white/40 text-sm mt-2">Zero critical risks detected. Agent on standby.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-purple-900/20 rounded-xl border border-purple-500/20">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Autonomous Revenue Agent</h2>
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mt-0.5">Execution Queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/80">
          <TrendingUp size={14} className="text-purple-400" /> {actions.length} Actions
        </div>
      </div>

      {/* Action Cards */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {actions.map((action) => (
          <div key={action.action_id} className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-colors duration-300">
            
            {/* Context Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-base font-bold text-white/90">{action.full_name}</h4>
                <p className="text-[11px] text-white/50 mt-1.5 flex items-center gap-1.5 max-w-md">
                  <AlertTriangle size={12} className="text-white/30" /> 
                  <span className="leading-relaxed">{action.reasoning}</span>
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border ${
                  action.revenue_impact === "High" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                  action.revenue_impact === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                  "bg-white/5 text-white/50 border-white/10"
                }`}>
                  {action.revenue_impact} Impact
                </span>
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {action.type.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* AI Draft Content */}
            <div className="bg-black/50 rounded-xl p-4 mb-5 border border-white/5">
              {action.type === "EMAIL" && action.subject_line && (
                <div className="text-xs text-white/90 font-semibold mb-2 pb-2 border-b border-white/5">
                  <span className="text-white/40 mr-2">Subject:</span> {action.subject_line}
                </div>
              )}
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-medium">
                {action.draft_content}
              </p>
            </div>

            {/* Execution Controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleExecute(action)}
                disabled={processingId === action.action_id}
                className="flex-1 bg-white text-black hover:bg-gray-200 disabled:opacity-50 text-sm font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-2"
              >
                {processingId === action.action_id ? (
                  <Activity size={16} className="animate-pulse" />
                ) : (
                  <Send size={16} />
                )}
                {processingId === action.action_id ? "Executing..." : "Execute Immediately"}
              </button>
              
              <button 
                onClick={() => handleApprove(action)}
                className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20 disabled:opacity-50 text-sm font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-2"
              >
                <CheckCircle size={16} />
                Approve to Queue
              </button>

              <button 
                onClick={() => handleReject(action.action_id)}
                className="px-4 py-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-white/40 text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center justify-center"
                title="Reject Action"
              >
                <XCircle size={18} />
              </button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}