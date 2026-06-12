"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const columns = [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "won",
  "lost",
];

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;

  status: string;
  pipeline_stage: string;

  ai_score?: number;
}

export default function PipelinePage() {

  const [leads, setLeads] =
    useState<Lead[]>([]);

  async function loadLeads() {

    const { data, error } =
      await supabase
        .from("leads")
        .select("*");

if (!error && data) {

  const normalizedLeads = data.map((lead) => {

    if (lead.pipeline_stage) {
      return lead;
    }

    let stage = "new";

    switch (lead.status) {

      case "warm":
        stage = "contacted";
        break;

      case "hot":
        stage = "qualified";
        break;

      case "converted":
        stage = "won";
        break;

      default:
        stage = "new";
    }

    return {
      ...lead,
      pipeline_stage: stage,
    };
  });

  // BACKFILL OLD RECORDS IN SUPABASE
  for (const lead of normalizedLeads) {

    const originalLead = data.find(
      (d) => d.id === lead.id
    );

    if (!originalLead?.pipeline_stage) {

      await supabase
        .from("leads")
        .update({
          pipeline_stage: lead.pipeline_stage,
        })
        .eq("id", lead.id);
    }
  }

  setLeads(normalizedLeads);
}
  }
  

useEffect(() => {

  loadLeads();

  const channel = supabase
    .channel("pipeline-sync")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "leads",
      },
      () => {
        loadLeads();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };

}, []);
  async function handleDragEnd(
    result: any
  ) {

    if (!result.destination) return;

    const leadId =
      result.draggableId;

    const newStatus =
      result.destination.droppableId;

    const updatedLeads =
  leads.map((lead) =>
    lead.id === leadId
      ? {
          ...lead,
          pipeline_stage: newStatus,
        }
      : lead
  );

setLeads(updatedLeads);

await supabase
  .from("leads")
  .update({
    pipeline_stage: newStatus,
  })
  .eq("id", leadId);
  }

  return (
    <div className="h-screen bg-[#0a0a0f] text-white p-6 overflow-hidden flex flex-col">

      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Sales Pipeline
        </h1>

        <p className="text-white/40 mt-2">
          Drag and drop leads across stages
        </p>
      </div>

    <DragDropContext
  onDragEnd={handleDragEnd}
>

  <div className="flex-1 overflow-x-scroll overflow-y-hidden pb-4">

    <div className="grid grid-flow-col auto-cols-[320px] gap-6 min-w-max whitespace-nowrap">

      {columns.map((column) => {

           const columnLeads =
  leads.filter(
    (lead) =>
      lead.pipeline_stage === column
  );
            return (
              <Droppable
                droppableId={column}
                key={column}
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-80 bg-[#111827] border border-white/10 rounded-3xl p-4 flex flex-col"
                  >

                    <div className="flex items-center justify-between mb-5">

                      <h2 className="text-lg font-semibold capitalize">
                        {column}
                      </h2>

                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-sm text-violet-300">
                        {columnLeads.length}
                      </div>

                    </div>

                    <div className="space-y-4 min-h-[200px]">

                      {columnLeads.map(
                        (lead, index) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={
                                  provided.innerRef
                                }
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-black/30 border border-white/10 rounded-2xl p-4 hover:border-violet-500/30 transition-all cursor-pointer"
                              >

                                <h3 className="font-semibold text-white">
                                  {lead.full_name}
                                </h3>

                                <p className="text-sm text-white/40 mt-1">
                                  {lead.email}
                                </p>

                              <div className="mt-4 flex items-center justify-between">

  <span className="text-xs text-white/30">
    {lead.phone}
  </span>

  <div className="flex items-center gap-2">

  {(lead.ai_score ?? 0) >= 80 && (
    <span className="text-red-400 text-xs">
      🔥 Hot
    </span>
  )}

  {(lead.ai_score ?? 0) >= 40 &&
    (lead.ai_score ?? 0) < 80 && (
    <span className="text-yellow-400 text-xs">
      🟡 Warm
    </span>
  )}

  {(lead.ai_score ?? 0) < 40 && (
    <span className="text-blue-400 text-xs">
      ❄️ Cold
    </span>
  )}

</div>

</div>
                              </div>
                            )}
                          </Draggable>
                        )
                      )}

                      {provided.placeholder}

                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
              </div>
        </div>
      </DragDropContext>
    </div>
  );
}