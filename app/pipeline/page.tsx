"use client";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, X, ShieldAlert, Mail, Phone, Sparkles } from "lucide-react";
import Link from "next/link"; // FIX 1: Added missing Link import

const STAGES = ["new", "contacted", "qualified", "negotiation", "won", "lost"];

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    setIsMounted(true);
    loadLeads();
  }, []);

  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*");
    if (data) setLeads(data);
  }

  async function handleDragEnd(result: any) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, pipeline_stage: newStage } : l));
    
    if (selectedLead && selectedLead.id === draggableId) {
      setSelectedLead((prev: any) => ({ ...prev, pipeline_stage: newStage }));
    }

    await supabase.from("leads").update({ pipeline_stage: newStage }).eq("id", draggableId);
  }

  if (!isMounted) return null;

  return (
    <div className="h-screen bg-[#07070a] text-white flex relative overflow-hidden">
      {/* Main Board View */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-white/40 mt-1">Manage your revenue flow</p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
            {STAGES.map((stage) => (
              <div key={stage} className="w-80 flex flex-col shrink-0 h-full max-h-[calc(100vh-180px)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">{stage}</h2>
                  <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-full text-white/40">
                    {leads.filter(l => l.pipeline_stage === stage).length}
                  </span>
                </div>

                {/* Drop Area - FIX 2: Restored the render props wrapper */}
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-2 transition-colors duration-200 overflow-y-auto custom-scrollbar min-h-[150px] ${
                        snapshot.isDraggingOver ? "bg-white/[0.04]" : "bg-[#0d0e12]"
                      }`}
                    >
                      {leads.filter(l => l.pipeline_stage === stage).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedLead(lead)}
                              className={`p-4 mb-3 rounded-xl border bg-[#11121a] cursor-pointer transition-all ${
                                snapshot.isDragging ? "shadow-2xl rotate-2 border-violet-500" : "border-white/[0.04] hover:border-white/20"
                              } ${selectedLead?.id === lead.id ? "border-cyan-500/50 bg-white/[0.02]" : ""}`}
                            >
                              <h3 className="font-semibold text-sm mb-1 text-white/90">{lead.full_name}</h3>
                              <p className="text-xs text-white/40 mb-3 truncate">{lead.email}</p>
                              
                              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  (lead.ai_score ?? 0) >= 70 ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                                }`}>
                                  {(lead.ai_score ?? 0) >= 70 ? "🔥 HIGH" : "❄️ COLD"}
                                </span>
                                <div className="flex items-center gap-2 text-white/30 text-[10px]">
                                  <Calendar size={12} /> 
                                  <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>
                              </div>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Contextual Slide-Out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[420px] bg-[#0c0d14] border-l border-white/[0.06] shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          selectedLead ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedLead && (
          <>
            {/* Panel Header */}
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Lead Profile</span>
                <h2 className="text-xl font-bold mt-1">{selectedLead.full_name}</h2>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Contact Credentials */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/60 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <Mail size={14} className="text-white/30" />
                  <span className="truncate">{selectedLead.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <Phone size={14} className="text-white/30" />
                  <span>{selectedLead.phone || "No phone linked"}</span>
                </div>
              </div>

              {/* Status Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-white/30 font-bold uppercase block mb-1">Pipeline Stage</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{selectedLead.pipeline_stage}</span>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-white/30 font-bold uppercase block mb-1">Engagement Score</span>
                  <span className="text-xs font-bold text-violet-400">{selectedLead.ai_score ?? 50}/100</span>
                </div>
              </div>

              {/* Operational Intelligence Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">AI Context Mapping</h4>
                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed">
                    <ShieldAlert size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      {selectedLead.ai_score >= 70 
                        ? "High conversation intent detected. This lead requires immediate outbound action inside the priority workspace channel."
                        : "Lead exhibits steady pipeline velocity. Recommended path is standardized contextual relationship nurturing."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="p-6 border-t border-white/[0.06] bg-[#090a0f]">
              <Link 
                href="/action-queue"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 text-white shadow-lg shadow-violet-950/20"
              >
                <Sparkles size={14} />
                Open AI Action Queue Workspace
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}