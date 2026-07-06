"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Circle, Clock, Download, Eye, FileText, RefreshCw, Send, Trash2, Upload, X } from "lucide-react";
import EditEmployeeForm from "@/app/hrms/v2/components/edit-employee-form";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";

type Option = { id: string; name: string; business_entity_id?: string | null };
type ManagerOption = { id: string; name: string };
type HistoryRow = { id: string; designation: string; department: string; effective_from: string; effective_to: string | null };
type DocumentRow = { id: string; file_name: string; file_path?: string | null; storage_path?: string | null };
type ChecklistTask = {
  id: 'contract' | 'id' | 'handbook';
  title: string;
  status: 'action_required' | 'sending' | 'sent' | 'pending_employee' | 'completed';
  type: 'send_doc' | 'upload' | 'review';
};

type LetterHistoryRow = {
  id: string;
  employee_id: string;
  template_key: string;
  template_version: number;
  letter_type: 'offer' | 'appointment' | 'contract';
  file_name: string;
  created_at: string;
  regenerated_from?: string | null;
};

type LetterDetail = LetterHistoryRow & {
  storage_path?: string;
  rendered_subject?: string;
  rendered_body?: string;
  merge_payload?: Record<string, unknown>;
};

function buildDefaultChecklist(hasDocuments: boolean): ChecklistTask[] {
  return [
    { id: 'contract', title: 'Sign Employment Contract', status: 'action_required', type: 'send_doc' },
    { id: 'id', title: 'Upload Government ID', status: hasDocuments ? 'completed' : 'pending_employee', type: 'upload' },
    { id: 'handbook', title: 'Review Employee Handbook', status: 'pending_employee', type: 'review' },
  ];
}

function normalizeChecklist(value: unknown, hasDocuments: boolean): ChecklistTask[] {
  const defaults = buildDefaultChecklist(hasDocuments);
  if (Array.isArray(value)) {
    return defaults.map((fallback) => {
      const match = value.find((item) => item && typeof item === 'object' && (item as ChecklistTask).id === fallback.id) as Partial<ChecklistTask> | undefined;
      return {
        ...fallback,
        ...match,
        id: fallback.id,
        title: match?.title || fallback.title,
        type: match?.type || fallback.type,
        status: match?.status || fallback.status,
      };
    });
  }

  if (!value || typeof value !== 'object') return [];

  const source = Array.isArray((value as any).tasks) ? ((value as any).tasks as ChecklistTask[]) : [];

  if (source.length === 0) return [];

  return defaults.map((fallback) => {
    const match = source.find((item) => item && typeof item === 'object' && (item as ChecklistTask).id === fallback.id) as Partial<ChecklistTask> | undefined;
    return {
      ...fallback,
      ...match,
      id: fallback.id,
      title: match?.title || fallback.title,
      type: match?.type || fallback.type,
      status: match?.status || fallback.status,
    };
  });
}

