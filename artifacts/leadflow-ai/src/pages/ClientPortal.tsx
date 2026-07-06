import { useParams } from "wouter";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ProjectHealth } from "@/components/portal/project-health";
import { AiExecutiveSummary } from "@/components/portal/ai-executive-summary";
import { AiAssistant } from "@/components/portal/ai-assistant";
import { ProjectTimeline } from "@/components/portal/project-timeline";
import { Lead } from "@/types/portal";
import { ProjectUpdates } from "@/components/portal/project-updates";
import { Deliverables } from "@/components/portal/deliverables";
import { InvoiceCenter } from "@/components/portal/invoice-center";
import { ApprovalCenter } from "@/components/portal/approval-center";
import { DocumentCenter } from "@/components/portal/document-center";
import { ProjectStats } from "@/components/portal/project-stats";
import { SupportCenter } from "@/components/portal/ticket-system";
import { MeetingScheduler } from "@/components/portal/meeting-booker";

export default function ClientWorkspace() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("portal_token", token)
        .single();
        
      if (!error && data) setClient(data);
      setLoading(false);
    }
    if (token) loadWorkspace();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-500">
        Workspace not found or unauthorized.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-200 selection:bg-emerald-500/30 font-sans">
      {/* Dynamic Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* TOP HERO */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-zinc-500 text-sm font-medium tracking-widest uppercase mb-2">Client Success Workspace</h2>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white">
              {client.full_name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
            </span>
            <span className="text-sm font-medium text-emerald-500">Live Sync Active</span>
          </div>
        </header>

        <ProjectHealth lead={client} />
        <AiExecutiveSummary leadId={client.id} />

        {/* 70/30 SPLIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          
          {/* LEFT COLUMN (70%) */}
          <div className="lg:col-span-8 space-y-8">
            <ProjectTimeline stage={client.pipeline_stage} />
            <ProjectUpdates leadId={client.id} />
              <Deliverables leadId={client.id} />
              <DocumentCenter leadId={client.id} />
              <InvoiceCenter leadId={client.id} />
              <ApprovalCenter leadId={client.id} />
           
          </div>

          {/* RIGHT COLUMN (30%) */}
          <div className="lg:col-span-4 space-y-8">
            <AiAssistant leadId={client.id} stage={client.pipeline_stage} />
            <ProjectStats leadId={client.id} />
              <SupportCenter leadId={client.id} />
              <MeetingScheduler leadId={client.id} />
           
          </div>

        </div>
      </div>
    </main>
  );
}