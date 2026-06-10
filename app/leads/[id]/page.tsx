"use client";

import LeadTimeline from "@/components/lead-timeline";
import FollowupModal from "@/components/followup-modal";
import AiMessageModal from "@/components/ai-message-modal";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Phone,
  Clock,
  User,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  ai_score?: number;
  ai_summary?: string;
  ai_next_action?: string;
  ai_score_reason?: string;
}

export default function LeadDetailsPage() {
  const params = useParams();

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followups, setFollowups] =
  useState<any[]>([]);
  const [pendingFollowups, setPendingFollowups] =
  useState<any[]>([]);
  const [completedFollowups, setCompletedFollowups] =
  useState<any[]>([]);

  async function loadLead() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!error && data) {
      setLead(data);

      const { data: notesData } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", data.id)
        .order("created_at", {
          ascending: false,
        });

      if (notesData) {
        setNotes(notesData);
      }
    }
    setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;

    const { error } = await supabase
      .from("lead_notes")
      .insert([
        {
          lead_id: lead?.id,
          note: newNote,
        },
      ]);

    if (!error) {
      const newItem = {
        note: newNote,
        created_at: new Date().toISOString(),
      };

      setNotes([newItem, ...notes]);
      setNewNote("");
    }
  }

useEffect(() => {
  loadLead();
}, []);

useEffect(() => {
  if (lead) {
    fetchFollowups();
  }
}, [lead]);
// NEW: Realtime Listener for the Lead Page
  useEffect(() => {
    if (!lead?.id) return;

    const channel = supabase
      .channel("lead-page-realtime")
      // Listen for changes to THIS lead's follow-ups
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_ups", filter: `lead_id=eq.${lead.id}` },
        () => {
          fetchFollowups(); 
        }
      )
      // Listen for changes to THIS lead's data (like status changes)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `id=eq.${lead.id}` },
        () => {
          loadLead(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead?.id]);

async function sendAiFollowup(item: any) {

  if (!lead) return;

  try {

    const response = await fetch(
      "/api/send-whatsapp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: lead.phone,
          message: item.ai_message,
        }),
      }
    );

    const data = await response.json();

    console.log(
      "WhatsApp Followup Result:",
      data
    );

    await supabase
      .from("follow_ups")
      .update({
        status: "completed",
      })
      .eq("id", item.id);

   await fetchFollowups();

  } catch (err) {

    console.error(
      "Followup Send Error:",
      err
    );

  }
}

  async function updateStatus(status: string) {
    if (!lead) return;

    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", lead.id);
      
    if (!error) {
      setLead(prev => prev ? { ...prev, status } : null);
    } else {
      console.error("Status update error:", error);
    }
  }

  async function generateLeadAiMessage(type: string, customPrompt?: string) {
    if (!lead) return;

    setAiLoading(true);

    try {
      const prompt = `
You are an expert sales assistant.

Lead Name:
${lead.full_name}

Lead Source:
${lead.source}

Message Type:
${type}

Custom Instructions:
${customPrompt || "None"}

Generate a professional WhatsApp message.
Keep it persuasive, human, and concise.
`;

      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.message) {
        const encoded = encodeURIComponent(data.message);
        window.open(`https://wa.me/${lead.phone}?text=${encoded}`, "_blank");
      }
    } catch (error) {
      console.error("AI Generation processing failed:", error);
    } finally {
      setAiLoading(false);
      setAiModalOpen(false);
    }
  }

async function saveFollowup(title: string, note: string, dueDate: string) {
  if (!lead) return;

  setFollowupLoading(true);

  try {
    const { error } = await supabase
      .from("follow_ups")
      .insert([
        {
          lead_id: lead.id,
          title: title,
          description: note,
          due_date: dueDate,
          status: "pending",
        },
      ]);

    if (error) {
      console.error("Supabase error payload received:", error);
      alert(`Failed to save follow-up: ${error.message}`);
      return;
    }

    await fetchFollowups();

    setFollowupOpen(false);
    alert("Follow-up saved successfully!");

  } catch (error) {
    console.error("Runtime component crash handler caught:", error);
  } finally {
    setFollowupLoading(false);
  }
}
async function fetchFollowups() {

  if (!lead) return;

 const { data, error } =
  await supabase
    .from("follow_ups")
    .select("*")
    .eq("lead_id", lead.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return;
  }

  setFollowups(data || []);
  const pending =
(data || []).filter(
  (item: any) =>
    item.status !== "completed"
);

const completed =
(data || []).filter(
  (item: any) =>
    item.status === "completed"
);

setPendingFollowups(pending);

setCompletedFollowups(
  completed
);
}
const timelineItems = [
  ...notes.map((note) => ({
    type: "📝 Note",
    text: note.note,
    date: note.created_at,
  })),

  ...followups.map((followup) => ({
    type:
      followup.status === "completed"
        ? "✅ Follow-up Completed"
        : "📅 Follow-up Created",

    text: followup.title,
    date: followup.created_at,
  })),
].sort(
  (a, b) =>
    new Date(b.date).getTime() -
    new Date(a.date).getTime()
);