export default function EmployeeV2ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [employee, setEmployee] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRaw, setParsedRaw] = useState<any | null>(null);
  const [parsedMapped, setParsedMapped] = useState<any | null>(null);
  const [entities, setEntities] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [serviceHistory, setServiceHistory] = useState<HistoryRow[]>([]);
  const [historySaving, setHistorySaving] = useState(false);
  const [historyEditId, setHistoryEditId] = useState<string | null>(null);
  const [historyForm, setHistoryForm] = useState({ designation: '', department: '', effective_from: '', effective_to: '' });
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [contractSending, setContractSending] = useState(false);
  const [offerGenerating, setOfferGenerating] = useState(false);
  const [appointmentGenerating, setAppointmentGenerating] = useState(false);
  const [startingOnboarding, setStartingOnboarding] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [tasks, setTasks] = useState<ChecklistTask[]>(buildDefaultChecklist(false));
  const [letters, setLetters] = useState<LetterHistoryRow[]>([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const [letterPreviewUrl, setLetterPreviewUrl] = useState<string | null>(null);
  const [letterPreviewTitle, setLetterPreviewTitle] = useState('');
  const [selectedCompareA, setSelectedCompareA] = useState('');
  const [selectedCompareB, setSelectedCompareB] = useState('');
  const [compareA, setCompareA] = useState<LetterDetail | null>(null);
  const [compareB, setCompareB] = useState<LetterDetail | null>(null);
  const [compareMode, setCompareMode] = useState<'compact' | 'plain'>('compact');
  const [regeneratingLetterId, setRegeneratingLetterId] = useState<string | null>(null);
  const resumeFileRef = useRef<HTMLInputElement | null>(null);
  const documentFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchEmployee(); fetchReferenceData(); fetchServiceHistory(); fetchDocuments(); fetchLetters(); }, [id]);

  useEffect(() => {
    if (!employee) return;
    setTasks(normalizeChecklist(employee.onboarding_checklist, documents.length > 0));
  }, [employee, documents]);

  useEffect(() => {
    return () => {
      if (letterPreviewUrl) {
        window.URL.revokeObjectURL(letterPreviewUrl);
      }
    };
  }, [letterPreviewUrl]);

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return {
        'x-dev-mode': 'true',
      };
    }

    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshResult = await supabase.auth.refreshSession();
      token = refreshResult.data.session?.access_token;
    }

    if (!token) throw new Error('No active session');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function jsonAuthHeader(): Promise<Record<string, string>> {
    const headers = await authHeader();
    return {
      ...headers,
      'Content-Type': 'application/json',
    };
  }

  async function fetchEmployee() {
    if (!id) return;
    setLoading(true);
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}`, { headers });
      const body = await res.json();
      setEmployee(body.data || null);
    } catch {
      setEmployee(null);
    }
    setLoading(false);
  }

  async function fetchReferenceData() {
    try {
      const headers = await jsonAuthHeader();
      const [beRes, deptRes, desigRes, mgrRes] = await Promise.all([
        fetch('/api/hrms/v2/business-entities', { headers }),
        fetch('/api/hrms/v2/departments', { headers }),
        fetch('/api/hrms/v2/designations', { headers }),
        fetch('/api/hrms/v2/employees?page=1&pageSize=200&includeArchived=true', { headers }),
      ]);

      const beBody = await beRes.json();
      const deptBody = await deptRes.json();
      const desigBody = await desigRes.json();
      const mgrBody = await mgrRes.json();

      if (beRes.ok) setEntities((beBody.data || []).map((r: any) => ({ id: r.id, name: r.name })));
      if (deptRes.ok) setDepartments((deptBody.data || []).map((r: any) => ({ id: r.id, name: r.name, business_entity_id: r.business_entity_id })));
      if (desigRes.ok) setDesignations((desigBody.data || []).map((r: any) => ({ id: r.id, name: r.name, business_entity_id: r.business_entity_id })));
      if (mgrRes.ok) setManagers((mgrBody.data || []).map((r: any) => ({ id: r.id, name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.id })));
    } catch {
      // Non-blocking for profile rendering
    }
  }

  async function fetchServiceHistory() {
    if (!id) return;
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/service-history`, { headers });
      const body = await res.json();
      if (res.ok) setServiceHistory(body.data || []);
    } catch {
      setServiceHistory([]);
    }
  }

  async function fetchDocuments() {
    if (!id) return;
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/documents`, { headers });
      const body = await res.json();

      if (!res.ok) throw new Error(body.error || 'Failed to fetch documents');
      setDocuments((body.data || []) as DocumentRow[]);
    } catch {
      setDocuments([]);
    }
  }

  async function fetchLetters() {
    if (!id) return;

    setLettersLoading(true);
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/letters`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to fetch letters');

      const rows = (body.data || []) as LetterHistoryRow[];
      setLetters(rows);

      if (!selectedCompareA && rows[0]?.id) setSelectedCompareA(rows[0].id);
      if (!selectedCompareB && rows[1]?.id) setSelectedCompareB(rows[1].id);
    } catch {
      setLetters([]);
    } finally {
      setLettersLoading(false);
    }
  }

  async function fetchLetterDetail(letterId: string): Promise<LetterDetail | null> {
    if (!id || !letterId) return null;

    const headers = await jsonAuthHeader();
    const res = await fetch(`/api/hrms/v2/employees/${id}/letters/${letterId}`, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to fetch letter details');
    return (body.data || null) as LetterDetail | null;
  }

  async function openLetterPreview(letter: LetterHistoryRow) {
    if (!id) return;

    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/letters/${letter.id}/download`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to preview letter PDF');
      }

      const blob = await res.blob();
      if (letterPreviewUrl) window.URL.revokeObjectURL(letterPreviewUrl);
      const url = window.URL.createObjectURL(blob);
      setLetterPreviewUrl(url);
      setLetterPreviewTitle(letter.file_name);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to preview letter.' });
    }
  }

  async function downloadLetter(letter: LetterHistoryRow) {
    if (!id) return;

    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/letters/${letter.id}/download`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to download letter');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = letter.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to download letter.' });
    }
  }

  async function regenerateLetter(letter: LetterHistoryRow) {
    if (!id) return;

    setRegeneratingLetterId(letter.id);
    setActionMessage(null);
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/letters/${letter.id}/regenerate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to regenerate letter');

      await Promise.all([fetchLetters(), fetchDocuments()]);
      setActionMessage({ type: 'success', text: `Letter regenerated from ${letter.template_key} v${letter.template_version}.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to regenerate letter.' });
    } finally {
      setRegeneratingLetterId(null);
    }
  }

  async function compareLetters() {
    if (!selectedCompareA || !selectedCompareB) {
      setActionMessage({ type: 'error', text: 'Select two letters to compare.' });
      return;
    }

    try {
      const [left, right] = await Promise.all([
        fetchLetterDetail(selectedCompareA),
        fetchLetterDetail(selectedCompareB),
      ]);

      setCompareA(left);
      setCompareB(right);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to compare letters.' });
    }
  }

  function splitSentences(text: string) {
    const raw = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (raw.length > 0) return raw;
    return text.trim() ? [text.trim()] : [];
  }

  function normalizeChunk(chunk: string) {
    return chunk.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function tokenSet(text: string) {
    const tokens = text.toLowerCase().match(/[a-z0-9_%-]+/g) || [];
    return new Set(tokens);
  }

  function renderCompactDiff(sourceText: string, targetText: string) {
    const sourceChunks = splitSentences(sourceText);
    const targetChunks = splitSentences(targetText);
    const targetChunkSet = new Set(targetChunks.map(normalizeChunk));
    const targetTokens = tokenSet(targetText);

    if (sourceChunks.length === 0) {
      return <p className="text-[10px] text-white/40">No content.</p>;
    }

    return (
      <div className="space-y-1">
        {sourceChunks.map((chunk, idx) => {
          const changed = !targetChunkSet.has(normalizeChunk(chunk));

          if (!changed || compareMode === 'plain') {
            return (
              <p
                key={`${idx}-${chunk.slice(0, 16)}`}
                className={`rounded px-1 py-0.5 text-[10px] leading-relaxed ${changed ? 'bg-amber-500/15 text-amber-100' : 'text-white/60'}`}
              >
                {chunk}
              </p>
            );
          }

          const pieces = chunk.split(/(\s+)/);
          return (
            <p key={`${idx}-${chunk.slice(0, 16)}`} className="rounded bg-amber-500/15 px-1 py-0.5 text-[10px] leading-relaxed text-amber-100">
              {pieces.map((piece, pieceIdx) => {
                const token = piece.toLowerCase().match(/[a-z0-9_%-]+/g)?.[0];
                const tokenChanged = token ? !targetTokens.has(token) : false;

                if (!tokenChanged) {
                  return <span key={`${idx}-p-${pieceIdx}`}>{piece}</span>;
                }

                return (
                  <span key={`${idx}-p-${pieceIdx}`} className="rounded bg-red-500/30 px-0.5 text-red-100">
                    {piece}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    );
  }

  async function persistChecklist(nextTasks: ChecklistTask[]) {
    if (!id) return;

    const currentChecklist = employee?.onboarding_checklist;
    const checklistPayload =
      currentChecklist && typeof currentChecklist === 'object' && !Array.isArray(currentChecklist)
        ? { ...currentChecklist, tasks: nextTasks }
        : { tasks: nextTasks, pre_onboarding: null, onboarding_handoff: null };

    const headers = await jsonAuthHeader();
    const res = await fetch(`/api/hrms/v2/employees/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ onboarding_checklist: checklistPayload }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to save onboarding checklist');

    setTasks(nextTasks);
    setEmployee((prev: any) => prev ? { ...prev, onboarding_checklist: checklistPayload } : prev);
  }

  async function handleParsedResume(file: File) {
    setIsParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/hr/parse-resume', { method: 'POST', body: form });
      const body = await res.json();
      const parsed = body.parsed || null;
      const mapped = body.mapped || null;

      setParsedRaw(parsed);
      setParsedMapped(mapped);

      if (!parsed && !mapped) {
        alert('Parsed resume returned no usable data.');
      }
    } catch (err) {
      console.error(err);
      alert('Resume parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }

  async function applyMapped() {
    if (!parsedMapped) return;
    const update: any = {};
    ['first_name','last_name','email','phone','current_title','experience_years','skills'].forEach(k => {
      if (parsedMapped[k] !== undefined && parsedMapped[k] !== null) update[k] = parsedMapped[k];
    });
    if (Object.keys(update).length === 0) {
      alert('No mapped fields to apply.');
      return;
    }
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}`, { method: 'PUT', headers, body: JSON.stringify(update) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Update failed');
      await fetchEmployee();
      setParsedMapped(null);
      setParsedRaw(null);
      alert('Mapped fields applied.');
    } catch (err: any) {
      console.error(err);
      alert('Failed to apply mapped fields: ' + (err.message || err));
    }
  }

  function discardMapped() {
    setParsedMapped(null);
    setParsedRaw(null);
  }

  function startEditHistory(row: HistoryRow) {
    setHistoryEditId(row.id);
    setHistoryForm({
      designation: row.designation || '',
      department: row.department || '',
      effective_from: row.effective_from || '',
      effective_to: row.effective_to || '',
    });
  }

  function resetHistoryForm() {
    setHistoryEditId(null);
    setHistoryForm({ designation: '', department: '', effective_from: '', effective_to: '' });
  }

  async function submitHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setHistorySaving(true);
    try {
      const headers = await jsonAuthHeader();
      const path = historyEditId
        ? `/api/hrms/v2/employees/${id}/service-history/${historyEditId}`
        : `/api/hrms/v2/employees/${id}/service-history`;
      const method = historyEditId ? 'PUT' : 'POST';
      const res = await fetch(path, {
        method,
        headers,
        body: JSON.stringify({
          designation: historyForm.designation,
          department: historyForm.department,
          effective_from: historyForm.effective_from,
          effective_to: historyForm.effective_to || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save service history');

      resetHistoryForm();
      await fetchServiceHistory();
      await fetchEmployee();
    } catch (err: any) {
      alert(err.message || 'Failed to save service history');
    } finally {
      setHistorySaving(false);
    }
  }

  async function deleteHistory(idToDelete: string) {
    if (!id) return;
    const ok = window.confirm('Delete this service history row?');
    if (!ok) return;
    setHistorySaving(true);
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/service-history/${idToDelete}`, { method: 'DELETE', headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      await fetchServiceHistory();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setHistorySaving(false);
    }
  }

  async function handleSendContract(taskId?: ChecklistTask['id']) {
    if (!employee?.email) {
      setActionMessage({ type: 'error', text: 'Employee email is required before sending a contract.' });
      return;
    }

    const sendingTasks: ChecklistTask[] = taskId
      ? tasks.map((task) => task.id === taskId ? { ...task, status: 'sending' as const } : task)
      : tasks;
    if (taskId) setTasks(sendingTasks);
    setContractSending(true);
    setActionMessage(null);

    try {
      const response = await fetch('/api/hr/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          email: employee.email,
          name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email,
          salary: employee.salary ?? null,
          role: getDesignationName(employee.designation_id),
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to send contract');
      }

      setActionMessage({ type: 'success', text: body.message || 'Contract sent successfully.' });
      if (taskId) {
        const nextTasks: ChecklistTask[] = sendingTasks.map((task) => task.id === taskId ? { ...task, status: 'sent' as const } : task);
        await persistChecklist(nextTasks);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to send contract.' });
      if (taskId) {
        setTasks(tasks.map((task) => task.id === taskId ? { ...task, status: 'action_required' as const } : task));
      }
    } finally {
      setContractSending(false);
    }
  }

  async function handleMarkComplete(taskId: ChecklistTask['id']) {
    const nextTasks: ChecklistTask[] = tasks.map((task) => task.id === taskId ? { ...task, status: 'completed' as const } : task);
    try {
      await persistChecklist(nextTasks);
      setActionMessage({ type: 'success', text: 'Checklist item marked complete.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update checklist.' });
    }
  }

  function handleNudge() {
    if (!employee?.email) {
      setActionMessage({ type: 'error', text: 'Employee email is required before sending a reminder.' });
      return;
    }
    setActionMessage({ type: 'success', text: `Reminder prepared for ${employee.email}.` });
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    setActionMessage(null);

    try {
      const headers = await authHeader();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/hrms/v2/employees/${id}/documents`, {
        method: 'POST',
        headers,
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to upload document');

      await fetchDocuments();
      const nextTasks: ChecklistTask[] = tasks.map((task) => task.id === 'id' ? { ...task, status: 'completed' as const } : task);
      await persistChecklist(nextTasks);
      setActionMessage({ type: 'success', text: 'Document uploaded successfully.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setIsUploading(false);
      if (documentFileRef.current) documentFileRef.current.value = '';
    }
  }

  async function handleGenerateLetter(templateKey: 'offer_letter' | 'appointment_letter') {
    if (!id) return;

    if (templateKey === 'offer_letter') setOfferGenerating(true);
    if (templateKey === 'appointment_letter') setAppointmentGenerating(true);
    setActionMessage(null);

    try {
      const headers = await jsonAuthHeader();
      const response = await fetch(`/api/hrms/v2/employees/${id}/letters`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ template_key: templateKey }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to generate letter');
      }

      await Promise.all([fetchDocuments(), fetchLetters()]);
      const templateLabel = templateKey === 'offer_letter' ? 'Offer letter' : 'Appointment letter';
      setActionMessage({ type: 'success', text: `${templateLabel} generated and added to Documents Vault.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to generate letter.' });
    } finally {
      setOfferGenerating(false);
      setAppointmentGenerating(false);
    }
  }

  async function deleteDocument(docId: string) {
    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/documents/${docId}`, {
        method: 'DELETE',
        headers,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to delete document');

      const nextDocuments = documents.filter((item) => item.id !== docId);
      setDocuments(nextDocuments);
      const nextTasks: ChecklistTask[] = tasks.map((task) => task.id === 'id' && nextDocuments.length === 0 ? { ...task, status: 'pending_employee' as const } : task);
      await persistChecklist(nextTasks);
      setActionMessage({ type: 'success', text: 'Document deleted.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete document.' });
    }
  }

  async function viewDocument(doc: DocumentRow) {
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/employees/${id}/documents/${doc.id}`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to open document');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to open document.' });
    }
  }

  async function handleStartOnboarding() {
    if (!employee?.id) return;

    setStartingOnboarding(true);
    setActionMessage(null);

    try {
      const headers = await jsonAuthHeader();
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'onboarding',
          employment_status: 'onboarding',
          archived_at: null,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to move employee to onboarding');

      await fetchEmployee();
      setActionMessage({ type: 'success', text: 'Employee moved to onboarding queue.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to start onboarding.' });
    } finally {
      setStartingOnboarding(false);
    }
  }

  function getEntityName(entityId: string | null | undefined) {
    if (!entityId) return '—';
    return entities.find((e) => e.id === entityId)?.name || entityId;
  }

  function getDepartmentName(deptId: string | null | undefined) {
    if (!deptId) return activeHistory?.department || employee.department || '—';
    return departments.find((d) => d.id === deptId)?.name || activeHistory?.department || employee.department || deptId;
  }

  function getDesignationName(desigId: string | null | undefined) {
    if (!desigId) return activeHistory?.designation || employee.designation || employee.current_title || '—';
    return designations.find((d) => d.id === desigId)?.name || activeHistory?.designation || employee.designation || employee.current_title || desigId;
  }

  function getManagerName(managerId: string | null | undefined) {
    if (!managerId) return '—';
    return managers.find((m) => m.id === managerId)?.name || managerId;
  }

  function isHistoryActive(row: HistoryRow) {
    if (row.effective_to) return false;
    return true;
  }

  const activeHistory = serviceHistory.find((row) => isHistoryActive(row));
  const preOnboardingStatus = String(employee?.onboarding_checklist?.pre_onboarding?.status || 'pending').toLowerCase();
  const preOnboardingLabel =
    preOnboardingStatus === 'reviewed'
      ? 'Reviewed by HR'
      : preOnboardingStatus === 'submitted'
      ? 'Submitted by Employee'
      : preOnboardingStatus === 'ready' || preOnboardingStatus === 'ready_for_activation'
      ? 'Ready for Activation'
      : 'Awaiting Submission';
  const preOnboardingBadgeClass =
    preOnboardingStatus === 'reviewed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : preOnboardingStatus === 'submitted'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : preOnboardingStatus === 'ready' || preOnboardingStatus === 'ready_for_activation'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  const showChecklistTasks = tasks.length > 0 && preOnboardingStatus !== 'reviewed';
  const hasOfferLetter = letters.some((letter) => letter.template_key === 'offer_letter');
  const hasAppointmentLetter = letters.some((letter) => letter.template_key === 'appointment_letter');
  const contractTask = tasks.find((task) => task.id === 'contract');
  const isAlreadyOnboarding = String(employee?.status || '').toLowerCase() === 'onboarding';
  const isAlreadyActive = String(employee?.status || '').toLowerCase() === 'active';
  const contractDone =
    contractTask?.status === 'sent' ||
    contractTask?.status === 'completed' ||
    hasOfferLetter ||
    hasAppointmentLetter ||
    isAlreadyActive;
  const offerLetterDone = hasOfferLetter || isAlreadyActive;
  const appointmentLetterDone = hasAppointmentLetter || isAlreadyActive;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await handleParsedResume(f);
    if (resumeFileRef.current) resumeFileRef.current.value = '';
  }

  if (loading) return <div className="hrms-enterprise flex h-screen items-center justify-center text-slate-500">Loading employee...</div>;
  if (!employee) return <div className="hrms-enterprise h-screen p-8 text-slate-700">Employee not found.</div>;

  return (
    <div className="hrms-enterprise min-h-screen p-8 text-slate-900">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
      <HRMSTopHeader
        title={`${employee.first_name || "Employee"} ${employee.last_name || ""}`.trim()}
        subtitle={`${getDesignationName(employee.designation_id)} • ${getDepartmentName(employee.department_id)}`}
        actions={
          <>
            <button onClick={() => setEditing(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700">Edit</button>
            <button onClick={() => resumeFileRef.current?.click()} className="rounded-lg bg-blue-600 px-4 py-2 text-white">{isParsing ? 'Parsing...' : 'Parse Resume'}</button>
            <input ref={resumeFileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />
          </>
        }
      />

      {actionMessage && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${actionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {actionMessage.text}
        </div>
      )}

      {parsedMapped && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="font-bold mb-2">Parsed Preview</h4>
          <div className="space-y-1 text-sm text-slate-700">
            <div><strong>Name:</strong> {parsedMapped.first_name || ''} {parsedMapped.last_name || ''}</div>
            <div><strong>Email:</strong> {parsedMapped.email || '—'}</div>
            <div><strong>Phone:</strong> {parsedMapped.phone || '—'}</div>
            <div><strong>Title:</strong> {parsedMapped.current_title || parsedMapped.title || '—'}</div>
            <div><strong>Skills:</strong> {parsedMapped.skills ? (Array.isArray(parsedMapped.skills) ? parsedMapped.skills.join(', ') : String(parsedMapped.skills)) : '—'}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={applyMapped} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">Apply Mapped Fields</button>
            <button onClick={discardMapped} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-700">Discard</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><CheckCircle2 className="text-indigo-500" size={18} /> Onboarding Progress</h3>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${preOnboardingBadgeClass}`}>{preOnboardingLabel}</span>
            </div>
            {!showChecklistTasks ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Pre-onboarding has been reviewed. Continue from onboarding actions on the right panel and team onboarding queue.
              </p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    {task.status === 'completed' ? <CheckCircle2 className="text-emerald-500" size={18} /> : <Circle className="text-slate-400" size={18} />}
                    <span className={`${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'action_required' && task.type === 'send_doc' && (
                      <>
                        <button onClick={() => setIsPreviewModalOpen(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"> <span className="inline-flex items-center gap-1"><Eye size={12} /> Preview</span></button>
                        <button onClick={() => handleSendContract(task.id)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white"> <span className="inline-flex items-center gap-1"><Send size={12} /> Send Contract</span></button>
                      </>
                    )}
                    {task.status === 'sending' && <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] uppercase text-indigo-600"><span className="inline-flex items-center gap-1"><Clock size={12} /> Sending</span></span>}
                    {task.status === 'sent' && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] uppercase text-emerald-700">Sent</span>}
                    {task.status === 'pending_employee' && (
                      <>
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase text-amber-700">Waiting on Employee</span>
                        <button onClick={() => handleNudge()} className="rounded bg-white px-2.5 py-1 text-[10px] uppercase text-slate-600">Nudge</button>
                        <button onClick={() => handleMarkComplete(task.id)} className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] uppercase text-emerald-700">Verify</button>
                      </>
                    )}
                    {task.status === 'completed' && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] uppercase text-emerald-700">Completed</span>}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Profile</h3>
          <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div><strong>Email:</strong> {employee.email || '—'}</div>
            <div><strong>Mobile:</strong> {employee.mobile || '—'}</div>
            <div><strong>Phone:</strong> {employee.phone || '—'}</div>
            <div><strong>DOB:</strong> {employee.date_of_birth || '—'}</div>
            <div><strong>Gender:</strong> {employee.gender || '—'}</div>
            <div><strong>Address:</strong> {employee.address || '—'}</div>
            <div><strong>Department:</strong> {getDepartmentName(employee.department_id)}</div>
            <div><strong>Designation:</strong> {getDesignationName(employee.designation_id)}</div>
            <div><strong>Business Entity:</strong> {getEntityName(employee.business_entity_id)}</div>
            <div><strong>Joining Date:</strong> {(employee.joining_date || employee.date_of_joining) ? new Date(employee.joining_date || employee.date_of_joining).toLocaleDateString() : '—'}</div>
            <div><strong>Employment Status:</strong> {employee.employment_status || employee.status || '—'}</div>
            <div><strong>Reporting Manager:</strong> {getManagerName(employee.reporting_manager_id)}</div>
            <div><strong>PF Number:</strong> {employee.pf_number || '—'}</div>
            <div><strong>Aadhaar:</strong> {employee.aadhaar || employee.aadhaar_number_masked || '—'}</div>
            <div><strong>PAN:</strong> {employee.pan || employee.pan_number || '—'}</div>
            <div><strong>Salary:</strong> {employee.salary ? `₹${employee.salary.toLocaleString()}` : '—'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Service History Timeline</h3>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <span className="text-slate-500">Active Role: </span>
            {activeHistory ? (
              <>
                <span className="font-semibold text-emerald-700">{activeHistory.designation}</span>
                <span className="text-slate-500"> in {activeHistory.department}</span>
                <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Current</span>
              </>
            ) : (
              <span className="text-slate-500">No current active role set</span>
            )}
          </div>

          <form onSubmit={submitHistory} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <input required value={historyForm.designation} onChange={(e) => setHistoryForm({ ...historyForm, designation: e.target.value })} className="rounded border border-slate-200 bg-white p-2" placeholder="Designation" />
            <input required value={historyForm.department} onChange={(e) => setHistoryForm({ ...historyForm, department: e.target.value })} className="rounded border border-slate-200 bg-white p-2" placeholder="Department" />
            <input required type="date" value={historyForm.effective_from} onChange={(e) => setHistoryForm({ ...historyForm, effective_from: e.target.value })} className="rounded border border-slate-200 bg-white p-2" />
            <input type="date" value={historyForm.effective_to || ''} onChange={(e) => setHistoryForm({ ...historyForm, effective_to: e.target.value })} className="rounded border border-slate-200 bg-white p-2" />
            <div className="flex gap-2 md:col-span-4">
              <button disabled={historySaving} className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-50">{historySaving ? 'Saving...' : (historyEditId ? 'Update Entry' : 'Add Entry')}</button>
              {historyEditId && <button type="button" onClick={resetHistoryForm} className="rounded border border-slate-200 bg-white px-3 py-2 text-slate-700">Cancel Edit</button>}
            </div>
          </form>

          {serviceHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No service history entries found.</p>
          ) : (
            <ul className="space-y-2">
              {serviceHistory.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm text-slate-700">
                    <div className="font-semibold flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${isHistoryActive(row) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {row.designation} - {row.department}
                      {isHistoryActive(row) && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Active</span>}
                    </div>
                    <div className="text-slate-500">{row.effective_from} to {row.effective_to || 'Present'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditHistory(row)} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">Edit</button>
                    <button onClick={() => deleteHistory(row.id)} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>

        <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Actions</h3>
          <div className="flex flex-col gap-3">
            {contractDone ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Contract already sent</div>
            ) : (
              <button onClick={() => handleSendContract()} disabled={contractSending} className="rounded-lg border border-slate-200 bg-white py-2 text-slate-700 disabled:opacity-50">
                {contractSending ? 'Sending Contract...' : 'Send Contract'}
              </button>
            )}

            {offerLetterDone ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Offer letter already generated</div>
            ) : (
              <button onClick={() => handleGenerateLetter('offer_letter')} disabled={offerGenerating || appointmentGenerating} className="rounded-lg border border-slate-200 bg-white py-2 text-slate-700 disabled:opacity-50">
                {offerGenerating ? 'Generating Offer Letter...' : 'Generate Offer Letter (PDF)'}
              </button>
            )}

            {appointmentLetterDone ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Appointment letter already generated</div>
            ) : (
              <button onClick={() => handleGenerateLetter('appointment_letter')} disabled={appointmentGenerating || offerGenerating} className="rounded-lg border border-slate-200 bg-white py-2 text-slate-700 disabled:opacity-50">
                {appointmentGenerating ? 'Generating Appointment Letter...' : 'Generate Appointment Letter (PDF)'}
              </button>
            )}

            {isAlreadyOnboarding ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">Employee is already in onboarding queue</div>
            ) : isAlreadyActive ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Employee is already active</div>
            ) : (
              <button onClick={handleStartOnboarding} disabled={startingOnboarding} className="rounded-lg border border-slate-200 bg-white py-2 text-slate-700 disabled:opacity-50">
                {startingOnboarding ? 'Starting Onboarding...' : 'Start Onboarding'}
              </button>
            )}
            <button onClick={() => router.push('/team/onboarding')} className="rounded-lg border border-slate-200 bg-white py-2 text-slate-700">View Team Onboarding</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Letter History & Comparison</h3>

          {lettersLoading ? (
            <p className="text-sm text-slate-500">Loading letter history...</p>
          ) : letters.length === 0 ? (
            <p className="text-sm text-slate-500">No generated letters yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {letters.map((letter) => (
                <div key={letter.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{letter.template_key} v{letter.template_version}</p>
                      <p className="text-xs text-slate-500">{new Date(letter.created_at).toLocaleString()}</p>
                      {letter.regenerated_from ? (
                        <p className="mt-1 text-[10px] text-indigo-600">Regenerated from {letter.regenerated_from.slice(0, 8)}...</p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] uppercase text-slate-600">{letter.letter_type}</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openLetterPreview(letter)} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase text-slate-700 hover:bg-slate-50">
                      <Eye size={12} /> Preview
                    </button>
                    <button onClick={() => downloadLetter(letter)} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase text-slate-700 hover:bg-slate-50">
                      <Download size={12} /> Download
                    </button>
                    <button onClick={() => regenerateLetter(letter)} disabled={regeneratingLetterId === letter.id} className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] uppercase text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                      <RefreshCw size={12} className={regeneratingLetterId === letter.id ? 'animate-spin' : ''} /> {regeneratingLetterId === letter.id ? 'Regenerating' : 'Regenerate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {letters.length >= 2 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Compare two generated versions</p>
              <div className="grid grid-cols-1 gap-2">
                <select value={selectedCompareA} onChange={(e) => setSelectedCompareA(e.target.value)} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                  <option value="">Select version A</option>
                  {letters.map((letter) => (
                    <option key={`a-${letter.id}`} value={letter.id}>{`${letter.template_key} v${letter.template_version} - ${new Date(letter.created_at).toLocaleDateString()}`}</option>
                  ))}
                </select>
                <select value={selectedCompareB} onChange={(e) => setSelectedCompareB(e.target.value)} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                  <option value="">Select version B</option>
                  {letters.map((letter) => (
                    <option key={`b-${letter.id}`} value={letter.id}>{`${letter.template_key} v${letter.template_version} - ${new Date(letter.created_at).toLocaleDateString()}`}</option>
                  ))}
                </select>
                <button onClick={compareLetters} className="rounded bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Compare Versions</button>
                <div className="flex items-center justify-end gap-2 text-[10px]">
                  <span className="text-slate-600">Mode:</span>
                  <button
                    onClick={() => setCompareMode('compact')}
                    className={`rounded px-2 py-1 ${compareMode === 'compact' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-600'}`}
                  >
                    Compact Diff
                  </button>
                  <button
                    onClick={() => setCompareMode('plain')}
                    className={`rounded px-2 py-1 ${compareMode === 'plain' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600'}`}
                  >
                    Plain
                  </button>
                </div>
              </div>

              {compareA && compareB && (
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-indigo-700">A: {compareA.template_key} v{compareA.template_version}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{compareA.rendered_subject || 'No subject'}</p>
                    <div className="mt-2 max-h-44 overflow-auto">{renderCompactDiff(compareA.rendered_body || '', compareB.rendered_body || '')}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-indigo-700">B: {compareB.template_key} v{compareB.template_version}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{compareB.rendered_subject || 'No subject'}</p>
                    <div className="mt-2 max-h-44 overflow-auto">{renderCompactDiff(compareB.rendered_body || '', compareA.rendered_body || '')}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FileText size={16} /> Documents Vault</h3>
          </div>
          <input ref={documentFileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg" className="hidden" onChange={handleDocumentUpload} />
          {documents.length === 0 ? (
            <div onClick={() => documentFileRef.current?.click()} className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center hover:bg-slate-100">
              {isUploading ? (
                <p className="text-sm text-indigo-600">Uploading...</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-slate-500">No documents uploaded</p>
                  <button className="mx-auto inline-flex items-center gap-2 text-sm font-medium text-indigo-600"><Upload size={14} /> Upload Document</button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <button onClick={() => viewDocument(doc)} className="flex min-w-0 flex-1 items-center gap-3 truncate text-left text-slate-700 hover:text-indigo-600">
                    <FileText size={16} className="text-slate-400" />
                    <span className="truncate text-sm">{doc.file_name}</span>
                  </button>
                  <button onClick={() => deleteDocument(doc.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => documentFileRef.current?.click()} disabled={isUploading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload Another'}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {letterPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0e12]">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div>
                <p className="text-sm font-semibold text-white/90">Letter PDF Preview</p>
                <p className="text-xs text-white/50 truncate max-w-[50vw]">{letterPreviewTitle}</p>
              </div>
              <button
                onClick={() => {
                  if (letterPreviewUrl) window.URL.revokeObjectURL(letterPreviewUrl);
                  setLetterPreviewUrl(null);
                  setLetterPreviewTitle('');
                }}
                className="text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <iframe title="Generated Letter Preview" src={letterPreviewUrl} className="h-full w-full bg-white" />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e12] p-6">
            <EditEmployeeForm
              mapped={parsedMapped}
              employee={employee}
              options={{ entities, departments, designations, managers }}
              onClose={() => { setEditing(false); fetchEmployee(); }}
            />
          </div>
        </div>
      )}

      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white font-serif text-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0e12] p-4 font-sans text-white">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText size={16} className="text-violet-400" />
                Employment_Agreement_{`${employee.first_name || ''}_${employee.last_name || ''}`.replace(/\s+/g, '_')}.pdf
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f4f4f5] p-12">
              <div className="mx-auto max-w-xl border border-gray-200 bg-white p-10 shadow-sm">
                <h1 className="mb-8 text-center text-2xl font-bold uppercase tracking-widest">Employment Agreement</h1>
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  This Employment Agreement is made effective as of <strong>{new Date().toLocaleDateString()}</strong>, by and between <strong>LeadFlow AI</strong> and <strong>{`${employee.first_name || ''} ${employee.last_name || ''}`.trim()}</strong>.
                </p>
                <h3 className="mb-2 mt-6 text-sm font-bold uppercase">1. Position and Duties</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  The Company agrees to employ the Employee in the role of <strong>{getDesignationName(employee.designation_id)}</strong>, operating within the <strong>{getDepartmentName(employee.department_id)}</strong> department. The designated start date is <strong>{(employee.joining_date || employee.date_of_joining) ? new Date(employee.joining_date || employee.date_of_joining).toLocaleDateString() : 'TBD'}</strong>.
                </p>
                <h3 className="mb-2 mt-6 text-sm font-bold uppercase">2. Compensation</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  As compensation for the services provided, the Company shall pay the Employee an annual base salary of <strong>₹{employee.salary ? employee.salary.toLocaleString() : '0'}</strong>, subject to applicable taxes and the Company's standard payroll schedule.
                </p>
                <h3 className="mb-2 mt-6 text-sm font-bold uppercase">3. At-Will Employment</h3>
                <p className="mb-10 text-sm leading-relaxed text-gray-800">
                  Employment with the Company is at-will. Either the Employee or the Company may terminate the employment relationship at any time, with or without cause, and with or without notice.
                </p>
                <div className="mt-12 flex items-end justify-between border-t border-gray-200 pt-8">
                  <div>
                    <div className="mb-2 w-48 border-b border-gray-400"></div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Company Representative</p>
                  </div>
                  <div>
                    <div className="mb-2 w-48 border-b border-gray-400"></div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">Employee Signature</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 bg-[#0d0e12] p-4 font-sans">
              <button onClick={() => setIsPreviewModalOpen(false)} className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white">Cancel</button>
              <button onClick={() => { setIsPreviewModalOpen(false); handleSendContract('contract'); }} className="flex items-center gap-2 rounded-lg bg-violet-500 px-6 py-2 text-sm font-bold text-white hover:bg-violet-600">
                <Send size={14} /> Send for Signature
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
