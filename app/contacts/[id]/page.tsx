"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ContactEnrichmentPanel from "@/components/crm/contact-enrichment-panel";
import { Mail, Phone, Clock, ArrowLeft, MessageSquare, Building2, User, Star, Target } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  company_name: string | null;
  status: string;
  lead_score: number;
  source: string;
  last_contacted_at: string | null;
  created_at: string;
}

interface NoteItem {
  id: string;
  lead_id: string;
  note: string;
  created_at: string;
}

interface ActivityLogItem {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params?.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!contactId) return;

    const load = async () => {
      setLoading(true);

      const { data: contactData, error: contactError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .maybeSingle();

      if (contactError) {
        console.error("Contact fetch error:", contactError);
      } else if (contactData) {
        setContact(contactData as Contact);
      } else {
        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", contactId)
          .maybeSingle();

        if (leadError) {
          console.error("Lead fallback fetch error:", leadError);
        } else if (leadData) {
          const [firstName, ...rest] = (leadData.full_name || "").split(" ");
          setContact({
            id: leadData.id,
            first_name: firstName || "",
            last_name: rest.join(" ") || "",
            email: leadData.email || "",
            phone: leadData.phone || null,
            job_title: null,
            company_name: null,
            status: leadData.status || "Lead",
            lead_score: leadData.ai_score || 0,
            source: leadData.source || "",
            last_contacted_at: null,
            created_at: leadData.created_at || new Date().toISOString(),
          });
        } else {
          console.warn("Contact and lead not found for ID:", contactId);
        }
      }

      await loadTimeline();
      setLoading(false);
    };

    load();
  }, [contactId]);

  const loadTimeline = async () => {
    if (!contactId) return;

    const [notesRes, activityRes] = await Promise.all([
      supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", contactId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("*")
        .eq("lead_id", contactId)
        .order("created_at", { ascending: false }),
    ]);

    const noteItems = (notesRes.data || []) as NoteItem[];
    const activityItems = (activityRes.data || []) as ActivityLogItem[];

    setNotes(noteItems);

    const combined = [
      ...noteItems.map((note) => ({
        id: `note-${note.id}`,
        type: "Note",
        title: "Manual Note",
        description: note.note,
        created_at: note.created_at,
      })),
      ...activityItems.map((activity) => ({
        id: `activity-${activity.id}`,
        type: activity.activity_type || "Activity",
        title: activity.title || activity.activity_type || "Activity Log",
        description: activity.description || "",
        created_at: activity.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setTimeline(combined);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !contactId) return;

    setSavingNote(true);
    const { error } = await supabase.from("lead_notes").insert([
      {
        lead_id: contactId,
        note: newNote.trim(),
      },
    ]);

    if (error) {
      alert("Failed to save note: " + error.message);
      console.error(error);
    } else {
      setNewNote("");
      await loadTimeline();
    }
    setSavingNote(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-10 flex items-center justify-center">
        <div className="text-white/50">Loading contact profile...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-10">
        <Link href="/contacts" className="inline-flex items-center gap-2 text-violet-400 hover:text-white mb-6">
          <ArrowLeft size={16} /> Back to contacts
        </Link>
        <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
          <h1 className="text-3xl font-bold">Contact not found</h1>
          <p className="text-white/40 mt-3">The contact ID was not found. Try returning to the contact list.</p>
        </div>
      </div>
    );
  }

  const scoreColor = contact.lead_score >= 90 ? "text-emerald-400" : contact.lead_score >= 70 ? "text-amber-400" : "text-white/40";

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-10 items-start">
        <div>
          <Link href="/contacts" className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to contacts
          </Link>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                  {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">{contact.first_name} {contact.last_name}</h1>
                  <p className="text-white/40 mt-1">Contact profile and timeline for unified customer engagement.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-5">
                <div className="flex items-center gap-2 text-white/40 text-sm mb-3"><User size={14} /> Role & Company</div>
                <div className="text-lg font-medium">{contact.job_title || "Unknown role"}</div>
                <div className="text-sm text-white/50 mt-1">{contact.company_name || "No company assigned"}</div>
              </div>
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-white/40 text-sm flex items-center gap-2"><Target size={14} /> Lead Score</span>
                  <span className={`font-bold ${scoreColor}`}>{contact.lead_score}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${contact.lead_score >= 90 ? "bg-emerald-400" : contact.lead_score >= 70 ? "bg-amber-400" : "bg-white/40"}`} style={{ width: `${Math.min(contact.lead_score, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white/40 text-sm"><Mail size={14} /> Email</div>
            <div className="font-medium text-lg truncate">{contact.email || "No email provided"}</div>
            <div className="flex items-center gap-2 text-white/40 text-sm"><Phone size={14} /> Phone</div>
            <div className="font-medium text-lg">{contact.phone || "No phone provided"}</div>
            <div className="flex items-center gap-2 text-white/40 text-sm"><Clock size={14} /> Last contacted</div>
            <div className="text-sm text-white/60">{contact.last_contacted_at ? new Date(contact.last_contacted_at).toLocaleDateString() : "Never"}</div>
          </div>

          <ContactEnrichmentPanel email={contact.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-semibold">Activity Timeline</h2>
                <p className="text-white/40 text-sm">Combined activity_log and manual note history.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-white/30">{timeline.length} items</span>
            </div>

            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-sm text-white/40 italic p-6 rounded-3xl bg-white/5 border border-white/5 text-center">No activity captured yet. Add a note or perform a tracked activity.</div>
              ) : (
                timeline.map((item) => (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-violet-300/70">{item.type}</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/30">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-white/70 mt-2 whitespace-pre-wrap">{item.description || "No details available."}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Log a New Note</h2>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write a note for this contact..."
              className="w-full min-h-[140px] bg-black/20 border border-white/10 rounded-3xl p-4 text-white text-sm outline-none focus:border-violet-500 transition-all"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleAddNote}
                disabled={savingNote || !newNote.trim()}
                className="inline-flex items-center justify-center rounded-3xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-3">
              <a href={`mailto:${contact.email}`} className="block rounded-2xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition-all text-sm font-semibold">Email {contact.first_name}</a>
              <a href={`tel:${contact.phone || ""}`} className="block rounded-2xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition-all text-sm font-semibold">Call {contact.first_name}</a>
              <Link href="/contacts" className="block rounded-2xl bg-transparent border border-violet-500/30 px-4 py-3 hover:bg-violet-500/10 transition-all text-sm font-semibold">Return to contact list</Link>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold">Contact Context</h2>
            </div>
            <div className="grid gap-3">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-2">Company</p>
                <p className="text-sm text-white/80">{contact.company_name || "Unknown"}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-2">Status</p>
                <p className="text-sm text-white/80">{contact.status}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-2">Source</p>
                <p className="text-sm text-white/80">{contact.source}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