const score = lead?.ai_score || 0;


const scoreColor =
  score >= 70
    ? "text-green-400"
    : score >= 40
    ? "text-yellow-400"
    : "text-red-400";
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-10">
        Loading...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-10">
        Lead not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-bold">
            {lead.full_name?.charAt(0)}
          </div>

          <div>
            <h1 className="text-4xl font-bold">{lead.full_name} 🟢 AI Score 90
🔥 Hot Lead
WhatsApp Lead</h1>
            <p className="text-white/40 mt-1">Lead profile & activity</p>
          </div>
        </div>

        {/* STATUS */}
        <select
          value={lead.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="bg-[#111827] border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="hot">Hot</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="xl:col-span-2 space-y-6">
          {/* INFO CARD */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Lead Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <User size={15} />
                  Full Name
                </div>
                <div className="text-lg font-medium">{lead.full_name}</div>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <Mail size={15} />
                  Email
                </div>
                <div className="text-lg font-medium">{lead.email}</div>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <Phone size={15} />
                  Phone
                </div>
                <div className="text-lg font-medium">{lead.phone}</div>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <MessageCircle size={15} />
                  Source
                </div>
                <div className="text-lg font-medium capitalize">{lead.source}</div>
              </div>
            </div>
          </div>
{/* AI Analysis */}

<div className="mt-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br
from-violet-500/10
to-cyan-500/5 p-6">

  <div className="flex items-center gap-2 mb-4">
    <span className="text-xl">🤖</span>
    <h2 className="text-xl font-semibold">
      AI Analysis
    </h2>
  </div>

 <div className="bg-black/20 rounded-2xl p-5 border border-white/5">

    <div>
      <p className="text-white/40 text-sm mb-1">
        Lead Score
      </p>

    <div
  className={`text-3xl font-bold ${scoreColor}`}
>
  {score}

  <span className="text-sm text-white/40 ml-2">
    /100
  </span>
</div>

<div className="mt-2">

  <span
    className={`px-3 py-1 rounded-full text-xs font-medium
      ${
        score >= 70
          ? "bg-green-500/20 text-green-400"
          : score >= 40
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-red-500/20 text-red-400"
      }`}
  >
    {
      score >= 70
        ? "🔥 Hot Lead"
        : score >= 40
        ? "🟡 Warm Lead"
        : "🔴 Cold Lead"
    }
  </span>

</div>
    </div>

    <div>
      <p className="text-white/40 text-sm mb-1">
        Recommended Action
      </p>

      <p className="text-white/80">
        {lead?.ai_next_action ||
          "No recommendation yet"}
      </p>
    </div>

    <div className="md:col-span-2">
      <p className="text-white/40 text-sm mb-1">
        Summary
      </p>

      <p className="text-white/80">
        {lead?.ai_summary ||
          "No AI summary available"}
      </p>
    </div>

    <div className="md:col-span-2">
      <p className="text-white/40 text-sm mb-1">
        Reason
      </p>

      <p className="text-white/80">
        {lead?.ai_score_reason ||
          "No reasoning available"}
      </p>
    </div>

  </div>

</div>
          {/* NOTES */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-semibold">Notes</h2>
              <button className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl text-sm transition-all">
                + Add Note
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Write a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 h-12 rounded-2xl bg-black/30 border border-white/10 px-4 text-white outline-none"
                />
                <button
                  onClick={addNote}
                  className="px-5 rounded-2xl bg-violet-600 hover:bg-violet-500 transition-all"
                >
                  Add
                </button>
              </div>

              {notes.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-black/30 border border-white/10 p-5"
                >
                  <p className="text-white">{item.description}</p>
                  <p className="text-white/30 text-sm mt-3">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Followups */}

<div className="grid md:grid-cols-2 gap-6 mt-6">

<div className="mt-6 bg-white/5 border border-white/10 rounded-3xl p-6">


  <div className="flex items-center justify-between mb-5">

    <h3 className="text-xl font-semibold">
      Upcoming Follow-ups
    </h3>

    <span className="text-sm text-white/50">
  {pendingFollowups.length} reminders
</span>

  </div>

  <div className="space-y-4">

    {pendingFollowups.length === 0 && (

      <div className="text-sm text-white/40">
        No follow-ups yet
      </div>

    )}

    {pendingFollowups.map((item) => (

<div
  key={item.id}
  className={`p-4 rounded-2xl border transition-all ${
    item.due_date &&
    new Date(item.due_date) < new Date()
      ? "border-red-500/40 bg-red-500/10"
      : item.due_date &&
        new Date(item.due_date).toDateString() ===
          new Date().toDateString()
      ? "border-orange-500/40 bg-orange-500/10"
      : "border-violet-500/30 bg-violet-500/10"
  }`}
>
  <div className="flex items-start justify-between">

    <div>

      <h4 className="font-medium">
        {item.title || "Untitled"}
      </h4>

  <p className="text-sm text-white/60 mt-1">
  {item.description}
</p>
{item.ai_message && (

  <div className="mt-3 p-3 rounded-xl bg-black/20 border border-violet-500/20">

    <p className="text-xs uppercase tracking-wider text-violet-300 mb-2">
      AI Follow-up Message
    </p>

    <p className="text-sm text-white/80 whitespace-pre-wrap">
      {item.ai_message}
    </p>

    <button
      onClick={() => sendAiFollowup(item)}
      className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all text-sm font-medium"
    >
      🚀 Send AI Follow-up
    </button>

  </div>

)}
      <div
        className={`text-xs mt-3 font-medium ${
          item.due_date &&
          new Date(item.due_date) < new Date()
            ? "text-red-300"
            : item.due_date &&
              new Date(item.due_date).toDateString() ===
                new Date().toDateString()
            ? "text-orange-300"
            : "text-violet-300"
        }`}
      >
        {item.due_date &&
        new Date(item.due_date) < new Date()
          ? "Overdue"
          : item.due_date &&
            new Date(item.due_date).toDateString() ===
              new Date().toDateString()
          ? "Due Today"
          : "Upcoming"}
      </div>

    </div>

    <div className="text-xs text-violet-200">
      {item.due_date
        ? new Date(
            item.due_date
          ).toLocaleString()
        : "No date"}
    </div>

  </div>
</div>

    ))}

  </div>

</div>
{/* Completed Followups */}

<div className="mt-6 bg-white/5 border border-white/10 rounded-3xl p-6">

  <div className="flex items-center justify-between mb-5">

    <h3 className="text-xl font-semibold">
      Completed Follow-ups
    </h3>

    <span className="text-sm text-white/50">
      {completedFollowups.length} completed
    </span>

  </div>

  <div className="space-y-4">

    {completedFollowups.length === 0 && (

      <div className="text-sm text-white/40">
        No completed follow-ups
      </div>

    )}

    {completedFollowups.map((item) => (

      <div
        key={item.id}
        className="p-4 rounded-2xl border border-green-500/30 bg-green-500/10"
      >

        <h4 className="font-medium">
          {item.title}
        </h4>

        <p className="text-sm text-white/60 mt-1">
          {item.description}
        </p>

        <div className="text-green-400 text-xs mt-3 font-medium">
          Completed ✅
        </div>

      </div>

    ))}

  </div>

</div>
         
        </div>
        
<div className="min-h-[700px]
max-h-[700px] overflow-y-auto">

  <LeadTimeline
    items={timelineItems}
  />

</div>
 {/* QUICK ACTIONS */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-5">Quick Actions</h2>

            <div className="space-y-3">
              <button
                onClick={() => {
                  window.open(
                    `https://wa.me/${lead.phone}?text=${encodeURIComponent(
                      `Hi ${lead.full_name}, just following up regarding your inquiry.`
                    )}`,
                    "_blank"
                  );
                }}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium"
              >
                Send WhatsApp
              </button>

              <button
                onClick={() => setAiModalOpen(true)}
                disabled={aiLoading}
                className="w-full h-14 rounded-2xl border border-white/10 hover:border-violet-500/40 hover:bg-white/5 transition-all text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? "Generating..." : "Generate AI Message"}
              </button>

              <Link
                href="/conversations"
                className="w-full h-14 rounded-2xl border border-white/10 hover:border-violet-500/30 bg-black/20 flex items-center justify-center font-medium transition-all"
              >
                Open Conversation
              </Link>

              <button className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 hover:border-violet-500/30 transition-all">
                Schedule Call
              </button>

              <button
                onClick={() => setFollowupOpen(true)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 hover:border-violet-500/30 transition-all"
              >
                Add Follow-up
              </button>
            </div>
          </div>
          <div className="bg-[#111827] border border-violet-500/20 rounded-3xl p-6">

  <h2 className="text-xl font-semibold mb-4">
    🚀 AI Sales Coach
  </h2>

  <div className="space-y-4">

    <div>
      <p className="text-white/40 text-sm">
        Lead Priority
      </p>

      <p className="font-semibold text-green-400">
        {score >= 70
          ? "High"
          : score >= 40
          ? "Medium"
          : "Low"}
      </p>
    </div>

    <div>
      <p className="text-white/40 text-sm">
        Recommended Action
      </p>

      <p>
        {lead?.ai_next_action ||
          "Follow up with the lead"}
      </p>
    </div>

    <div>
      <p className="text-white/40 text-sm">
        Suggested Message
      </p>

      <div className="bg-black/20 rounded-xl p-4 mt-2 text-sm">
        Hi {lead?.full_name}, I wanted to
        follow up regarding your inquiry.
        Let me know if you have any questions.
      </div>
    </div>

  </div>

</div>
    {/* RIGHT */}
<div className="space-y-6 sticky top-6 self-start">
          {/* ACTIVITY */}
          

      </div>
 </div>
      <AiMessageModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={generateLeadAiMessage}
        loading={aiLoading}
      />
      
      <FollowupModal
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        onSave={saveFollowup}
        loading={followupLoading}
      />
    </div>
  );
}