"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CalendarClock, CheckCircle2, ChevronRight, Mail, MessageSquare,
  Phone, Plus, Send, Sparkles, Trash2, Upload, UserPlus, X,
} from "lucide-react";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";

type CandidateStage = "Applied" | "Interviewing" | "Offered" | "Hired";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role_applied?: string | null;
  stage?: CandidateStage | null;
  created_at?: string | null;
  notes?: string | null;
};

type EmployeeLite = {
  email?: string | null;
};

type OfferLifecycleStatus =
  | "employee_created"
  | "offer_sent"
  | "awaiting_signature"
  | "offer_signed"
  | "pre_onboarding"
  | "offer_declined"
  | "offer_revision_requested";

const STAGES: CandidateStage[] = ["Applied", "Interviewing", "Offered", "Hired"];

const STAGE_LABELS: Record<CandidateStage, string> = {
  Applied: "Applied",
  Interviewing: "Interviewing",
  Offered: "Offered",
  Hired: "Accepted",
};

const STAGE_CONFIG: Record<CandidateStage, {
  header: string; dot: string; badge: string; cardBorder: string; colBg: string;
}> = {
  Applied:      { header: "text-slate-700",  dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-700 border-slate-200",   cardBorder: "border-slate-200",   colBg: "bg-slate-50" },
  Interviewing: { header: "text-amber-700",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200",    cardBorder: "border-amber-200",   colBg: "bg-amber-50/40" },
  Offered:      { header: "text-blue-700",   dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200",       cardBorder: "border-blue-200",    colBg: "bg-blue-50/40" },
  Hired:        { header: "text-emerald-700",dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", cardBorder: "border-emerald-200", colBg: "bg-emerald-50/40" },
};

export default function RecruitmentPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employeeEmailSet, setEmployeeEmailSet] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<CandidateStage | "all">("all");
  // Drag-and-drop state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role_applied_for: ""
  });

  useEffect(() => { fetchCandidates(); }, []);

  function apiHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      headers["x-dev-role"] = "HR Admin";
    }
    return headers;
  }

  function isMissingNotesColumnError(err: unknown) {
    const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
    return msg.includes("could not find") && msg.includes("notes") && msg.includes("candidates");
  }

  async function fetchWorkspaceEmployees(): Promise<EmployeeLite[]> {
    const res = await fetch("/api/hrms/v2/employees?page=1&pageSize=100", { headers: apiHeaders() });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to load employees");
    return (body.data || []) as EmployeeLite[];
  }

  async function updateCandidateLifecycleById(id: string, status: OfferLifecycleStatus, stage: CandidateStage = "Offered") {
    const full = await supabase.from("candidates").update({ notes: status, stage }).eq("id", id);
    if (!full.error) return;

    if (!isMissingNotesColumnError(full.error)) {
      throw full.error;
    }

    const fallback = await supabase.from("candidates").update({ stage }).eq("id", id);
    if (fallback.error) {
      throw fallback.error;
    }
  }

  async function employeeExistsInWorkspace(email?: string | null): Promise<boolean> {
    const target = String(email || "").trim().toLowerCase();
    if (!target) return false;
    const rows = await fetchWorkspaceEmployees();
    return rows.some((e) => String(e.email || "").trim().toLowerCase() === target);
  }

  async function fetchCandidates() {
    const [candidatesRes, employees] = await Promise.all([
      supabase.from("candidates").select("*"),
      fetchWorkspaceEmployees().catch(() => []),
    ]);

    // Build employee email set first
    const emails = new Set(
      (employees as Array<{ email?: string | null }>)
        .map((e) => String(e.email || "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (candidatesRes.data) {
      const candidates = candidatesRes.data as Candidate[];
      
      // Auto-move candidates to "Hired" stage if they have employee records
      const updates: Promise<any>[] = [];
      const processed = candidates.map(candidate => {
        const candidateEmail = String(candidate.email || "").trim().toLowerCase();
        if (emails.has(candidateEmail) && candidate.stage !== "Hired") {
          // Candidate has employee record but not marked as Hired - update stage
          updates.push(
            supabase.from("candidates").update({ stage: "Hired" }).eq("id", candidate.id)
          );
          return { ...candidate, stage: "Hired" as CandidateStage };
        }
        return candidate;
      });
      
      // Execute all updates in parallel
      if (updates.length > 0) {
        await Promise.all(updates);
      }
      
      setCandidates(processed);
    }

    setEmployeeEmailSet(emails);
  }

  async function updateCandidateStage(id: string, stage: CandidateStage) {
    const row = candidates.find((c) => c.id === id);
    const noteStatus = String(row?.notes || "") as OfferLifecycleStatus;
    if (stage === "Hired" && !["offer_signed", "pre_onboarding"].includes(noteStatus)) {
      setNotice({
        type: "error",
        text: "Only accepted offers can move to Accepted. Complete offer acceptance first.",
      });
      return;
    }

    const snapshot = [...candidates];
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    const { error } = await supabase.from("candidates").update({ stage }).eq("id", id);
    if (error) {
      setCandidates(snapshot);
      setNotice({ type: "error", text: "Stage update failed. Please retry." });
    }
  }

  async function deleteCandidate(candidate: Candidate) {
    const confirmed = window.confirm(`Delete candidate ${candidate.name}? This cannot be undone.`);
    if (!confirmed) return;

    const snapshot = [...candidates];
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    const { error } = await supabase.from("candidates").delete().eq("id", candidate.id);
    if (error) {
      setCandidates(snapshot);
      setNotice({ type: "error", text: `Failed to delete candidate: ${error.message}` });
      return;
    }

    setNotice({ type: "success", text: `${candidate.name} was removed from recruitment pipeline.` });
  }

  function exportCandidatesCsv() {
    const rows = [
      ['name', 'email', 'phone', 'role_applied', 'stage'],
      ...candidates.map((c) => [
        String(c.name || ''),
        String(c.email || ''),
        String(c.phone || ''),
        String(c.role_applied || ''),
        String(c.stage || 'Applied'),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hiring-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importCandidatesCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCsv(true);
    setNotice(null);
    try {
      const content = await file.text();
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error('CSV must include header and at least one row.');
      }

      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const idx = {
        name: headers.indexOf('name'),
        email: headers.indexOf('email'),
        phone: headers.indexOf('phone'),
        role_applied: headers.indexOf('role_applied'),
        stage: headers.indexOf('stage'),
      };

      if (idx.name < 0 || idx.email < 0 || idx.role_applied < 0) {
        throw new Error('CSV headers must include: name,email,role_applied');
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        return {
          name: cols[idx.name] || '',
          email: cols[idx.email] || '',
          phone: idx.phone >= 0 ? cols[idx.phone] || null : null,
          role_applied: cols[idx.role_applied] || 'Unassigned',
          stage: idx.stage >= 0 && cols[idx.stage] ? cols[idx.stage] : 'Applied',
        };
      }).filter((row) => row.name && row.email);

      if (rows.length === 0) {
        throw new Error('No valid candidate rows found in CSV.');
      }

      const { error } = await supabase.from('candidates').insert(rows);
      if (error) throw error;

      await fetchCandidates();
      setNotice({ type: 'success', text: `${rows.length} candidate(s) imported successfully.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to import candidates CSV.' });
    } finally {
      setIsImportingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();

    const { error } = await supabase.from("candidates").insert([{ 
      name: fullName, 
      email: formData.email, 
      role_applied: formData.role_applied_for,
      stage: "Applied"
    }]);

    if (error) {
      alert("Error adding candidate: " + error.message);
    } else {
      setShowAddModal(false);
      setFormData({ first_name: "", last_name: "", email: "", role_applied_for: "" });
      fetchCandidates();
    }
    setIsSubmitting(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setNotice(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/hr/parse-resume', { method: 'POST', body: formData });
      const parsedBody = await res.json();
      if (!res.ok) throw new Error(parsedBody.error || 'Resume parsing failed');

      const mapped = parsedBody.mapped || {};
      const parsed = parsedBody.parsed || {};

      const first = String(mapped.first_name || parsed.first_name || '').trim();
      const last = String(mapped.last_name || parsed.last_name || '').trim();
      const fullName = `${first} ${last}`.trim() || 'Parsed Candidate';
      const candidateEmail = mapped.email || parsed.email || `candidate-${Date.now()}@example.com`;
      const roleApplied = mapped.current_title || parsed.title || 'Unassigned';
      const phone = mapped.phone || parsed.phone || null;
      
      await supabase.from("candidates").insert([{
        name: fullName,
        email: candidateEmail,
        role_applied: roleApplied,
        phone,
        stage: "Applied",
      }]);
      
      fetchCandidates();
      setNotice({ type: 'success', text: `Resume parsed and candidate added: ${fullName}` });
    } catch (err) {
      setNotice({ type: 'error', text: 'Parsing failed. Please try another resume.' });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  async function hireCandidate(candidate: Candidate) {
    setProcessingId(candidate.id);
    setNotice(null);
    const nameParts = candidate.name ? candidate.name.trim().split(/\s+/) : ['Unknown'];
    const first_name = nameParts[0] || 'Unknown';
    const last_name = nameParts.slice(1).join(' ') || first_name;

    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    const join_date = d.toISOString().split('T')[0];

    if (!candidate.email) {
      setNotice({ type: 'error', text: 'Candidate email is required before hiring.' });
      setProcessingId(null);
      return;
    }

    try {
      const response = await fetch('/api/hr/hire-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name,
          last_name,
          email: candidate.email,
          phone: candidate.phone || null,
          designation: candidate.role_applied || 'Unassigned',
          department: 'Unassigned',
          join_date
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to bridge candidate");

      // Keep candidate in Offered column — create offer workspace and mark status.
      await updateCandidateLifecycleById(candidate.id, "employee_created", "Offered");

      // Refresh so the badge appears immediately
      await fetchCandidates();
      setNotice({ type: 'success', text: `Offer workspace initialized for ${candidate.name}. You can now send the offer from Offered.` });

    } catch (error: any) {
      const message = String(error?.message || "");

      // If employee record already exists, treat this as an idempotent success path.
      if (message.toLowerCase().includes("already exists")) {
        const existsInWorkspace = await employeeExistsInWorkspace(candidate.email);
        if (!existsInWorkspace) {
          setNotice({
            type: "error",
            text: "This email already exists outside your current workspace scope. Use a unique email or move the employee into this workspace before sending an offer.",
          });
        } else {
          await updateCandidateLifecycleById(candidate.id, "employee_created", "Offered");

          await fetchCandidates();
          setNotice({
            type: "success",
            text: `${candidate.name} already exists in Employee Directory. Offer workspace has been linked.`,
          });
        }
      } else {
        setNotice({ type: 'error', text: `Handoff failed: ${error.message}` });
      }
    } finally {
      setProcessingId(null);
    }
  }

  const filteredCandidates = candidates.filter((c) => {
    const q = query.trim().toLowerCase();
    const stageMatch = stageFilter === "all" || (c.stage || "Applied") === stageFilter;
    if (!q) return stageMatch;
    const haystack = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.role_applied || ""}`.toLowerCase();
    return stageMatch && haystack.includes(q);
  });

  const counts = {
    applied: candidates.filter((c) => (c.stage || "Applied") === "Applied").length,
    interviewing: candidates.filter((c) => (c.stage || "Applied") === "Interviewing").length,
    offered: candidates.filter((c) => (c.stage || "Applied") === "Offered").length,
    hired: candidates.filter((c) => (c.stage || "Applied") === "Hired").length,
  };

  const conversion = candidates.length > 0 ? Math.round((counts.hired / candidates.length) * 100) : 0;

  return (
    <div className="hrms-enterprise relative min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
      <HRMSTopHeader
        title="Recruitment"
        subtitle="Full hiring pipeline — from first application to employee onboarding."
      />

      {/* Pipeline flow strip */}
      <section className="hrms-dashboard-shell">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Hiring-to-Activation Pipeline</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: "Applied", color: "bg-slate-100 text-slate-700 border-slate-200", count: counts.applied },
            { label: "Interviewing", color: "bg-amber-50 text-amber-700 border-amber-200", count: counts.interviewing },
            { label: "Offered", color: "bg-blue-50 text-blue-700 border-blue-200", count: counts.offered },
            { label: "Offer Accepted", color: "bg-emerald-50 text-emerald-700 border-emerald-200", count: counts.hired },
            { label: "Offer Letter", color: "bg-indigo-50 text-indigo-700 border-indigo-200", count: null, href: "/team/offer-management" },
            { label: "Pre-Onboarding", color: "bg-violet-50 text-violet-700 border-violet-200", count: null, href: "/team/pre-onboarding" },
            { label: "Activated", color: "bg-teal-50 text-teal-700 border-teal-200", count: null, href: "/team/employees" },
          ].map((step, idx, arr) => (
            <div key={step.label} className="flex items-center gap-2">
              {step.href ? (
                <Link href={step.href}>
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap hover:shadow-sm transition ${step.color}`}>
                    {step.label}
                  </span>
                </Link>
              ) : (
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${step.color}`}>
                  {step.label}{step.count !== null ? ` (${step.count})` : ""}
                </span>
              )}
              {idx < arr.length - 1 && <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <article className="hrms-kpi-card hrms-kpi-1">
          <div className="hrms-kpi-icon"><UserPlus size={15} /></div>
          <h4 className="hrms-section-label">Total</h4>
          <p className="hrms-kpi-value">{candidates.length}</p>
        </article>
        <article className="hrms-kpi-card hrms-kpi-2">
          <div className="hrms-kpi-icon"><MessageSquare size={15} /></div>
          <h4 className="hrms-section-label">Interviewing</h4>
          <p className="hrms-kpi-value">{counts.interviewing}</p>
        </article>
        <article className="hrms-kpi-card hrms-kpi-4">
          <div className="hrms-kpi-icon"><Send size={15} /></div>
          <h4 className="hrms-section-label">Offered</h4>
          <p className="hrms-kpi-value">{counts.offered}</p>
        </article>
        <article className="hrms-kpi-card hrms-kpi-5">
          <div className="hrms-kpi-icon"><CheckCircle2 size={15} /></div>
          <h4 className="hrms-section-label">Accepted</h4>
          <p className="hrms-kpi-value">{counts.hired}</p>
        </article>
        <article className="hrms-kpi-card hrms-kpi-3">
          <div className="hrms-kpi-icon"><ArrowRight size={15} /></div>
          <h4 className="hrms-section-label">Conversion</h4>
          <p className="hrms-kpi-value">{conversion}%</p>
        </article>
      </section>

      {/* Toolbar */}
      <section className="hrms-dashboard-shell">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, email, phone..."
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as CandidateStage | "all")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            <option value="all">All stages</option>
            {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
          <button onClick={exportCandidatesCsv} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 transition">
            <Upload size={14} /> Export CSV
          </button>
          <button onClick={() => csvInputRef.current?.click()} disabled={isImportingCsv} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 transition disabled:opacity-50">
            {isImportingCsv ? "Importing..." : "Import CSV"}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={importCandidatesCsv} />
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition">
            <Plus size={15} /> Add Candidate
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={isParsing} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50">
            {isParsing ? "Parsing..." : <><Sparkles size={15} /> AI Parse Resume</>}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf" />
        </div>
      </section>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <div className="flex items-start justify-between gap-3">
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100"><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const sc = STAGE_CONFIG[stage];
          const stageCandidates = filteredCandidates.filter((c) => (c.stage || "Applied") === stage);
          const isDropTarget = dragOverStage === stage;
          return (
            <div
              key={stage}
              className={`hrms-panel p-4 transition-all duration-150 ${sc.colBg} ${isDropTarget ? "ring-2 ring-indigo-400 ring-offset-1 scale-[1.01]" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                if (dragId) {
                  const cand = candidates.find((c) => c.id === dragId);
                  if (cand && (cand.stage || "Applied") !== stage) {
                    updateCandidateStage(dragId, stage);
                  }
                  setDragId(null);
                }
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${sc.header}`}>
                  <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                  {STAGE_LABELS[stage]}
                </h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.badge}`}>
                  {stageCandidates.length}
                </span>
              </div>

              {isDropTarget && (
                <div className="mb-2 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/60 py-3 text-center text-xs font-semibold text-indigo-600">
                  Drop here → {STAGE_LABELS[stage]}
                </div>
              )}

              <div className="space-y-3">
                {stageCandidates.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.effectAllowed = "move";
                      // ghost image: slightly delayed so card is visible before ghost
                      setTimeout(() => {}, 0);
                    }}
                    onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                    className={`rounded-xl border bg-white p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing select-none ${sc.cardBorder} ${dragId === c.id ? "opacity-40 scale-95" : "opacity-100"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{c.name}</p>
                        <p className="truncate text-xs text-slate-500">{c.role_applied || "Unassigned role"}</p>
                      </div>
                      <div className={`flex-shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${sc.badge}`}>
                        {(c.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /><span className="truncate">{c.email || "No email"}</span></div>
                      {c.phone && <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{c.phone}</div>}
                      <div className="flex items-center gap-1.5"><CalendarClock size={12} className="text-slate-400" />{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
                    </div>

                    {/* Stage selector */}
                    <select
                      value={c.stage || "Applied"}
                      onChange={(e) => updateCandidateStage(c.id, e.target.value as CandidateStage)}
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none"
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>

                    {/* Stage-specific actions */}
                    {stage === "Applied" && (
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <button
                          onClick={() => updateCandidateStage(c.id, "Interviewing")}
                          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                        >
                          Schedule Interview →
                        </button>
                        <button
                          onClick={() => deleteCandidate(c)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                        >
                          <Trash2 size={12} /> Delete Candidate
                        </button>
                      </div>
                    )}
                    {stage === "Interviewing" && (
                      <button
                        onClick={() => updateCandidateStage(c.id, "Offered")}
                        className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Make Offer →
                      </button>
                    )}
                    {stage === "Offered" && (() => {
                      const offerStatus = String(c.notes || "") as OfferLifecycleStatus;
                      const hasWorkspaceStatus = ["offer_sent", "awaiting_signature", "offer_signed", "pre_onboarding", "offer_revision_requested", "offer_declined"].includes(offerStatus);
                      const hasEmployeeRecord = employeeEmailSet.has(String(c.email || "").trim().toLowerCase());
                      const hasWorkspace = hasWorkspaceStatus || hasEmployeeRecord;
                      const statusBadge: Record<string, { label: string; cls: string }> = {
                        employee_created: { label: "Offer Draft Ready", cls: "border-indigo-200 bg-indigo-50 text-indigo-700" },
                        offer_sent: { label: "Offer Sent", cls: "border-blue-200 bg-blue-50 text-blue-700" },
                        awaiting_signature: { label: "Awaiting Response", cls: "border-amber-200 bg-amber-50 text-amber-700" },
                        offer_signed: { label: "Offer Accepted", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                        pre_onboarding: { label: "Moved to Pre-Onboarding", cls: "border-violet-200 bg-violet-50 text-violet-700" },
                        offer_revision_requested: { label: "Revision Requested", cls: "border-orange-200 bg-orange-50 text-orange-700" },
                        offer_declined: { label: "Offer Declined", cls: "border-rose-200 bg-rose-50 text-rose-700" },
                      };
                      const badge = statusBadge[offerStatus];

                      return (
                        <div className="mt-2 space-y-2">
                          {badge && !(offerStatus === "employee_created" && !hasEmployeeRecord) && (
                            <div className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</div>
                          )}

                          {offerStatus === "employee_created" && !hasEmployeeRecord && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700">
                              Workspace not found in current scope. Regenerate Offer Workspace.
                            </div>
                          )}

                          {!badge && hasEmployeeRecord && (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700">
                              Offer Workspace Linked
                            </div>
                          )}

                          {!hasWorkspace && (
                            <button
                              onClick={() => hireCandidate(c)}
                              disabled={processingId === c.id}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                            >
                              {processingId === c.id ? "Preparing..." : <><UserPlus size={13} /> Generate Offer Workspace</>}
                            </button>
                          )}

                          {hasWorkspace && !["offer_signed", "pre_onboarding"].includes(offerStatus) && (
                            <Link href={`/team/offer-management?email=${encodeURIComponent(String(c.email || ""))}`} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition">
                              <Send size={12} /> Open Offer Actions <ChevronRight size={11} />
                            </Link>
                          )}

                          {offerStatus === "offer_signed" && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                              Offer accepted. Candidate will move through pre-onboarding.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {stage === "Hired" && (() => {
                      const offerStatus = String(c.notes || "") as OfferLifecycleStatus;
                      const statusBadge: Record<string, { label: string; cls: string }> = {
                        "offer_signed":      { label: "Offer Accepted ✓", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                        "pre_onboarding":    { label: "Pre-Onboarding In Progress", cls: "border-violet-200 bg-violet-50 text-violet-700" },
                      };
                      const badge = statusBadge[offerStatus];
                      return (
                        <div className="mt-2 space-y-2">
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <p className="text-[10px] font-bold text-emerald-800">Offer Accepted ✓</p>
                            <p className="mt-1 text-[10px] text-emerald-700">Employee record created and candidate is now in accepted stage.</p>
                          </div>
                          {badge && (
                            <div className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</div>
                          )}
                          <div className="grid grid-cols-1 gap-2">
                            <Link href="/team/onboarding" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 transition">
                              Open Onboarding Queue <ChevronRight size={11} />
                            </Link>
                            <Link href="/team/employees" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                              View Employee Record
                            </Link>
                          </div>
                        </div>
                      );
                    })()}
                  </article>
                ))}

                {stageCandidates.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-5 text-center">
                    <p className="text-xs text-slate-400">No candidates in {STAGE_LABELS[stage]}.</p>
                    {stage === "Applied" && (
                      <button onClick={() => setShowAddModal(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                        <Plus size={12} /> Add Candidate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Candidate</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">First Name</label>
                  <input
                    required
                    type="text"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Last Name</label>
                  <input
                    required
                    type="text"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Role Applied For</label>
                <input
                  required
                  type="text"
                  value={formData.role_applied_for}
                  onChange={e => setFormData({ ...formData, role_applied_for: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}