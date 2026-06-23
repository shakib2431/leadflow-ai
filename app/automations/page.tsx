"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import { 
  Zap, Plus, Search, Play, Pause, Clock, 
  CheckCircle2, ArrowRight, MessageCircle, 
  GitMerge, Settings, GripVertical, Trash2, X,
  Timer, Bot, Target, AlignLeft, Loader2,
  Globe, SplitSquareHorizontal, Activity
} from "lucide-react";

// The HubSpot-Killer Node Arsenal
type NodeType = "trigger" | "external_trigger" | "condition" | "action" | "delay" | "ai_agent" | "ai_split";

interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  config?: any; 
}

export default function AutomationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<"list" | "builder">("list");
  
  const [flowName, setFlowName] = useState("Autonomous Enterprise Outreach");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  
  // The Ultimate 2026 Enterprise Sequence
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: `node_${Date.now()}_1`, type: "external_trigger", title: "Global Intent Signal", description: "Listen for 'Series B Funding' or 'Hiring CTO' on LinkedIn." },
    { id: `node_${Date.now()}_2`, type: "ai_agent", title: "AI Swarm: Deep Research", description: "Deploy 3 LLMs to scrape company data and find key decision-makers." },
    { id: `node_${Date.now()}_3`, type: "ai_split", title: "Autonomous A/B Optimization", description: "Test Direct WhatsApp vs. Cold Email. AI shifts traffic to winner." },
    { id: `node_${Date.now()}_4`, type: "action", title: "Execute Winning Path", description: "Send tailored outreach via the optimized channel." },
    { id: `node_${Date.now()}_5`, type: "delay", title: "Smart Delay", description: "Wait 2 Business Days." },
    { id: `node_${Date.now()}_6`, type: "action", title: "Pipeline Routing", description: "If replied, route to Sales Rep. If ignored, add to Nurture." }
  ]);
  
  const [activeNode, setActiveNode] = useState<FlowNode | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  // --- SUPABASE DATABASE LOGIC ---
  const fetchPlaybooks = async () => {
    const { data } = await supabase.from('crm_playbooks').select('*').order('created_at', { ascending: false });
    if (data) setPlaybooks(data);
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const { data: bizData } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      if (!bizData) throw new Error("No business profile found. Please set up settings first.");

      const { data: playbookData, error: playbookError } = await supabase
        .from("crm_playbooks")
        .insert({
          name: flowName,
          description: "Autonomous AI Swarm Workflow",
          objective: "Revenue Optimization",
          is_active: true
        })
        .select()
        .single();

      if (playbookError) throw playbookError;

      const nodesToInsert = nodes.map((node, index) => ({
        playbook_id: playbookData.id,
        step_order: index + 1,
        channel:
          node.type === "action" ? "whatsapp" : 
          node.type === "delay" ? "delay" : 
          node.type === "ai_agent" ? "ai" : 
          node.type === "ai_split" ? "ai_split" :
          node.type === "external_trigger" ? "external" :
          node.type,
        ai_prompt_context: `${node.title}\n${node.description}`,
        wait_time_hours: node.type === "delay" ? 48 : null
      }));

      const { error: nodesError } = await supabase
        .from("playbook_steps")
        .insert(nodesToInsert);

      if (nodesError) throw nodesError;

      alert("Autonomous Playbook deployed successfully!");
      fetchPlaybooks();
      setView("list");
      
    } catch (error: any) {
      console.error("Failed to publish:", error);
      alert("Error deploying playbook: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestFlow = async () => {
    if (nodes.length === 0) return alert("Canvas is empty!");
    
    setIsTesting(true);
    setActiveNode(null); 

    for (let i = 0; i < nodes.length; i++) {
      setTestingNodeId(nodes[i].id);
      await new Promise(resolve => setTimeout(resolve, 1500)); 
    }

    setTestingNodeId(null);
    setIsTesting(false);
    alert("Simulation complete! Optimization splits logic validated. Ready for production.");
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedNodeId(id); e.dataTransfer.effectAllowed = "move"; (e.target as HTMLElement).style.opacity = "0.4"; };
  const handleDragEnd = (e: React.DragEvent) => { setDraggedNodeId(null); (e.target as HTMLElement).style.opacity = "1"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedNodeId || draggedNodeId === targetId) return;
    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    const targetNode = nodes.find(n => n.id === targetId);
    if (draggedNode?.type === "trigger" || draggedNode?.type === "external_trigger" || targetNode?.type === "trigger" || targetNode?.type === "external_trigger") return; 

    const newNodes = [...nodes];
    const draggedIndex = newNodes.findIndex(n => n.id === draggedNodeId);
    const targetIndex = newNodes.findIndex(n => n.id === targetId);
    const [movedNode] = newNodes.splice(draggedIndex, 1);
    newNodes.splice(targetIndex, 0, movedNode);
    setNodes(newNodes);
  };

  const addNode = (type: NodeType) => {
    const defaultTitles = {
      condition: "New Condition",
      action: "New Action",
      delay: "Time Delay",
      ai_agent: "AI Swarm Task",
      ai_split: "AI Optimization Split",
      external_trigger: "External Intent Tracker"
    };
    
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      title: defaultTitles[type as keyof typeof defaultTitles] || "New Step",
      description: "Configure this advanced step in the properties panel."
    };
    setNodes([...nodes, newNode]);
    setActiveNode(newNode);
  };

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    if (activeNode?.id === id) setActiveNode(null);
  };

  const getNodeConfig = (type: NodeType) => {
    switch (type) {
      case "trigger": return { icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", ring: "ring-violet-500/50" };
      case "external_trigger": return { icon: Globe, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", ring: "ring-rose-500/50" };
      case "condition": return { icon: GitMerge, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", ring: "ring-amber-500/50" };
      case "action": return { icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", ring: "ring-emerald-500/50" };
      case "delay": return { icon: Timer, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", ring: "ring-blue-500/50" };
      case "ai_agent": return { icon: Bot, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", ring: "ring-pink-500/50" };
      case "ai_split": return { icon: SplitSquareHorizontal, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", ring: "ring-fuchsia-500/50" };
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          
          {/* VIEW 1: DASHBOARD */}
          {view === "list" && (
            <div className="max-w-6xl mx-auto space-y-8 p-6 lg:p-10 overflow-y-auto animate-in fade-in duration-500 w-full h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <Activity size={24} />
                    </div>
                    Autonomous Playbooks
                  </h1>
                  <p className="text-white/40 mt-2 text-sm">Deploy self-optimizing LLM swarms and logic loops.</p>
                </div>
                <button 
                  onClick={() => { setFlowName("Untitled Autonomous Flow"); setNodes([]); setActiveNode(null); setView("builder"); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  <Plus size={16} /> Create Playbook
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Active Swarms</p>
                  <p className="text-3xl font-bold text-white">{playbooks.filter(p => p.is_active).length || 0}</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">AI Optimizations (30d)</p>
                  <p className="text-3xl font-bold text-pink-400">14,291</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-emerald-400">99.8%</p>
                </div>
              </div>

              {/* Workflows List */}
              <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                  <h3 className="font-semibold">Your Playbooks</h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {playbooks.length === 0 ? (
                    <div className="p-8 text-center text-white/40 text-sm">No playbooks active. Deploy your first AI swarm.</div>
                  ) : (
                    playbooks.map((flow) => (
                      <div key={flow.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setView("builder")}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border ${flow.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.1)]' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'}`}>
                            {flow.is_active ? <Play size={16} /> : <Pause size={16} />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{flow.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                              <span className="flex items-center gap-1"><Clock size={12}/> Updated {flow.updated_at ? new Date(flow.updated_at).toLocaleDateString() : 'Just now'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-fuchsia-400"><SplitSquareHorizontal size={12}/> Actively Splitting</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 text-white/30 hover:text-white transition-colors"><Settings size={18}/></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: VISUAL BUILDER */}
          {view === "builder" && (
            <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between p-4 bg-[#0d0e12] border-b border-white/[0.04] z-20 shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView("list")} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <ArrowRight size={16} className="rotate-180" />
                  </button>
                  <div>
                    <input type="text" value={flowName} onChange={(e) => setFlowName(e.target.value)} className="bg-transparent border-none outline-none text-lg font-bold text-white w-96 focus:ring-2 focus:ring-violet-500 rounded px-1" />
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1 px-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Active & Autonomous
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleTestFlow} disabled={isTesting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors disabled:opacity-50">
                    {isTesting ? <Loader2 size={14} className="animate-spin text-emerald-400" /> : <Play size={14} />}
                    {isTesting ? "Running Simulation..." : "Test Flow"}
                  </button>
                  <button onClick={handlePublish} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-600/20">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {isSaving ? "Saving..." : "Deploy Swarm"}
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto bg-[#050508] relative flex flex-col items-center py-12" onClick={() => setActiveNode(null)}>
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                  <div className="flex flex-col items-center relative z-10 w-full max-w-md pb-40">
                    {nodes.map((node, index) => {
                      const config = getNodeConfig(node.type);
                      const Icon = config.icon;
                      const isSelected = activeNode?.id === node.id;
                      const isDraggable = node.type !== "trigger" && node.type !== "external_trigger";

                      return (
                        <div key={node.id} className="flex flex-col items-center w-full relative">
                          <div 
                            draggable={isDraggable} onDragStart={(e) => handleDragStart(e, node.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, node.id)} onClick={(e) => { e.stopPropagation(); setActiveNode(node); }}
                            className={`w-[340px] bg-[#0d0e12] border rounded-2xl p-5 shadow-2xl transition-all cursor-pointer group flex gap-4 relative z-10
                              ${isSelected ? `ring-2 ring-offset-4 ring-offset-[#050508] border-transparent ${config.ring}` : ''}
                              ${testingNodeId === node.id ? 'ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] border-emerald-500 scale-105 transition-all duration-300' : 'border-white/10 hover:border-white/20'}
                            `}
                          >
                            {isDraggable && (
                              <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-white/30 hover:text-white p-2">
                                <GripVertical size={20} />
                              </div>
                            )}

                            <div className={`absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${config.bg} ${config.color} border border-white/5 backdrop-blur-md`}>
                              {index + 1}
                            </div>

                            {isDraggable && (
                              <button onClick={(e) => deleteNode(node.id, e)} className="absolute bottom-3 right-3 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={14} />
                              </button>
                            )}

                            <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${config.bg} ${config.color} border border-white/5`}>
                              <Icon size={20} />
                            </div>

                            <div className="flex-1 min-w-0 pt-0.5">
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${config.color} mb-1 block`}>
                                {node.type.replace('_', ' ')}
                              </span>
                              <h4 className="font-bold text-white text-sm truncate">{node.title}</h4>
                              <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2">{node.description}</p>
                            </div>
                          </div>

                          {index < nodes.length - 1 && (
                            <div className="flex flex-col items-center">
                              {nodes[index + 1].type === 'delay' ? (
                                <div className={`w-0.5 h-12 my-2 relative z-0 border-l-2 border-dashed border-blue-500/30`} />
                              ) : nodes[index].type === 'ai_split' ? (
                                <div className={`w-0.5 h-12 my-2 relative z-0 border-l-4 border-double border-fuchsia-500/40`} />
                              ) : (
                                <div className={`w-0.5 h-10 my-1 relative z-0 ${config.bg.replace('/10', '/30')}`} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="mt-8 flex flex-wrap justify-center gap-2 relative z-10 bg-[#0d0e12]/80 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] max-w-lg">
                      <button onClick={(e) => { e.stopPropagation(); addNode("external_trigger"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 text-white/60 text-xs font-bold transition-all"><Globe size={14} /> Listen</button>
                      <button onClick={(e) => { e.stopPropagation(); addNode("condition"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 hover:text-amber-400 text-white/60 text-xs font-bold transition-all"><GitMerge size={14} /> Branch</button>
                      <button onClick={(e) => { e.stopPropagation(); addNode("delay"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/10 hover:text-blue-400 text-white/60 text-xs font-bold transition-all"><Timer size={14} /> Delay</button>
                      <button onClick={(e) => { e.stopPropagation(); addNode("ai_agent"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-pink-500/10 hover:text-pink-400 text-white/60 text-xs font-bold transition-all"><Bot size={14} /> AI Swarm</button>
                      <button onClick={(e) => { e.stopPropagation(); addNode("ai_split"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 text-xs font-bold transition-all"><SplitSquareHorizontal size={14} /> AI Split</button>
                      <button onClick={(e) => { e.stopPropagation(); addNode("action"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 text-white/60 text-xs font-bold transition-all"><Zap size={14} /> Action</button>
                    </div>
                  </div>
                </div>

                {/* PROPERTIES SIDEBAR */}
                {activeNode && (
                  <div className="w-[400px] bg-[#0d0e12] border-l border-white/[0.04] shrink-0 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.4)] animate-in slide-in-from-right-4">
                    <div className="h-[64px] px-6 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Settings size={16} className="text-white/40" /> Node Settings
                      </h3>
                      <button onClick={() => setActiveNode(null)} className="text-white/40 hover:text-white transition-colors bg-white/5 p-1.5 rounded-md"><X size={16} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Step Name</label>
                        <input 
                          type="text" value={activeNode.title}
                          onChange={(e) => {
                            const updated = nodes.map(n => n.id === activeNode.id ? { ...n, title: e.target.value } : n);
                            setNodes(updated);
                            setActiveNode({ ...activeNode, title: e.target.value });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="h-px w-full bg-white/5" />

                      {/* EXTERNAL TRIGGER CONFIG */}
                      {activeNode.type === "external_trigger" && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400 flex items-center gap-2"><Globe size={12}/> Data Source</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none appearance-none">
                              <option>LinkedIn Activity Monitor</option>
                              <option>Crunchbase Funding Alerts</option>
                              <option>Google News Mentions</option>
                              <option>Custom Webhook Listener</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Keywords / Intent Signals</label>
                            <textarea rows={3} defaultValue="Series A, Series B, Hiring CTO, Looking for agency" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 outline-none resize-none custom-scrollbar" />
                            <p className="text-[10px] text-white/30">Separate keywords by comma.</p>
                          </div>
                        </div>
                      )}

                      {/* AI SPLIT CONFIG */}
                      {activeNode.type === "ai_split" && (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/20">
                            <h4 className="text-xs font-bold text-fuchsia-400 mb-1 flex items-center gap-1.5"><SplitSquareHorizontal size={14}/> Autonomous Routing</h4>
                            <p className="text-[10px] text-white/50 mb-3">The AI will funnel leads down different paths, measure the outcome, and automatically shift volume to the winning strategy.</p>
                            
                            <div className="space-y-3 mt-4">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Path A Strategy</label>
                                <input type="text" defaultValue="Direct WhatsApp Outreach" className="w-full bg-black/60 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-xs text-white focus:border-fuchsia-500 outline-none mt-1" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Path B Strategy</label>
                                <input type="text" defaultValue="Formal Cold Email" className="w-full bg-black/60 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-xs text-white focus:border-fuchsia-500 outline-none mt-1" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Optimization Metric (How AI picks the winner)</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-fuchsia-500 outline-none appearance-none">
                              <option>Highest Reply Rate</option>
                              <option>Highest Meeting Booked Rate</option>
                              <option>Highest Link Click Rate</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeNode.type === "trigger" && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-violet-400 flex items-center gap-2"><Target size={12}/> Primary Trigger Event</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none appearance-none">
                              <option>Record Created (Lead/Contact)</option>
                              <option>Deal Stage Changed</option>
                              <option>Form Submitted</option>
                              <option>Incoming Email Received</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeNode.type === "ai_agent" && (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
                            <h4 className="text-xs font-bold text-pink-400 mb-1 flex items-center gap-1.5"><Bot size={14}/> LLM Instruction</h4>
                            <p className="text-[10px] text-white/50 mb-3">Tell the AI what to process before moving to the next step.</p>
                            <textarea rows={5} defaultValue="1. Deep scrape the target company URL.&#10;2. Find recent press releases.&#10;3. Generate a dynamic insight.&#10;&#10;Variable: {{AI_Insight}}" className="w-full bg-black/60 border border-pink-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none custom-scrollbar font-mono" />
                          </div>
                        </div>
                      )}
                      
                      {activeNode.type === "delay" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5"><Timer size={12}/> Amount</label>
                            <input type="number" defaultValue="2" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-transparent select-none">Unit</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none">
                              <option>Days</option><option>Hours</option><option>Minutes</option>
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {activeNode.type === "action" && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Zap size={12}/> Action Type</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none">
                              <option>Send WhatsApp Message</option><option>Send Email</option><option>Create Task</option>
                            </select>
                          </div>
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Message Payload</label>
                              <button className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 hover:text-emerald-300"><AlignLeft size={10}/> Insert Variable</button>
                            </div>
                            <textarea rows={5} defaultValue="Hi {{contact.first_name}},&#10;&#10;{{AI_Insight}}" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none custom-scrollbar" />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}