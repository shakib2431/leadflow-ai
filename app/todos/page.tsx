"use client";

import React, { useEffect, useState } from "react";
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ListTodo,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Mail,
  Phone,
  MessageSquare,
  Check
} from "lucide-react";
import { supabaseAuth } from "@/lib/auth";

interface AIDraftPayload {
  message_copy?: string;
  negotiation_points?: string[];
  blocker_warning?: string;
}

interface CRMTodo {
  id: string;
  lead_id: string;
  title: string;
  description: string;
  priority_score: number;
  task_type: 'whatsapp' | 'email' | 'call' | 'revival' | 'admin';
  status: 'pending' | 'completed' | 'skipped';
  ai_draft_payload: AIDraftPayload;
  due_date: string;
  created_at: string;
  leads?: {
    full_name: string;
    phone: string;
    email: string;
    status: string;
  };
}

export default function TodosPage() {
  const [tasks, setTasks] = useState<CRMTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const now = new Date();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/todos");
      const result = await res.json();
      if (result.success) {
        setTasks(result.data || []);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/todos", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        await fetchTasks();
      }
    } catch (err) {
      alert("Failed generating automated task configurations.");
    } finally {
      setSyncing(false);
    }
  };

  const completeTask = async (id: string) => {
    try {
      const { error } = await supabaseAuth
        .from("crm_todos")
        .update({ status: "completed" })
        .eq("id", id);
      
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error finalizing status token:", err);
    }
  };

  const dispatchAction = async (task: CRMTodo) => {
    if (!task.leads?.phone || !task.ai_draft_payload.message_copy) return;
    try {
      const route = task.task_type === "whatsapp" ? "/api/send-whatsapp" : "/api/send-email";
      await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: task.leads.phone,
          email: task.leads.email,
          message: task.ai_draft_payload.message_copy,
        }),
      });
      alert("Action dispatched successfully via system engine nodes.");
      await completeTask(task.id);
    } catch (err) {
      console.error("Outreach API dispatch failure:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "whatsapp": return <MessageSquare className="w-3.5 h-3.5 text-green-400" />;
      case "email": return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case "call": return <Phone className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Zap className="w-3.5 h-3.5 text-violet-400" />;
    }
  };

  // Premium Skeleton Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030305] p-8 w-full font-sans relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-6 relative z-10 mt-8">
          <div className="h-12 w-64 bg-white/[0.02] rounded-xl animate-pulse mb-12" />
          <div className="grid md:grid-cols-4 grid-cols-2 gap-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-white/[0.02] animate-pulse border border-white/[0.02]" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-[2rem] bg-white/[0.02] animate-pulse border border-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 p-8 md:p-12 w-full font-sans relative overflow-x-hidden selection:bg-purple-500/30">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] uppercase tracking-widest font-medium mb-4">
              <Sparkles size={12} /> Outreach Hub
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-100">
              AI Task Orchestrator
            </h1>
            <p className="text-zinc-500 mt-3 font-light text-sm md:text-base tracking-wide max-w-xl">
              Context-injected automated revenue priorities, communication templates, and strategic account execution.
            </p>
          </div>
          
          <button 
            onClick={generateTasks}
            disabled={syncing}
            className="h-12 px-6 rounded-full bg-zinc-100 text-zinc-900 hover:bg-white transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] group disabled:opacity-50"
          >
            <RefreshCw size={16} className={`transition-transform duration-500 ${syncing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            {syncing ? 'Syncing Pipeline...' : 'Regenerate Daily Tasks'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 grid-cols-2 gap-4 md:gap-6 mb-12">
          
          <div className="group relative overflow-hidden rounded-3xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] p-6 transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">Total Queue</p>
              <ListTodo size={16} className="text-zinc-600" />
            </div>
            <h2 className="text-4xl font-light text-zinc-100">{tasks.length}</h2>
          </div>

          <div className="group relative overflow-hidden rounded-3xl bg-white/[0.01] hover:bg-purple-500/[0.02] border border-white/[0.05] hover:border-purple-500/30 p-6 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium group-hover:text-purple-400/70 transition-colors">High Priority</p>
              <Clock size={16} className="text-purple-500/50" />
            </div>
            <h2 className="text-4xl font-light text-purple-400 relative z-10">
              {tasks.filter((t) => t.priority_score >= 75).length}
            </h2>
          </div>

          <div className="group relative overflow-hidden rounded-3xl bg-white/[0.01] hover:bg-emerald-500/[0.02] border border-white/[0.05] hover:border-emerald-500/30 p-6 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium group-hover:text-emerald-500/70 transition-colors">WhatsApp Dispatches</p>
              <MessageSquare size={16} className="text-emerald-500/50" />
            </div>
            <h2 className="text-4xl font-light text-emerald-400 relative z-10">
              {tasks.filter((t) => t.task_type === "whatsapp").length}
            </h2>
          </div>

          <div className="group relative overflow-hidden rounded-3xl bg-white/[0.01] hover:bg-rose-500/[0.02] border border-white/[0.05] hover:border-rose-500/30 p-6 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium group-hover:text-rose-500/70 transition-colors">Overdue Risks</p>
              <AlertCircle size={16} className="text-rose-500/50" />
            </div>
            <h2 className="text-4xl font-light text-rose-400 relative z-10">
              {tasks.filter((t) => new Date(t.due_date) < now).length}
            </h2>
          </div>

        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.01] backdrop-blur-sm p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 size={32} className="text-purple-400" />
            </div>
            <h2 className="text-2xl font-medium text-zinc-200">Task Queue Cleared</h2>
            <p className="text-zinc-500 mt-3 font-light max-w-sm">
              All client risks, stale conversation blocks, and pricing follow-ups have been resolved.
            </p>
          </div>
        )}

        {/* Task Core Loop List */}
        <div className="space-y-4">
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const overdue = new Date(task.due_date) < now;

            return (
              <div
                key={task.id}
                className={`group relative bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-6 md:p-8 transition-all duration-500 hover:bg-white/[0.03] hover:border-white/[0.1]`}
              >
                {/* Left Indicator bar matching type logic updates */}
                <div className={`absolute left-0 top-8 bottom-8 w-[3px] rounded-r-full transition-colors duration-500 ${
                  task.priority_score >= 80 ? "bg-purple-500" : overdue ? "bg-rose-500" : "bg-zinc-700"
                }`} />

                <div 
                  className="flex flex-col lg:flex-row gap-6 justify-between cursor-pointer"
                  onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                >
                  
                  {/* Main Header Text content parameters */}
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          await completeTask(task.id);
                        }}
                        className="w-5 h-5 rounded-md border border-white/10 hover:border-emerald-500 flex items-center justify-center hover:bg-emerald-500/10 transition group/btn shrink-0"
                      >
                        <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400" />
                      </button>
                      
                      <h2 className="font-medium text-xl text-zinc-100 tracking-wide">
                        {task.leads?.full_name || "Unknown Account Target"}
                      </h2>
                      
                      {/* Operational Badges */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] uppercase tracking-widest font-medium">
                        {getTaskIcon(task.task_type)} {task.task_type}
                      </span>

                      {task.priority_score >= 85 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] uppercase tracking-widest font-semibold">
                          Impact: {task.priority_score}
                        </span>
                      )}
                    </div>

                    <p className="text-zinc-400 font-light text-sm md:text-base leading-relaxed max-w-4xl">
                      <span className="text-zinc-200 font-medium">{task.title}:</span> {task.description}
                    </p>
                  </div>

                  {/* Right hand layout scheduler configuration components */}
                  <div className="lg:w-64 shrink-0 flex flex-col justify-between items-start lg:items-end pl-2 lg:pl-0 border-t border-white/[0.05] lg:border-t-0 pt-4 lg:pt-0">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Calendar size={14} />
                      <div className="text-xs tracking-wide">
                        <span className="block text-[10px] uppercase tracking-widest opacity-50">Timeline Allocation</span>
                        {new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    <div className="text-zinc-600 mt-2 lg:mt-0">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} className="group-hover:text-zinc-400 transition" />}
                    </div>
                  </div>
                </div>

                {/* Context-Injected Expanded Tray Panel Components */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-white/[0.04] bg-black/20 rounded-2xl p-5 md:p-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Message Payload Generation Center */}
                      <div className="lg:col-span-2 space-y-4">
                        {task.ai_draft_payload.message_copy ? (
                          <div className="relative rounded-2xl bg-[#0a0a0c] border border-purple-500/20 p-5 pl-14 overflow-hidden group-hover:border-purple-500/40 transition-colors duration-500">
                            <div className="absolute left-0 top-0 bottom-0 w-10 bg-purple-500/10 flex items-start justify-center pt-5 border-r border-purple-500/20">
                              <Sparkles size={16} className="text-purple-400" />
                            </div>
                            <div className="text-[10px] text-purple-400/80 mb-2 uppercase tracking-widest font-medium">
                              Context-Aware Outreach Script
                            </div>
                            <p className="text-sm font-light text-zinc-300 whitespace-pre-wrap leading-relaxed italic">
                              "{task.ai_draft_payload.message_copy}"
                            </p>
                            
                            <div className="mt-5 flex justify-end">
                              <button 
                                onClick={() => dispatchAction(task)}
                                className="h-10 px-5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium tracking-wide transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                              >
                                <Send size={12} /> Dispatch Action Vector
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-xs italic">No message required for this task structure.</p>
                        )}
                      </div>

                      {/* Right: Negotiation Target parameters & Risk indicators */}
                      <div className="space-y-4">
                        {task.ai_draft_payload.negotiation_points && task.ai_draft_payload.negotiation_points.length > 0 && (
                          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2 tracking-widest">Account Strategy Targets</span>
                            <ul className="space-y-1.5 pl-4 list-disc text-xs text-zinc-400 font-light">
                              {task.ai_draft_payload.negotiation_points.map((point, idx) => (
                                <li key={idx} className="leading-relaxed">{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {task.ai_draft_payload.blocker_warning && (
                          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex gap-3 items-start">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block tracking-widest">Risk Bottleneck</span>
                              <p className="text-xs text-rose-300/70 font-light leading-relaxed mt-0.5">{task.ai_draft_payload.blocker_warning}</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}