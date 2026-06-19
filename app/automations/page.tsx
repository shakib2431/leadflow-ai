"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import { 
  Zap, Plus, Search, Play, Pause, Clock, 
  CheckCircle2, AlertCircle, ArrowRight, 
  MessageCircle, Mail, UserPlus, GitMerge, Settings,
  GripVertical, Trash2, X
} from "lucide-react";

// Mock existing workflows
const WORKFLOWS = [
  { id: 1, name: "Hot Lead Welcome Sequence", status: "active", runs: 124, lastRun: "2 mins ago" },
  { id: 2, name: "Invoice Overdue Reminder", status: "active", runs: 45, lastRun: "1 hour ago" },
  { id: 3, name: "Snoozed Deal Revival", status: "paused", runs: 0, lastRun: "Never" },
];

// Node Types
type NodeType = "trigger" | "condition" | "action";
interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
}

export default function AutomationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<"list" | "builder">("list");
  
  // Builder State
  const [flowName, setFlowName] = useState("Hot Lead Welcome Sequence");
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: "node_1", type: "trigger", title: "New Lead Added", description: "When a lead enters pipeline via any source." },
    { id: "node_2", type: "condition", title: "If Lead Score > 70", description: "Only continue if AI flags as hot engagement." },
    { id: "node_3", type: "action", title: "Send WhatsApp Template", description: "Template: 'Hot Lead Welcome Msg'" }
  ]);
  const [activeNode, setActiveNode] = useState<FlowNode | null>(null);
  
  // Drag and Drop State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNodeId(id);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag ghost image slightly transparent
    (e.target as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedNodeId(null);
    (e.target as HTMLElement).style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedNodeId || draggedNodeId === targetId) return;

    // Triggers must always stay at the top. Prevent swapping with trigger.
    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    const targetNode = nodes.find(n => n.id === targetId);
    if (draggedNode?.type === "trigger" || targetNode?.type === "trigger") return;

    const newNodes = [...nodes];
    const draggedIndex = newNodes.findIndex(n => n.id === draggedNodeId);
    const targetIndex = newNodes.findIndex(n => n.id === targetId);

    // Swap the nodes
    const [movedNode] = newNodes.splice(draggedIndex, 1);
    newNodes.splice(targetIndex, 0, movedNode);
    
    setNodes(newNodes);
  };

  // --- NODE MANAGEMENT ---
  const addNode = (type: NodeType) => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      title: type === "condition" ? "New Condition" : "New Action",
      description: "Configure this step in the properties panel."
    };
    setNodes([...nodes, newNode]);
    setActiveNode(newNode);
  };

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    if (activeNode?.id === id) setActiveNode(null);
  };

  // --- HELPERS ---
  const getNodeConfig = (type: NodeType) => {
    switch (type) {
      case "trigger": return { icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", hover: "hover:border-violet-500" };
      case "condition": return { icon: GitMerge, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", hover: "hover:border-amber-500" };
      case "action": return { icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", hover: "hover:border-emerald-500" };
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex overflow-hidden font-sans">
      
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-hidden flex flex-col">
          
          {/* VIEW 1: AUTOMATIONS DASHBOARD */}
          {view === "list" && (
            <div className="max-w-6xl mx-auto space-y-8 p-6 lg:p-10 overflow-y-auto animate-in fade-in duration-500 w-full h-full">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <Zap size={24} />
                    </div>
                    Workflow Automations
                  </h1>
                  <p className="text-white/40 mt-2 text-sm">Design trigger-based sequences to put your CRM on autopilot.</p>
                </div>
                <button 
                  onClick={() => setView("builder")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  <Plus size={16} /> Create Workflow
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Active Workflows</p>
                  <p className="text-3xl font-bold text-white">2</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Tasks Automated (30d)</p>
                  <p className="text-3xl font-bold text-cyan-400">1,492</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-emerald-400">99.8%</p>
                </div>
              </div>

              {/* Workflows List */}
              <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                  <h3 className="font-semibold">Your Automations</h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {WORKFLOWS.map((flow) => (
                    <div key={flow.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setView("builder")}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl border ${flow.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'}`}>
                          {flow.status === 'active' ? <Play size={16} /> : <Pause size={16} />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{flow.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12}/> Last run {flow.lastRun}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><CheckCircle2 size={12}/> {flow.runs} executions</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-white/30 hover:text-white transition-colors"><Settings size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* VIEW 2: VISUAL WORKFLOW BUILDER */}
          {view === "builder" && (
            <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
              
              {/* Builder Header */}
              <div className="flex items-center justify-between p-4 bg-[#0d0e12] border-b border-white/[0.04] z-20 shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView("list")} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <ArrowRight size={16} className="rotate-180" />
                  </button>
                  <div>
                    <input 
                      type="text" 
                      value={flowName} 
                      onChange={(e) => setFlowName(e.target.value)}
                      className="bg-transparent border-none outline-none text-lg font-bold text-white w-80 focus:ring-2 focus:ring-violet-500 rounded px-1" 
                    />
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active & Listening
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors">Test Flow</button>
                  <button className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-600/20">Publish Changes</button>
                </div>
              </div>

              {/* Workspace Area (Canvas + Sidebar) */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* MOCK VISUAL CANVAS */}
                <div 
                  className="flex-1 overflow-y-auto bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[#050508] relative flex flex-col items-center py-12"
                  onClick={() => setActiveNode(null)}
                >
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                  <div className="flex flex-col items-center relative z-10 w-full max-w-md pb-32">
                    {nodes.map((node, index) => {
                      const config = getNodeConfig(node.type);
                      const Icon = config.icon;
                      const isSelected = activeNode?.id === node.id;
                      const isDraggable = node.type !== "trigger";

                      return (
                        <div key={node.id} className="flex flex-col items-center w-full relative">
                          
                          {/* The Node Card */}
                          <div 
                            draggable={isDraggable}
                            onDragStart={(e) => handleDragStart(e, node.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, node.id)}
                            onClick={(e) => { e.stopPropagation(); setActiveNode(node); }}
                            className={`w-80 bg-[#111827] border rounded-2xl p-4 shadow-xl shadow-black/40 transition-all cursor-pointer group flex gap-3
                              ${isSelected ? `ring-2 ring-offset-2 ring-offset-[#050508] border-transparent ${config.color.replace('text', 'ring')}` : `${config.border} ${config.hover}`}
                            `}
                          >
                            {/* Drag Handle */}
                            {isDraggable && (
                              <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-white/30 hover:text-white">
                                <GripVertical size={20} />
                              </div>
                            )}

                            {/* Node Number Badge */}
                            <div className={`absolute -top-3 -left-3 w-6 h-6 rounded-full border-4 border-[#050508] flex items-center justify-center text-[10px] font-bold ${config.color.replace('text', 'bg')} ${node.type === 'trigger' ? 'text-white' : 'text-black'}`}>
                              {index + 1}
                            </div>

                            {/* Delete Button */}
                            {isDraggable && (
                              <button 
                                onClick={(e) => deleteNode(node.id, e)}
                                className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                                  <Icon size={14} />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                                  {node.type}
                                </span>
                              </div>
                              <h4 className="font-semibold text-white text-sm">{node.title}</h4>
                              <p className="text-xs text-white/40 mt-1 leading-relaxed">{node.description}</p>
                            </div>
                          </div>

                          {/* Connecting Line (Don't render after the last node) */}
                          {index < nodes.length - 1 && (
                            <div className={`w-0.5 h-8 my-1 relative z-0 ${config.bg.replace('/10', '/30')}`} />
                          )}
                        </div>
                      );
                    })}

                    {/* Add Node Buttons */}
                    <div className="mt-8 flex gap-3 relative z-10 bg-[#050508] p-2 rounded-2xl border border-white/5 shadow-2xl">
                      <button 
                        onClick={(e) => { e.stopPropagation(); addNode("condition"); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold transition-colors"
                      >
                        <GitMerge size={14} /> Add Condition
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); addNode("action"); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-colors"
                      >
                        <MessageCircle size={14} /> Add Action
                      </button>
                    </div>

                  </div>
                </div>

                {/* PROPERTIES SIDEBAR */}
                {activeNode && (
                  <div className="w-[340px] bg-[#0d0e12] border-l border-white/[0.04] shrink-0 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-right-4">
                    <div className="h-[60px] px-5 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Settings size={16} className="text-white/40" /> Node Properties
                      </h3>
                      <button onClick={() => setActiveNode(null)} className="text-white/40 hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      
                      {/* Name Edit */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40">Step Name</label>
                        <input 
                          type="text" 
                          value={activeNode.title}
                          onChange={(e) => {
                            const updated = nodes.map(n => n.id === activeNode.id ? { ...n, title: e.target.value } : n);
                            setNodes(updated);
                            setActiveNode({ ...activeNode, title: e.target.value });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-violet-500 outline-none"
                        />
                      </div>

                      {/* Dynamic Config based on Type */}
                      {activeNode.type === "trigger" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Trigger Event</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-violet-500 outline-none">
                              <option>New Lead Added</option>
                              <option>Deal Stage Changed</option>
                              <option>Invoice Paid</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeNode.type === "condition" && (
                        <div className="space-y-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Data Field</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                              <option>AI Lead Score</option>
                              <option>Deal Value</option>
                              <option>Source</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Operator</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                              <option>Greater than (&gt;)</option>
                              <option>Less than (&lt;)</option>
                              <option>Equals (=)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Value</label>
                            <input type="number" defaultValue="70" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" />
                          </div>
                        </div>
                      )}

                      {activeNode.type === "action" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Action Type</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none">
                              <option>Send WhatsApp Message</option>
                              <option>Send Email</option>
                              <option>Create CRM Task</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Message Template</label>
                            <textarea 
                              rows={4}
                              defaultValue="Hi {{contact.name}}, I saw you just signed up. Let me know if you need help."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none resize-none" 
                            />
                            <p className="text-[10px] text-white/30">Use {"{{variable}}"} syntax to inject data.</p>
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