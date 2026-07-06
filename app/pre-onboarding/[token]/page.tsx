"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type DocumentMeta = {
  id: string;
  file_name: string;
  uploaded_at: string;
  document_type?: string;
};

type PreOnboardingPayload = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  current_address: string;
  permanent_address: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  pan: string;
  aadhaar: string;
  date_of_birth: string;
  marital_status: string;
  education: string;
  prior_employer: string;
  current_city: string;
  work_location: string;
  tshirt_size: string;
  laptop_preference: string;
  dietary_preferences: string;
  preferred_joining_date: string;
  notes: string;
  documents: DocumentMeta[];
};

function pretty(value?: string) {
  return String(value || '').replace(/_/g, ' ').trim() || '-';
}

export default function PublicPreOnboardingPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState('id_proof');
  const [employeeName, setEmployeeName] = useState('');
  const [status, setStatus] = useState<string>('');

  const [form, setForm] = useState<PreOnboardingPayload>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    current_address: '',
    permanent_address: '',
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    pan: '',
    aadhaar: '',
    date_of_birth: '',
    marital_status: '',
    education: '',
    prior_employer: '',
    current_city: '',
    work_location: '',
    tshirt_size: '',
    laptop_preference: '',
    dietary_preferences: '',
    preferred_joining_date: '',
    notes: '',
    documents: [],
  });

  const isReadOnly = useMemo(() => status === 'submitted' || status === 'reviewed', [status]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hrms/v2/pre-onboarding/public/${encodeURIComponent(token)}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load pre-onboarding form');

        if (!active) return;

        const employee = body?.data?.employee || {};
        const pre = body?.data?.pre_onboarding || {};
        const preForm = pre?.form || {};

        setEmployeeName(`${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee');
        setStatus(String(pre?.status || 'draft'));
        setForm((prev) => ({
          ...prev,
          emergency_contact_name: preForm.emergency_contact_name || '',
          emergency_contact_phone: preForm.emergency_contact_phone || '',
          current_address: preForm.current_address || '',
          permanent_address: preForm.permanent_address || '',
          bank_name: preForm.bank_name || '',
          bank_account_number: preForm.bank_account_number || '',
          ifsc_code: preForm.ifsc_code || '',
          pan: preForm.pan || '',
          aadhaar: preForm.aadhaar || '',
          date_of_birth: preForm.date_of_birth || '',
          marital_status: preForm.marital_status || '',
          education: preForm.education || '',
          prior_employer: preForm.prior_employer || '',
          current_city: preForm.current_city || '',
          work_location: preForm.work_location || '',
          tshirt_size: preForm.tshirt_size || '',
          laptop_preference: preForm.laptop_preference || '',
          dietary_preferences: preForm.dietary_preferences || '',
          preferred_joining_date: preForm.preferred_joining_date || '',
          notes: preForm.notes || '',
          documents: Array.isArray(preForm.documents) ? preForm.documents : [],
        }));
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to load form');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  async function uploadDocument(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('document_type', docType);

      const res = await fetch(`/api/hrms/v2/pre-onboarding/public/${encodeURIComponent(token)}/documents`, {
        method: 'POST',
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to upload document');

      const uploaded = body.data as DocumentMeta;
      setForm((prev) => ({ ...prev, documents: [...prev.documents, uploaded] }));
      setMessage('Document uploaded.');
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function submitForm() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/hrms/v2/pre-onboarding/public/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to submit form');
      setStatus('submitted');
      setMessage('Pre-onboarding submitted successfully. HR has been notified.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit pre-onboarding');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6 text-sm text-slate-600">Loading pre-onboarding form...</main>;
  }

  if (error && !employeeName) {
    return <main className="min-h-screen bg-slate-50 p-6 text-sm text-rose-600">{error}</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Pre-Onboarding Form</h1>
        <p className="mt-1 text-sm text-slate-600">Please complete your details and upload required documents.</p>
        <p className="mt-1 text-sm text-slate-600">Employee: <span className="font-semibold text-slate-900">{employeeName}</span></p>

        {status === 'submitted' && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Form already submitted and pending HR review.
          </div>
        )}

        {status === 'reviewed' && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Form reviewed by HR.
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            ['Emergency contact name', 'emergency_contact_name'],
            ['Emergency contact phone', 'emergency_contact_phone'],
            ['Bank name', 'bank_name'],
            ['Bank account number', 'bank_account_number'],
            ['IFSC code', 'ifsc_code'],
            ['PAN', 'pan'],
            ['Aadhaar', 'aadhaar'],
            ['Marital status', 'marital_status'],
            ['Highest education', 'education'],
            ['Prior employer', 'prior_employer'],
            ['Current city', 'current_city'],
            ['Preferred work location', 'work_location'],
            ['T-shirt size', 'tshirt_size'],
            ['Laptop preference', 'laptop_preference'],
            ['Dietary preferences', 'dietary_preferences'],
          ].map(([label, key]) => (
            <label key={key} className="text-sm text-slate-700">
              {label}
              <input
                value={(form as any)[key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                disabled={isReadOnly}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ))}

          <label className="text-sm text-slate-700">
            Date of birth
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
              disabled={isReadOnly}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Preferred joining date
            <input
              type="date"
              value={form.preferred_joining_date}
              onChange={(e) => setForm((prev) => ({ ...prev, preferred_joining_date: e.target.value }))}
              disabled={isReadOnly}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Current address
            <textarea
              rows={2}
              value={form.current_address}
              onChange={(e) => setForm((prev) => ({ ...prev, current_address: e.target.value }))}
              disabled={isReadOnly}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Permanent address
            <textarea
              rows={2}
              value={form.permanent_address}
              onChange={(e) => setForm((prev) => ({ ...prev, permanent_address: e.target.value }))}
              disabled={isReadOnly}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={isReadOnly}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document Uploads</p>
          {!isReadOnly && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="id_proof">ID Proof</option>
                <option value="address_proof">Address Proof</option>
                <option value="bank_proof">Bank Proof</option>
                <option value="education_proof">Education</option>
                <option value="other">Other</option>
              </select>
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                {uploading ? 'Uploading...' : 'Upload document'}
                <input
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDocument(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}

          {(form.documents || []).length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {form.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="min-w-0">
                    <p className="truncate">{doc.file_name}</p>
                    <p className="text-slate-500">{pretty(doc.document_type)}</p>
                  </div>
                  <span className="shrink-0 text-slate-500">{new Date(doc.uploaded_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No documents uploaded yet.</p>
          )}
        </div>

        <div className="mt-5">
          {!isReadOnly ? (
            <button
              onClick={submitForm}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit Pre-Onboarding'}
            </button>
          ) : (
            <p className="text-xs text-slate-500">This form is locked after submission.</p>
          )}
        </div>
      </section>
    </main>
  );
}
