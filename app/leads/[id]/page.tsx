"use client";

import LeadTimeline from "@/components/lead-timeline";
import FollowupModal from "@/components/followup-modal";
import AiMessageModal from "@/components/ai-message-modal";
import EmailModal from "@/components/email-modal";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ActivityFeed from "@/components/activity-feed";
import RevenueOpsPanel from "@/components/revenue-ops-panel"; 
// Adjust the path "@components/..." based on where you saved the file!
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
  const [memory, setMemory] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [emailOpen, setEmailOpen] =
  useState(false);

const [emailSubject, setEmailSubject] =
  useState("");

const [emailBody, setEmailBody] =
  useState("");

const [emailLoading, setEmailLoading] =
  useState(false);
const [emails, setEmails] = useState<any[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followups, setFollowups] = useState<any[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<any[]>([]);
  const [completedFollowups, setCompletedFollowups] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [revivalData, setRevivalData] =
  useState<any>(null);
  const feedRef = useRef<any>(null);

const [revivalLoading, setRevivalLoading] =
  useState(false);
  // Inside your LeadDetailsPage component:
const [triageText, setTriageText] = useState("");
const [triageLoading, setTriageLoading] = useState(false);
const [triageSuggestion, setTriageSuggestion] = useState<string | null>(null);
const [triageIntent, setTriageIntent] = useState<string | null>(null);

async function handleTriage() {
  if (!triageText.trim() || !lead?.id) return;
  setTriageLoading(true);
  setTriageSuggestion(null); // clear old suggestions

  try {
    const res = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, raw_text: triageText }),
    });

    const data = await res.json(); // Catch the API response

    if (res.ok) {
      setTriageText("");
      setTriageIntent(data.intent);           // Save the intent to state
      setTriageSuggestion(data.suggestion);   // Save the suggestion to state
      feedRef.current?.fetchLogs();
    }
  } catch (err) {
    console.error(err);
  } finally {
    setTriageLoading(false);
  }
}




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
        description: newNote,
        created_at: new Date().toISOString(),
      };

      setNotes([newItem, ...notes]);
      setNewNote("");
      // Add entry to activity log via hook structure or manual update trigger
      await fetchActivities();
    }
  }

  useEffect(() => {
    loadLead();
  }, []);

 useEffect(() => {
  fetchActivities();
  fetchFollowups();
  fetchProposals();
  fetchEmails();
}, [lead]);
useEffect(() => {
  if (lead?.id) {
    fetchMemory();
  }
}, [lead?.id]);

  // Realtime Listener for the Lead Page
  useEffect(() => {
    if (!lead?.id) return;

    const channel = supabase
      .channel("lead-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_ups", filter: `lead_id=eq.${lead.id}` },
        () => {
          fetchFollowups(); 
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_log", filter: `lead_id=eq.${lead.id}` },
        () => {
          fetchActivities();
        }
      )
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
      console.log("WhatsApp Followup Result:", data);

      await supabase
        .from("follow_ups")
        .update({
          status: "completed",
        })
        .eq("id", item.id);

      await fetchFollowups();
    } catch (err) {
      console.error("Followup Send Error:", err);
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
      const prompt = `You are an expert sales assistant. Lead Name: ${lead.full_name} Lead Source: ${lead.source} Message Type: ${type} Custom Instructions: ${customPrompt || "None"} Generate a professional WhatsApp message. Keep it persuasive, human, and concise.`;

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

    const { data, error } = await supabase
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

    const fetchedFollowups = data || [];
    setFollowups(fetchedFollowups);
    setPendingFollowups(fetchedFollowups.filter((item: any) => item.status !== "completed"));
    setCompletedFollowups(fetchedFollowups.filter((item: any) => item.status === "completed"));
  }

  async function fetchActivities() {
    if (!lead?.id) return;

    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", {
        ascending: false,
      });

    setActivities(data || []);
  }

  async function fetchProposals() {
    if (!lead?.id) return;

    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", {
        ascending: false,
      });

    setProposals(data || []);
  }
  async function fetchEmails() {
  if (!lead?.id) return;

  const { data } = await supabase
    .from("email_history")
    .select("*")
    .eq("lead_id", lead.id)
    .order("created_at", {
      ascending: false,
    });

  setEmails(data || []);
}
async function fetchMemory() {
  console.log("MEMORY FETCH", lead);

  if (!lead?.id) return;

const { data, error } = await supabase
  .from("lead_memory")
  .select("*")
  .eq("lead_id", lead.id)
  .maybeSingle();

  console.log(data, error);

  if (error) return;

  setMemory(data);
}

async function generateRevival() {
  if (!lead) return;

  try {
    setRevivalLoading(true);

    const res = await fetch(
      "/api/generate-revival",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          leadName: lead.full_name,
          leadScore: score,
          daysInactive: 14,
          stage: lead.status,
        }),
      }
    );

    const data = await res.json();

    setRevivalData(data.data);

  } catch (err) {
    console.error(err);
  } finally {
    setRevivalLoading(false);
  }
}


  const timelineItems = activities.map((activity) => ({
    type:
      activity.activity_type === "note"
        ? "📝 Note"
        : activity.activity_type === "followup"
        ? activity.title.includes("Completed")
          ? "✅ Follow-up Completed"
          : "📅 Follow-up Created"
        : activity.activity_type === "whatsapp"
        ? "💬 WhatsApp Sent"
        : "⚡ Activity",
    text: activity.description,
    date: activity.created_at,
  }));

  const score = lead?.ai_score || 0;
  const scoreColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

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

  const suggestedMessage =
    lead?.status === "converted"
      ? `Hi ${lead?.full_name},\n\nThank you for choosing us. We'd love to hear your feedback and discuss future opportunities.`
      : lead?.status === "warm"
      ? `Hi ${lead?.full_name},\n\nI wanted to follow up regarding your interest. I'd be happy to answer any questions and discuss next steps.`
      : lead?.status === "hot"
      ? `Hi ${lead?.full_name},\n\nI noticed you're actively evaluating our offering. Let's schedule a quick discussion and move things forward.`
      : `Hi ${lead?.full_name},\n\nJust checking in regarding your inquiry. Let me know if you need any additional information.`;

  async function sendEmail(subject: string, body: string) {
  if (!lead?.email) {
    alert("This lead does not have an email address.");
    return;
  }

  try {
    setEmailLoading(true);

    // Notice we changed this to /api/test-email to match your folder!
    await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    body: JSON.stringify({
  lead_id: lead.id,
  to: lead.email,
  subject,
  body,
}),
    });

    alert("Email sent successfully!");
    setEmailOpen(false);

    // Log it to the timeline
    await supabase.from("activity_log").insert([{
      lead_id: lead.id,
      activity_type: "email",
      title: "Email Sent",
      description: `Subject: ${subject}`
    }]);
    
    await fetchActivities();

  } catch (err) {
    console.error(err);
    alert("Failed to send email.");
  } finally {
    setEmailLoading(false);
  }
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
            <h1 className="text-4xl font-bold flex items-center gap-3">
              {lead.full_name}
            </h1>
            <p className="text-white/40 mt-1">Lead profile & automated communication tracking</p>
          </div>
        </div>

        {/* STATUS DROPDOWN */}
        <select
          value={lead.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="bg-[#111827] border border-white/10 rounded-2xl px-4 py-3 text-white outline-none cursor-pointer hover:border-white/20 transition-all"
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

      {/* THREE COLUMN GRID TRACK */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: MAIN CONTENT PROFILE HOUSING (2 COLS ENTIRE WINDOW VIEW) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* PROFILE INFO CONTAINER */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Lead Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <User size={15} /> Full Name
                </div>
                <div className="text-lg font-medium">{lead.full_name}</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <Mail size={15} /> Email
                </div>
                <div className="text-lg font-medium truncate">{lead.email || "No Email Provided"}</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <Phone size={15} /> Phone
                </div>
                <div className="text-lg font-medium">{lead.phone}</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                  <MessageCircle size={15} /> Source
                </div>
                <div className="text-lg font-medium capitalize">{lead.source}</div>
              </div>
            </div>
          </div>
          
          {/* PROPOSAL HISTORY INTERFACE ENGINE */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-semibold">💰 Proposal History</h2>
              <span className="text-white/50 text-sm">{proposals.length} proposals</span>
            </div>
            {proposals.length === 0 ? (
              <div className="text-white/40 text-sm italic">No proposals built or sent for this lead yet.</div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="p-4 rounded-2xl border border-white/10 bg-black/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-white">{proposal.title}</h3>
                      <span className="text-xs uppercase px-2.5 py-1 rounded-md font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {proposal.status}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-green-400">₹{Number(proposal.value).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Email HISTORY INTERFACE */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
  <h2 className="text-2xl font-semibold mb-4">
    📧 Email History
  </h2>

  {emails.length === 0 ? (
    <p className="text-white/40">
      No emails sent yet.
    </p>
  ) : (
    <div className="space-y-3">
      {emails.map((email) => (
        <div
          key={email.id}
          className="p-4 rounded-xl bg-black/20 border border-white/10"
        >
          <div className="font-medium">
            {email.subject}
          </div>

          <div className="text-white/50 text-sm mt-1">
            To: {email.recipient}
          </div>

          <div className="text-white/70 text-sm mt-2">
            {email.body}
          </div>

          <div className="text-xs text-white/30 mt-2">
            {new Date(
              email.created_at
            ).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

{/* Lead Memory */}

<div className="mt-6 bg-[#111827] border border-cyan-500/20 rounded-3xl p-6">

  <h2 className="text-2xl font-semibold mb-5">
    🧠 Lead Memory
  </h2>

  {!memory ? (
    <div className="text-white/40">
      No memory recorded yet.
    </div>
  ) : (
    <div className="space-y-4">

      <div>
        <div className="text-white/40 text-sm">
          Summary
        </div>
        <div>{memory.summary}</div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Budget
        </div>
        <div>{memory.budget}</div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Objections
        </div>
        <div>{memory.objections}</div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Decision Maker
        </div>
        <div>{memory.decision_maker}</div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Next Action
        </div>
        <div>{memory.next_action}</div>
      </div>

    </div>
  )}

</div>

<div className="mt-6 bg-[#111827] border border-red-500/20 rounded-3xl p-6">

  <div className="flex justify-between items-center mb-4">
    <h2 className="text-2xl font-semibold">
      🔥 Lead Revival Engine
    </h2>

    <button
      onClick={generateRevival}
      disabled={revivalLoading}
      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500"
    >
      {revivalLoading
        ? "Analyzing..."
        : "Generate Revival"}
    </button>
  </div>

  {!revivalData ? (
    <div className="text-white/40">
      No revival analysis generated.
    </div>
  ) : (
    <div className="space-y-4">

      <div>
        <div className="text-white/40 text-sm">
          Risk Level
        </div>
        <div>
          {revivalData.risk_level}
        </div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Reason
        </div>
        <div>
          {revivalData.reason}
        </div>
      </div>

      <div>
        <div className="text-white/40 text-sm">
          Revival Message
        </div>
        <div>
          {revivalData.revival_message}
        </div>
      </div>

    </div>
  )}

</div>

          {/* AI ANALYSIS FRAME */}
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-xl font-semibold">AI Operating Analytics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Lead Score Matrix</p>
                <div className={`text-3xl font-bold ${scoreColor}`}>
                  {score} <span className="text-sm text-white/40 font-normal">/100</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    score >= 70 ? "bg-green-500/20 text-green-400" : score >= 40 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {score >= 70 ? "🔥 Hot Engagement" : score >= 40 ? "🟡 Warm Velocity" : "🔴 Cold Nurture"}
                  </span>
                </div>
              </div>
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Next Autopilot Task</p>
                <p className="text-sm text-white/90 leading-relaxed">{lead?.ai_next_action || "Awaiting conversational telemetry raw logs..."}</p>
              </div>
            </div>
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Lead Profile Summary</p>
              <p className="text-sm text-white/80 leading-relaxed">{lead?.ai_summary || "No automated executive summary generated yet."}</p>
            </div>
            {lead?.ai_score_reason && (
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 text-sm text-white/70 leading-relaxed italic">
                {lead.ai_score_reason}
              </div>
            )}
          </div>

          {/* MANUAL AGENT NOTES UTILITY */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-5">CRM Internal Documentation</h2>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Type profile updates or manually verified constraints..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 h-12 rounded-2xl bg-black/30 border border-white/10 px-4 text-white outline-none text-sm placeholder:text-white/20 focus:border-violet-500/50 transition-all"
              />
              <button onClick={addNote} className="px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 font-medium text-sm transition-all shadow-lg shadow-violet-600/10">
                Save Log
              </button>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {notes.length === 0 ? (
                <p className="text-sm text-white/30 italic">No manual staff commentary saved yet.</p>
              ) : (
                notes.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-black/20 border border-white/5 p-4 flex flex-col gap-2">
                    <p className="text-sm text-white/80">{item.description}</p>
                    <span className="text-white/30 text-xs">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TASK REMINDER SPLIT PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upcoming Actions</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">{pendingFollowups.length} active</span>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {pendingFollowups.length === 0 ? (
                  <div className="text-xs text-white/30 italic py-4">No scheduled automation routines.</div>
                ) : (
                  pendingFollowups.map((item) => (
                    <div key={item.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                      item.due_date && new Date(item.due_date) < new Date() ? "border-red-500/40 bg-red-500/5" : "border-violet-500/20 bg-black/20"
                    }`}>
                      <div>
                        <h4 className="font-medium text-sm text-white">{item.title}</h4>
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                      {item.ai_message && (
                        <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Autonomous Outreach Message</p>
                          <p className="text-xs text-white/70 italic whitespace-pre-wrap">"{item.ai_message}"</p>
                          <button onClick={() => sendAiFollowup(item)} className="mt-1 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-all text-xs font-semibold">
                            🚀 Fire Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Completed Audits</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{completedFollowups.length} logged</span>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {completedFollowups.length === 0 ? (
                  <div className="text-xs text-white/30 italic py-4">No executed workflows found.</div>
                ) : (
                  completedFollowups.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex flex-col gap-1">
                      <h4 className="font-medium text-sm text-white/90">{item.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
                      <span className="text-green-400 font-semibold text-[10px] uppercase mt-2">Verified Complete ✅</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION RADAR + ACTIVITY ENGINE TRACKING HUB (1 COL WINDOW VIEW) */}
        <div className="space-y-6">
          {/* 💥 INSERT IT HERE, ABOVE YOUR ACTIVITY FEED 💥 */}
  <RevenueOpsPanel 
    leadId={lead.id} 
    leadName={lead.full_name} 
    leadEmail={lead.email} 
  />
          
          {/* Add your new Intelligence Feed here */}
  <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
    <ActivityFeed leadId={lead.id} />
  </div>

  {/* Existing Command Console... */}
  <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
     {/* ... your existing buttons ... */}
  </div>
  <div className="bg-[#111827] border border-cyan-500/20 rounded-3xl p-6">
  <h2 className="text-xl font-semibold mb-4">🧠 Email Triage Engine</h2>
  <textarea
    value={triageText}
    onChange={(e) => setTriageText(e.target.value)}
    placeholder="Paste the lead's email reply here..."
    className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none mb-3"
  />
  <button 
    onClick={handleTriage}
    disabled={triageLoading}
    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium transition-all"
  >
    {triageLoading ? "Analyzing Intent..." : "Analyze Reply & Suggest"}
  </button>
  {/* DISPLAY AI SUGGESTION HERE */}
{triageSuggestion && (
  <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
        Detected Intent: {triageIntent}
      </span>
    </div>
    <p className="text-sm text-white/90 italic leading-relaxed">
      "{triageSuggestion}"
    </p>
    <div className="mt-3 flex gap-2">
      <button 
        onClick={() => {
          navigator.clipboard.writeText(triageSuggestion);
          alert("Copied to clipboard!");
        }}
        className="text-xs px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 transition-all border border-white/10"
      >
        📋 Copy Reply
      </button>
      <button 
        onClick={() => window.open(`https://wa.me/${lead.phone}?text=${encodeURIComponent(triageSuggestion)}`, "_blank")}
        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all border border-green-500/20"
      >
        💬 Send via WhatsApp
      </button>
    </div>
  </div>
)}
</div>
          
          {/* QUICK REACTION PANEL */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-5">Command Console</h2>
            <div className="space-y-3">
              <button onClick={() => window.open(`https://wa.me/${lead.phone}?text=${encodeURIComponent(`Hi ${lead.full_name}, checking in regarding your inquiry.`)}`, "_blank")}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-medium tracking-wide hover:opacity-90 transition-all shadow-lg shadow-violet-600/10">
                Send WhatsApp Direct
              </button>
              <button onClick={() => setAiModalOpen(true)} disabled={aiLoading}
                className="w-full h-14 rounded-2xl border border-white/10 hover:border-violet-500/40 hover:bg-white/5 transition-all text-white font-medium disabled:opacity-50">
                {aiLoading ? "Consulting LLM..." : "Generate Custom AI Proposal/Outreach"}
              </button>
           <button
  onClick={() => setEmailOpen(true)}
  className="w-full h-14 rounded-2xl border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all font-medium"
>
  📧 Send Email
</button>
<Link
  href={`/workspace/${lead.id}`}
  className="w-full h-14 rounded-2xl border border-green-500/30 hover:bg-green-500/10 flex items-center justify-center"
>
  🧠 Open AI Workspace
</Link>
              <Link href="/conversations" className="w-full h-14 rounded-2xl border border-white/10 hover:border-violet-500/30 bg-black/20 flex items-center justify-center font-medium transition-all">
                Open Integrated Inbox
              </Link>
              <button onClick={() => setFollowupOpen(true)} className="w-full h-14 bg-black/30 border border-white/10 rounded-2xl hover:border-violet-500/30 transition-all font-medium text-sm">
                + Schedule Next Routine Task
              </button>
            </div>
          </div>

          {/* AI COACH ENGINE CARD */}
          <div className="bg-[#111827] border border-violet-500/20 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">🎯 Conversational Assistant</h2>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Assigned Operational Velocity</p>
              <p className="font-semibold mt-0.5 text-base text-green-400">{score >= 70 ? "High Velocity Target" : score >= 40 ? "Standard Track" : "Low Nurture Loop"}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Dynamic Suggestion</p>
              <div className="bg-black/40 rounded-xl p-4 mt-2 text-xs text-white/70 whitespace-pre-wrap leading-relaxed border border-white/5 font-mono">
                {suggestedMessage}
              </div>
              <button onClick={() => window.open(`https://wa.me/${lead?.phone}?text=${encodeURIComponent(suggestedMessage)}`, "_blank")}
                className="mt-3 w-full py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all">
                💬 Push Suggestion to WhatsApp
              </button>
            </div>
          </div>

          {/* CONSOLIDATED TIMELINE FEED SYSTEM */}
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-xl font-semibold">Unified Activity Stream</h3>
            <div className="max-h-[500px] overflow-y-auto pr-1">
              {timelineItems.length === 0 ? (
                <div className="text-sm text-white/30 italic p-4 text-center">No structural transactional logging captured.</div>
              ) : (
                <LeadTimeline items={timelineItems} />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL ARCHITECTURE CONTROLLERS */}
      <AiMessageModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={generateLeadAiMessage}
        loading={aiLoading}
      />
  <EmailModal
  open={emailOpen}
  onClose={() => setEmailOpen(false)}
  onSend={sendEmail}
  loading={emailLoading}
  leadEmail={lead?.email}
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