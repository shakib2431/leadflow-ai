

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useLocation } from "wouter";
import { supabase } from '@/lib/supabase';
import { type HolidayRow } from '@/lib/hrms/companyHolidays';

type SelfServicePayload = {
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    employee_code?: string;
    designation?: string;
    current_title?: string;
    status?: string;
    work_location?: string;
    date_of_joining?: string;
    avatar_url?: string | null;
  } | null;
  todayAttendance?: { date: string; status: string } | null;
  todayPunch?: {
    date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    source?: 'db' | 'fallback';
  } | null;
  attendanceLast30Days?: Array<{ date: string; status: string }>;
  leaveHistory?: Array<{
    id: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    days_count?: number;
    status?: string;
    created_at?: string;
  }>;
  upcomingApprovedLeave?: Array<{
    id: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    days_count?: number;
    status?: string;
  }>;
  payroll?: {
    enabled?: boolean;
    message?: string;
    latest_payslip?: {
      id: string;
      period_month: number;
      period_year: number;
      gross_earnings: number;
      net_pay: number | null;
      tds: number;
      run_status: string;
    } | null;
  };
  workMode?: { value?: string };
  calendar?: { holidays?: HolidayRow[] };
};

type PayslipRow = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  run_status: string;
  gross_earnings: number;
  pf_employee: number;
  esi_employee: number;
  professional_tax: number;
  tds: number;
  net_pay: number;
  lop_days: number;
};

type TaxDeclaration = {
  employee_id: string;
  regime: 'OLD' | 'NEW';
  declared_80c: number;
  declared_80d: number;
  updated_at: string;
  simulation?: {
    monthly_gross: number;
    annual_taxable_income: number;
    annual_tax: number;
    estimated_monthly_tds: number;
  };
};

type LeaveBalancePayload = {
  balances: Array<{
    leave_type: string;
    accrued: number;
    used: number;
    pending: number;
    available: number | null;
    monthly_accrual: number;
    annual_cap: number | null;
  }>;
  accrual?: {
    year: number;
    start_date: string;
    elapsed_months: number;
  };
};

type AttendanceCorrectionRow = {
  id: string;
  employee_id: string;
  date: string;
  current_status: string | null;
  requested_status: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
};

type PreOnboardingSubmission = {
  status?: 'submitted' | 'reviewed';
  submitted_at?: string | null;
  hr_reviewed_at?: string | null;
  form?: {
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    current_address?: string;
    permanent_address?: string;
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;
    pan?: string;
    aadhaar?: string;
    date_of_birth?: string;
    marital_status?: string;
    education?: string;
    prior_employer?: string;
    current_city?: string;
    work_location?: string;
    tshirt_size?: string;
    laptop_preference?: string;
    dietary_preferences?: string;
    preferred_joining_date?: string;
    notes?: string;
    documents?: Array<{
      id: string;
      file_name: string;
      uploaded_at: string;
      document_type?: string;
    }>;
  };
};

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', href: '/hrms/v2/self-service' },
  { key: 'pre-onboarding', label: 'Pre-Onboarding', href: '/hrms/v2/self-service/pre-onboarding' },
  { key: 'profile', label: 'My Profile', href: '/hrms/v2/self-service/profile' },
  { key: 'attendance', label: 'My Attendance', href: '/hrms/v2/self-service/attendance' },
  { key: 'leave', label: 'My Leave', href: '/hrms/v2/self-service/leave' },
  { key: 'calendar', label: 'My Calendar', href: '/hrms/v2/self-service/calendar' },
  { key: 'payroll', label: 'My Payroll', href: '/hrms/v2/self-service/payroll' },
  { key: 'work-mode', label: 'Work Mode', href: '/hrms/v2/self-service/work-mode' },
] as const;

const TAB_BASE_CLASS = 'rounded-lg border px-3 py-2 text-sm font-medium transition-colors';
const TAB_ACTIVE_CLASS = 'border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm';
const TAB_INACTIVE_CLASS = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';
const PANEL_CLASS = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const CORE_CACHE_KEY = 'hrms.selfService.core.v1';
const CORRECTIONS_CACHE_KEY = 'hrms.selfService.corrections.v1';
const PREONBOARDING_CACHE_KEY = 'hrms.selfService.preOnboarding.v1';
const PAYSLIPS_CACHE_KEY = 'hrms.selfService.payslips.v1';
const TAX_DECLARATION_CACHE_KEY = 'hrms.selfService.taxDeclaration.v1';
const CORE_CACHE_TTL_MS = 120 * 1000;
const TAB_CACHE_TTL_MS = 15 * 60 * 1000;

type TimedCache<T> = { ts: number; value: T };

function readTimedCacheEnvelope<T>(key: string): TimedCache<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimedCache<T>;
    if (!parsed || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function readTimedCache<T>(key: string, ttlMs: number): T | null {
  const parsed = readTimedCacheEnvelope<T>(key);
  if (!parsed) return null;
  if (Date.now() - parsed.ts > ttlMs) return null;
  return parsed.value ?? null;
}

function writeTimedCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    const payload: TimedCache<T> = { ts: Date.now(), value };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function formatDate(input?: string) {
  if (!input) return '-';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString();
}

function pretty(value?: string) {
  return String(value || '').replace(/_/g, ' ').trim() || '-';
}

function formatINR(value?: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatTime(input?: string | null) {
  if (!input) return '-';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SelfServiceClient({ initialTab = 'overview' }: { initialTab?: string }) {
  const [pathname] = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [punching, setPunching] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveCancellingId, setLeaveCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<SelfServicePayload | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalancePayload | null>(null);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [downloadingPayslipId, setDownloadingPayslipId] = useState<string | null>(null);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [taxDeclaration, setTaxDeclaration] = useState<TaxDeclaration | null>(null);
  const [taxSaving, setTaxSaving] = useState(false);
  const [workMode, setWorkMode] = useState('office');
  const [profileSaving, setProfileSaving] = useState(false);
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [attendanceCorrectionDate, setAttendanceCorrectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRequestedStatus, setAttendanceRequestedStatus] = useState('present');
  const [attendanceCorrectionReason, setAttendanceCorrectionReason] = useState('');
  const [attendanceCorrectionSubmitting, setAttendanceCorrectionSubmitting] = useState(false);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrectionRow[]>([]);
  const [attendanceCorrectionError, setAttendanceCorrectionError] = useState<string | null>(null);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [preOnboardingLoading, setPreOnboardingLoading] = useState(false);
  const [preOnboardingSaving, setPreOnboardingSaving] = useState(false);
  const [preOnboardingDocUploading, setPreOnboardingDocUploading] = useState(false);
  const [preOnboardingDocumentType, setPreOnboardingDocumentType] = useState('id_proof');
  const [preOnboarding, setPreOnboarding] = useState<PreOnboardingSubmission | null>(null);
  const [preOnboardingForm, setPreOnboardingForm] = useState({
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
    documents: [] as Array<{
      id: string;
      file_name: string;
      uploaded_at: string;
      document_type?: string;
    }>,
  });

  async function authHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      if (token) {
        return {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      }

      const roleOverride = String(window.localStorage.getItem('hrms-dev-role') || '').trim();
      const devEmail = String(data.session?.user?.email || '').trim().toLowerCase();
      return {
        'x-dev-mode': 'true',
        ...(roleOverride === 'HR Admin' || roleOverride === 'HR Executive' || roleOverride === 'Employee'
          ? { 'x-dev-role': roleOverride }
          : { 'x-dev-role': 'HR Admin' }),
        ...(devEmail ? { 'x-dev-email': devEmail } : {}),
        'Content-Type': 'application/json',
      };
    }

    if (!token) {
      const refreshResult = await supabase.auth.refreshSession();
      token = refreshResult.data.session?.access_token;
    }

    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }

    throw new Error('No active session');
  }

  async function loadData(options?: { force?: boolean; background?: boolean }) {
    const force = options?.force === true;
    let background = options?.background === true;

    if (!force) {
      const staleCore = readTimedCacheEnvelope<{ data: SelfServicePayload | null; leaveBalance: LeaveBalancePayload | null; workMode: string }>(CORE_CACHE_KEY);
      const staleCorrections = readTimedCacheEnvelope<AttendanceCorrectionRow[]>(CORRECTIONS_CACHE_KEY);

      if (staleCore?.value) {
        setData(staleCore.value.data);
        setLeaveBalance(staleCore.value.leaveBalance);
        setWorkMode(staleCore.value.workMode || 'office');
        if (staleCorrections?.value) setAttendanceCorrections(staleCorrections.value);
        setLoading(false);

        const isFresh = Date.now() - staleCore.ts <= CORE_CACHE_TTL_MS;
        if (isFresh) {
          return;
        }

        // Revalidate stale data in background without blanking the page.
        background = true;
      }
    }

    if (!force) {
      const cachedCore = readTimedCache<{ data: SelfServicePayload | null; leaveBalance: LeaveBalancePayload | null; workMode: string }>(CORE_CACHE_KEY, CORE_CACHE_TTL_MS);
      const cachedCorrections = readTimedCache<AttendanceCorrectionRow[]>(CORRECTIONS_CACHE_KEY, CORE_CACHE_TTL_MS);

      if (cachedCore) {
        setData(cachedCore.data);
        setLeaveBalance(cachedCore.leaveBalance);
        setWorkMode(cachedCore.workMode || 'office');
        if (cachedCorrections) setAttendanceCorrections(cachedCorrections);
        setLoading(false);
        return;
      }
    }

    if (!background) setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const [meRes, balanceRes] = await Promise.all([
        fetch('/api/hrms/v2/me', { headers }),
        fetch('/api/hrms/v2/leave/balance', { headers }),
      ]);

      const meBody = await meRes.json();
      if (!meRes.ok) throw new Error(meBody.error || 'Failed to load self-service data');

      const balanceBody = await balanceRes.json();
      if (balanceRes.ok) {
        setLeaveBalance(balanceBody.data || null);
      } else {
        setLeaveBalance(null);
      }

      setData(meBody.data || null);
      const resolvedMode = String(meBody?.data?.workMode?.value || meBody?.data?.employee?.work_location || 'office').toLowerCase();
      setWorkMode(['office', 'remote', 'hybrid'].includes(resolvedMode) ? resolvedMode : 'office');
      writeTimedCache(CORE_CACHE_KEY, {
        data: meBody.data || null,
        leaveBalance: balanceRes.ok ? (balanceBody.data || null) : null,
        workMode: ['office', 'remote', 'hybrid'].includes(resolvedMode) ? resolvedMode : 'office',
      });

      // Secondary data should not block first paint of self-service dashboard.
      setLoading(false);
      void (async () => {
        try {
          const [pendingCorrectionsRes, approvedCorrectionsRes, rejectedCorrectionsRes] = await Promise.all([
            fetch('/api/hrms/v2/attendance/corrections?status=pending&pageSize=20', { headers }),
            fetch('/api/hrms/v2/attendance/corrections?status=approved&pageSize=20', { headers }),
            fetch('/api/hrms/v2/attendance/corrections?status=rejected&pageSize=20', { headers }),
          ]);

          const correctionRows: AttendanceCorrectionRow[] = [];
          for (const res of [pendingCorrectionsRes, approvedCorrectionsRes, rejectedCorrectionsRes]) {
            if (!res.ok) continue;
            const body = await res.json();
            correctionRows.push(...((body?.data || []) as AttendanceCorrectionRow[]));
          }

          correctionRows.sort((a, b) => {
            const aTime = new Date(String(a.created_at || a.reviewed_at || a.date || 0)).getTime();
            const bTime = new Date(String(b.created_at || b.reviewed_at || b.date || 0)).getTime();
            return bTime - aTime;
          });

          const latestCorrections = correctionRows.slice(0, 8);
          setAttendanceCorrections(latestCorrections);
          writeTimedCache(CORRECTIONS_CACHE_KEY, latestCorrections);
        } catch {
          // Non-blocking background fetch.
        }
      })();
    } catch (err: any) {
      setError(err.message || 'Failed to load self-service data');
      setData(null);
      setLeaveBalance(null);
    } finally {
      if (!background) setLoading(false);
    }
  }

  const [avatarUploading, setAvatarUploading] = useState(false);

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setError(null);
    try {
      const headers = await authHeader();
      // authHeader returns JSON content-type — drop it for multipart
      const { 'Content-Type': _ct, ...baseHeaders } = headers;
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/hrms/v2/me/avatar', { method: 'POST', headers: baseHeaders, body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      await loadData({ force: true });
      setSuccess('Profile photo updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function removeAvatar() {
    setAvatarUploading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me/avatar', { method: 'DELETE', headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Remove failed');
      await loadData({ force: true });
      setSuccess('Profile photo removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to remove avatar');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveWorkMode() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ work_mode: workMode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to update work mode');
      setSuccess('Work mode updated.');
      await loadData({ force: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update work mode');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ work_mode: workMode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save profile');
      await loadData({ force: true });
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitPunch(action: 'check_in' | 'check_out') {
    setPunching(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me/attendance/punch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to update attendance punch');
      setSuccess(action === 'check_in' ? 'Checked in successfully.' : 'Checked out successfully.');

      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      setData((prev) => {
        if (!prev) return prev;
        const nextPunch = {
          date: today,
          check_in_at: action === 'check_in' ? nowIso : (prev.todayPunch?.check_in_at || nowIso),
          check_out_at: action === 'check_out' ? nowIso : (prev.todayPunch?.check_out_at || null),
          source: 'fallback' as const,
        };

        return {
          ...prev,
          todayAttendance: { date: today, status: 'present' },
          todayPunch: nextPunch,
          attendanceLast30Days: (() => {
            const rows = prev.attendanceLast30Days || [];
            const rest = rows.filter((row) => row.date !== today);
            return [{ date: today, status: 'present' }, ...rest].slice(0, 30);
          })(),
        };
      });

      void loadData({ force: true, background: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance punch');
    } finally {
      setPunching(false);
    }
  }

  async function submitAttendanceCorrection() {
    const employeeId = String(data?.employee?.id || '').trim();
    if (!employeeId) {
      setAttendanceCorrectionError('Employee profile is missing. Please re-login and try again.');
      return;
    }

    if (!attendanceCorrectionDate) {
      setAttendanceCorrectionError('Please select a correction date.');
      return;
    }

    if (attendanceCorrectionReason.trim().length < 5) {
      setAttendanceCorrectionError('Please add a note of at least 5 characters for HR review.');
      return;
    }

    setAttendanceCorrectionSubmitting(true);
    setAttendanceCorrectionError(null);
    setSuccess(null);

    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/attendance/corrections', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee_id: employeeId,
          date: attendanceCorrectionDate,
          requested_status: attendanceRequestedStatus,
          reason: attendanceCorrectionReason.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to submit correction request');

      setSuccess('Correction request sent to HR. It now appears in Admin corrections queue.');
      setAttendanceCorrectionError(null);
      setAttendanceCorrectionReason('');
      await loadData();
    } catch (err: any) {
      setAttendanceCorrectionError(err.message || 'Failed to submit correction request');
    } finally {
      setAttendanceCorrectionSubmitting(false);
    }
  }

  async function loadPreOnboarding(options?: { force?: boolean }) {
    const force = options?.force === true;
    if (!force) {
      const cached = readTimedCache<{ preOnboarding: PreOnboardingSubmission | null; form: typeof preOnboardingForm }>(PREONBOARDING_CACHE_KEY, TAB_CACHE_TTL_MS);
      if (cached) {
        setPreOnboarding(cached.preOnboarding);
        setPreOnboardingForm(cached.form);
        setPreOnboardingLoading(false);
        return;
      }
    }

    setPreOnboardingLoading(true);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me/pre-onboarding', { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load pre-onboarding submission');

      const payload = (body.data || null) as PreOnboardingSubmission | null;
      setPreOnboarding(payload);
      if (payload?.form) {
        const nextForm = {
          emergency_contact_name: payload.form.emergency_contact_name || '',
          emergency_contact_phone: payload.form.emergency_contact_phone || '',
          current_address: payload.form.current_address || '',
          permanent_address: payload.form.permanent_address || '',
          bank_name: payload.form.bank_name || '',
          bank_account_number: payload.form.bank_account_number || '',
          ifsc_code: payload.form.ifsc_code || '',
          pan: payload.form.pan || '',
          aadhaar: payload.form.aadhaar || '',
          date_of_birth: payload.form.date_of_birth || '',
          marital_status: payload.form.marital_status || '',
          education: payload.form.education || '',
          prior_employer: payload.form.prior_employer || '',
          current_city: payload.form.current_city || '',
          work_location: payload.form.work_location || '',
          tshirt_size: payload.form.tshirt_size || '',
          laptop_preference: payload.form.laptop_preference || '',
          dietary_preferences: payload.form.dietary_preferences || '',
          preferred_joining_date: payload.form.preferred_joining_date || '',
          notes: payload.form.notes || '',
          documents: payload.form.documents || [],
        };
        setPreOnboardingForm(nextForm);
        writeTimedCache(PREONBOARDING_CACHE_KEY, { preOnboarding: payload, form: nextForm });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pre-onboarding submission');
    } finally {
      setPreOnboardingLoading(false);
    }
  }

  async function submitPreOnboarding() {
    setPreOnboardingSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/me/pre-onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify(preOnboardingForm),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to submit pre-onboarding form');

      setPreOnboarding((body.data || null) as PreOnboardingSubmission);
      setSuccess('Pre-onboarding form submitted. HR has been notified for review.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit pre-onboarding form');
    } finally {
      setPreOnboardingSaving(false);
    }
  }

  async function uploadPreOnboardingDocument(file: File) {
    setPreOnboardingDocUploading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const { 'Content-Type': _ct, ...baseHeaders } = headers;
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', preOnboardingDocumentType);

      const res = await fetch('/api/hrms/v2/me/pre-onboarding/documents', {
        method: 'POST',
        headers: baseHeaders,
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to upload pre-onboarding document');

      const uploaded = body.data;
      setPreOnboardingForm((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), uploaded],
      }));
      setSuccess('Document uploaded.');
    } catch (err: any) {
      setError(err.message || 'Failed to upload pre-onboarding document');
    } finally {
      setPreOnboardingDocUploading(false);
    }
  }

  async function loadPayslips(options?: { force?: boolean }) {
    const force = options?.force === true;
    if (!force) {
      const cached = readTimedCache<PayslipRow[]>(PAYSLIPS_CACHE_KEY, TAB_CACHE_TTL_MS);
      if (cached) {
        setPayslips(cached);
        setPayslipLoading(false);
        return;
      }
    }

    setPayslipLoading(true);
    setPayrollError(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/payroll/payslips?page=1&pageSize=24', { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load payslips');
      setPayslips(body.data || []);
      writeTimedCache(PAYSLIPS_CACHE_KEY, body.data || []);
    } catch (err: any) {
      setPayslips([]);
      setPayrollError(err.message || 'Failed to load payslips');
    } finally {
      setPayslipLoading(false);
    }
  }

  async function loadTaxDeclaration(options?: { force?: boolean }) {
    const force = options?.force === true;
    if (!force) {
      const cached = readTimedCache<TaxDeclaration | null>(TAX_DECLARATION_CACHE_KEY, TAB_CACHE_TTL_MS);
      if (cached) {
        setTaxDeclaration(cached);
        return;
      }
    }

    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/payroll/tax-declaration', { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load tax declaration');
      setTaxDeclaration(body.data || null);
      writeTimedCache(TAX_DECLARATION_CACHE_KEY, body.data || null);
    } catch {
      setTaxDeclaration(null);
    }
  }

  async function saveTaxDeclaration() {
    if (!taxDeclaration) return;

    setTaxSaving(true);
    setPayrollError(null);

    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/payroll/tax-declaration', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          regime: taxDeclaration.regime,
          declared_80c: taxDeclaration.declared_80c,
          declared_80d: taxDeclaration.declared_80d,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save tax declaration');

      await loadTaxDeclaration({ force: true });
      setSuccess('Tax declaration updated. New TDS automation will apply in payroll runs.');
    } catch (err: any) {
      setPayrollError(err.message || 'Failed to save tax declaration');
    } finally {
      setTaxSaving(false);
    }
  }

  async function downloadPayslip(payslipId: string) {
    setDownloadingPayslipId(payslipId);
    setPayrollError(null);

    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/payroll/payslips/${payslipId}/download`, { headers });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to download payslip');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fallbackName = `payslip-${payslipId}.txt`;
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
      link.href = url;
      link.download = match?.[1] || fallbackName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setPayrollError(err.message || 'Failed to download payslip');
    } finally {
      setDownloadingPayslipId(null);
    }
  }

  async function submitLeaveRequest() {
    if (!leaveStartDate || !leaveEndDate) {
      setError('Please choose both start and end date for leave request.');
      return;
    }

    setLeaveSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/leave/requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: leaveStartDate,
          end_date: leaveEndDate,
          reason: leaveReason.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to submit leave request');

      setSuccess('Leave request submitted.');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      await loadData({ force: true });
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function cancelLeaveRequest(id: string) {
    setLeaveCancellingId(id);
    setError(null);
    setSuccess(null);

    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/leave/requests/${id}`, {
        method: 'DELETE',
        headers,
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to withdraw leave request');

      setSuccess('Leave request withdrawn.');
      await loadData({ force: true });
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw leave request');
    } finally {
      setLeaveCancellingId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeTab = useMemo(() => {
    if (pathname.includes('/self-service/pre-onboarding')) return 'pre-onboarding';
    if (pathname.includes('/self-service/profile')) return 'profile';
    if (pathname.includes('/self-service/attendance')) return 'attendance';
    if (pathname.includes('/self-service/leave')) return 'leave';
    if (pathname.includes('/self-service/calendar')) return 'calendar';
    if (pathname.includes('/self-service/payroll')) return 'payroll';
    if (pathname.includes('/self-service/work-mode')) return 'work-mode';
    return initialTab;
  }, [pathname, initialTab]);

  const isOnboarded = data?.employee?.status === 'active';
  const preOnboardingLocked = preOnboarding?.status === 'submitted' || preOnboarding?.status === 'reviewed';

  useEffect(() => {
    if (activeTab === 'payroll' || activeTab === 'overview') {
      loadPayslips();
      loadTaxDeclaration();
    }

    if (!isOnboarded && (activeTab === 'pre-onboarding' || activeTab === 'overview')) {
      loadPreOnboarding();
    }
  }, [activeTab, isOnboarded]);

  const attendanceSummary = useMemo(() => {
    const rows = data?.attendanceLast30Days || [];
    return {
      present: rows.filter((r) => r.status === 'present').length,
      absent: rows.filter((r) => r.status === 'absent').length,
      halfDay: rows.filter((r) => r.status === 'half_day').length,
    };
  }, [data]);
  const selectedDateCurrentStatus =
    (data?.attendanceLast30Days || []).find((row) => row.date === attendanceCorrectionDate)?.status ||
    (attendanceCorrectionDate === new Date().toISOString().slice(0, 10) ? data?.todayAttendance?.status : 'not_marked');
  const correctionMatchesCurrent = String(selectedDateCurrentStatus || '').trim().toLowerCase() === attendanceRequestedStatus;

  const pendingLeaveRequests = (data?.leaveHistory || []).filter((row) => row.status === 'pending').length;
  const upcomingHolidayCount = (data?.calendar?.holidays || []).length;
  const upcomingApprovedLeaveCount = (data?.upcomingApprovedLeave || []).length;
  const hasCheckedInToday = Boolean(data?.todayPunch?.check_in_at);
  const hasCheckedOutToday = Boolean(data?.todayPunch?.check_out_at);
  const availableLeaveTotal = leaveBalance?.balances?.length
    ? leaveBalance.balances.reduce((sum, row) => sum + (row.available ?? 0), 0)
    : 0;
  const workspaceLabelMap: Record<string, string> = {
    overview: 'Overview',
    'pre-onboarding': 'Pre-Onboarding',
    profile: 'My Profile',
    attendance: 'My Attendance',
    leave: 'My Leave',
    calendar: 'My Calendar',
    payroll: 'My Payroll',
    'work-mode': 'Work Mode',
  };
  const firstName = data?.employee?.first_name || '';
  const lastName = data?.employee?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??';
  const fullName = `${firstName} ${lastName}`.trim() || '-';
  const statusColors: Record<string, { badge: string; dot: string }> = {
    active: { badge: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    onboarding: { badge: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  };
  const employeeStatusStyle = statusColors[data?.employee?.status ?? ''] ?? {
    badge: 'border-slate-300 bg-slate-50 text-slate-600',
    dot: 'bg-slate-400',
  };
  const designationLabel = String(data?.employee?.designation || data?.employee?.current_title || '').trim();
  const recentPayslips = payslips.slice(0, 3);
  const pendingTaskItems = [
    !hasCheckedInToday ? {
      title: 'Attendance not marked',
      note: 'Please check in to start your workday.',
      time: '-',
    } : null,
    hasCheckedInToday && !hasCheckedOutToday ? {
      title: 'Check-out pending for today',
      note: 'Please check-out to complete your attendance.',
      time: formatTime(data?.todayPunch?.check_in_at),
    } : null,
    pendingLeaveRequests > 0 ? {
      title: 'Leave request needs approval',
      note: `You have ${pendingLeaveRequests} request(s) awaiting approval.`,
      time: formatDate((data?.leaveHistory || []).find((row) => row.status === 'pending')?.created_at),
    } : null,
  ].filter(Boolean) as Array<{ title: string; note: string; time: string }>;
  const upcomingItems = [
    ...(data?.calendar?.holidays || []).slice(0, 2).map((h) => ({
      id: `holiday-${h.id}`,
      title: h.name,
      date: formatDate(h.date),
      tag: 'Holiday',
    })),
    ...(data?.upcomingApprovedLeave || []).slice(0, 1).map((l) => ({
      id: `leave-${l.id}`,
      title: pretty(l.leave_type),
      date: `${formatDate(l.start_date)} - ${formatDate(l.end_date)}`,
      tag: 'Leave',
    })),
  ].slice(0, 3);
  const upcomingHolidayItemsCount = (data?.calendar?.holidays || []).slice(0, 2).length;
  const upcomingApprovedLeaveItemsCount = (data?.upcomingApprovedLeave || []).slice(0, 1).length;
  const todayActivity = [
    hasCheckedInToday ? { id: 'check-in', label: 'Checked in', meta: formatTime(data?.todayPunch?.check_in_at) } : null,
    pendingLeaveRequests > 0 ? { id: 'leave-pending', label: 'Leave request submitted', meta: `${pendingLeaveRequests} pending` } : null,
    recentPayslips[0] ? {
      id: 'payslip',
      label: 'Payslip generated',
      meta: `${String(recentPayslips[0].period_month).padStart(2, '0')}/${recentPayslips[0].period_year}`,
    } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; meta: string }>;

  if (loading) {
    return <div className="hrms-enterprise p-6 text-sm text-slate-600">Loading self-service...</div>;
  }

  return (
    <div className="hrms-enterprise space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50/50 p-2">
        {NAV_ITEMS.filter((item) => !(item.key === 'pre-onboarding' && isOnboarded)).map((item) => {
          const active = activeTab === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              className={`${TAB_BASE_CLASS} ${
                active ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900">Good Morning, {data?.employee?.first_name || 'Team'}!</h2>
                  <p className="mt-1 text-sm text-slate-600">Here is what is happening with your day.</p>
                </div>
                <div className="group relative hidden md:block">
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-100 shadow-sm">
                    {data?.employee?.avatar_url ? (
                      <img src={data.employee.avatar_url} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-indigo-700">{initials}</span>
                    )}
                    <label className={`absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 ${avatarUploading ? 'pointer-events-none' : ''}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }}
                        disabled={avatarUploading}
                      />
                      {avatarUploading ? '...' : 'Upload'}
                    </label>
                  </div>
                  {data?.employee?.avatar_url && !avatarUploading && (
                    <button
                      onClick={removeAvatar}
                      title="Remove photo"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Employee ID: {data?.employee?.employee_code || '-'}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Designation: {designationLabel || '-'}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Location: {pretty(data?.employee?.work_location)}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Status: {pretty(data?.employee?.status)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link prefetch={false} href="/hrms/v2/self-service/leave" className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700">Request Leave</Link>
                <Link prefetch={false} href="/hrms/v2/self-service/attendance" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700">Mark Attendance</Link>
                <Link prefetch={false} href="/hrms/v2/self-service/payroll" className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700">Download Payslip</Link>
                <Link prefetch={false} href="/hrms/v2/self-service/profile" className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700">Update Profile</Link>
                <Link prefetch={false} href="/hrms/v2/self-service/work-mode" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">More</Link>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Today's Activity</h3>
                <Link prefetch={false} href="/hrms/v2/self-service/attendance" className="text-xs font-semibold text-indigo-600">View All</Link>
              </div>
              <div className="space-y-3">
                {todayActivity.length > 0 ? todayActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.meta}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No activity updates yet.</p>
                )}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <article className="rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Attendance (MTD)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{attendanceSummary.present}</p>
              <p className="text-xs text-slate-500">Present days</p>
            </article>
            <article className="rounded-xl border border-cyan-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Leave Balance</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{availableLeaveTotal}</p>
              <p className="text-xs text-slate-500">Days available</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending Requests</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingLeaveRequests}</p>
              <p className="text-xs text-slate-500">Needs approval</p>
            </article>
            <article className="rounded-xl border border-indigo-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Upcoming Payroll</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{upcomingApprovedLeaveCount + 7}</p>
              <p className="text-xs text-slate-500">Days to go</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Latest Net Pay</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {data?.payroll?.latest_payslip
                  ? data.payroll.latest_payslip.net_pay == null
                    ? 'Pending'
                    : formatINR(data.payroll.latest_payslip.net_pay)
                  : '-'}
              </p>
              <p className="text-xs text-slate-500">
                {data?.payroll?.latest_payslip
                  ? data.payroll.latest_payslip.run_status?.toLowerCase() === 'draft'
                    ? 'Draft run: awaiting HR finalization'
                    : data.payroll.latest_payslip.net_pay == null
                    ? 'Latest run exists, net pay not finalized yet'
                    : `Period ${String(data.payroll.latest_payslip.period_month).padStart(2, '0')}/${data.payroll.latest_payslip.period_year}`
                  : 'Not available'}
              </p>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1.5fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Pending Tasks</h3>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{pendingTaskItems.length}</span>
              </div>
              <div className="space-y-2">
                {pendingTaskItems.length > 0 ? pendingTaskItems.map((task) => (
                  <div key={task.title} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      <span className="text-xs text-indigo-600">{task.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{task.note}</p>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500">No pending tasks.</div>
                )}
              </div>
              <Link prefetch={false} href="/hrms/v2/self-service/attendance" className="mt-3 inline-flex text-xs font-semibold text-indigo-600">View all tasks</Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Upcoming Events</h3>
                <Link prefetch={false} href="/hrms/v2/self-service/calendar" className="text-xs font-semibold text-indigo-600">View Calendar</Link>
              </div>
              <div className="space-y-2">
                {upcomingItems.length > 0 ? upcomingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{item.tag}</span>
                    </div>
                    <span className="text-xs text-slate-600">{item.date}</span>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500">No upcoming events.</div>
                )}
              </div>
              <Link prefetch={false} href="/hrms/v2/self-service/calendar" className="mt-3 inline-flex text-xs font-semibold text-indigo-600">View full calendar</Link>
            </article>

            <article className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link prefetch={false} href="/hrms/v2/self-service/attendance" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">My Attendance</Link>
                  <Link prefetch={false} href="/hrms/v2/self-service/leave" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">My Leave</Link>
                  <Link prefetch={false} href="/hrms/v2/self-service/payroll" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">My Payroll</Link>
                  <Link prefetch={false} href="/hrms/v2/self-service/profile" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">My Documents</Link>
                  <Link prefetch={false} href="/hrms/v2/self-service/work-mode" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">My Goals</Link>
                  <Link prefetch={false} href="/hrms/v2/settings" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700">Settings</Link>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">AI Assistant</h3>
                  <span className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Beta</span>
                </div>
                <p className="text-sm text-slate-700">Good morning {data?.employee?.first_name || 'there'}.</p>
                <p className="mt-1 text-xs text-slate-600">You have {pendingTaskItems.length} pending task(s) and {upcomingItems.length} upcoming event(s) today.</p>
                <button
                  type="button"
                  onClick={() => setShowAiSummary((prev) => !prev)}
                  className="mt-3 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-center text-xs font-semibold text-indigo-700"
                >
                  {showAiSummary ? 'Hide My Summary' : 'View My Summary'}
                </button>
                {showAiSummary && (
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-white/80 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Today at a glance</p>
                    <ul className="mt-2 space-y-1">
                      <li>Pending tasks: {pendingTaskItems.length}</li>
                      <li>Upcoming events: {upcomingItems.length} ({upcomingHolidayItemsCount} holidays, {upcomingApprovedLeaveItemsCount} approved leave)</li>
                      <li>Pending leave requests: {pendingLeaveRequests}</li>
                      <li>Work mode: {pretty(workMode)}</li>
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link prefetch={false} href="/hrms/v2/self-service/attendance" className="rounded-md border border-indigo-200 px-2 py-1 font-semibold text-indigo-700">Attendance</Link>
                      <Link prefetch={false} href="/hrms/v2/self-service/leave" className="rounded-md border border-indigo-200 px-2 py-1 font-semibold text-indigo-700">Leave</Link>
                      <Link prefetch={false} href="/hrms/v2/self-service/calendar" className="rounded-md border border-indigo-200 px-2 py-1 font-semibold text-indigo-700">Calendar</Link>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Recent Payslips</h3>
              <Link prefetch={false} href="/hrms/v2/self-service/payroll" className="text-xs font-semibold text-indigo-600">View All</Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Month</th>
                    <th className="px-3 py-2.5">Net Pay</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayslips.length > 0 ? recentPayslips.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2.5 text-slate-700">{String(row.period_month).padStart(2, '0')}/{row.period_year}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{formatINR(row.net_pay)}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Paid</span></td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => downloadPayslip(row.id)} className="text-xs font-semibold text-indigo-600">Download</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No payslips available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}


      {activeTab !== 'overview' && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</p>
            <p className="text-sm font-semibold text-slate-900">{workspaceLabelMap[activeTab] || 'Overview'}</p>
          </div>
        </section>
      )}
      {activeTab === 'profile' && (() => {
        const sc = employeeStatusStyle;
        return (
          <div className={PANEL_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${sc.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {pretty(data?.employee?.status)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  {data?.employee?.employee_code && <span className="font-mono text-xs text-slate-500">{data.employee.employee_code}</span>}
                  {designationLabel && <span>{designationLabel}</span>}
                  {data?.employee?.email && <span>{data.employee.email}</span>}
                </div>
              </div>

              <div className="group relative">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                  {data?.employee?.avatar_url ? (
                    <img src={data.employee.avatar_url} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-slate-700">{initials}</span>
                  )}
                  <label className={`absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 ${avatarUploading ? 'pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }}
                      disabled={avatarUploading}
                    />
                    {avatarUploading ? '...' : 'Upload'}
                  </label>
                </div>
                {data?.employee?.avatar_url && !avatarUploading && (
                  <button
                    onClick={removeAvatar}
                    title="Remove photo"
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Date of Joining', value: formatDate(data?.employee?.date_of_joining) },
                { label: 'Work Mode', value: pretty(data?.workMode?.value || data?.employee?.work_location) },
                { label: 'Present Days (Last 30 Days)', value: String(attendanceSummary.present) },
                {
                  label: 'Leave Available',
                  value: leaveBalance?.balances?.length
                    ? String(leaveBalance.balances.reduce((s, b) => s + (b.available ?? 0), 0))
                    : '-',
                },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Details</p>
                  <p className="text-sm text-slate-600">Designation is read-only; work location can be updated by the employee.</p>
                </div>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Designation
                  <input
                    value={designationLabel || ''}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Work Location
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="office">Office</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        );
      })()}

      {!isOnboarded && activeTab === 'pre-onboarding' && (
        <div className={PANEL_CLASS}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Pre-Onboarding Form</h2>
            {preOnboarding?.status === 'submitted' && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                Submitted on {formatDate(preOnboarding.submitted_at || undefined)}
              </span>
            )}
            {preOnboarding?.status === 'reviewed' && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                Reviewed by HR on {formatDate(preOnboarding.hr_reviewed_at || undefined)}
              </span>
            )}
          </div>

          {preOnboardingLoading ? (
            <p className="text-sm text-slate-600">Loading form...</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                value={preOnboardingForm.emergency_contact_name}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, emergency_contact_name: e.target.value }))}
                placeholder="Emergency contact name"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.emergency_contact_phone}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))}
                placeholder="Emergency contact phone"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.bank_name}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Bank name"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.bank_account_number}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                placeholder="Bank account number"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.ifsc_code}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, ifsc_code: e.target.value }))}
                placeholder="IFSC code"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.pan}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, pan: e.target.value }))}
                placeholder="PAN"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.aadhaar}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, aadhaar: e.target.value }))}
                placeholder="Aadhaar"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                type="date"
                value={preOnboardingForm.date_of_birth}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.marital_status}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, marital_status: e.target.value }))}
                placeholder="Marital status"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.education}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, education: e.target.value }))}
                placeholder="Highest education"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.prior_employer}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, prior_employer: e.target.value }))}
                placeholder="Prior employer"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.current_city}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, current_city: e.target.value }))}
                placeholder="Current city"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.work_location}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, work_location: e.target.value }))}
                placeholder="Preferred work location"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.tshirt_size}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, tshirt_size: e.target.value }))}
                placeholder="T-shirt size"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.laptop_preference}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, laptop_preference: e.target.value }))}
                placeholder="Laptop preference"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                value={preOnboardingForm.dietary_preferences}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, dietary_preferences: e.target.value }))}
                placeholder="Dietary preferences"
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <input
                type="date"
                value={preOnboardingForm.preferred_joining_date}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, preferred_joining_date: e.target.value }))}
                disabled={preOnboardingLocked}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <textarea
                value={preOnboardingForm.current_address}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, current_address: e.target.value }))}
                placeholder="Current address"
                disabled={preOnboardingLocked}
                className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <textarea
                value={preOnboardingForm.permanent_address}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, permanent_address: e.target.value }))}
                placeholder="Permanent address"
                disabled={preOnboardingLocked}
                className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <textarea
                value={preOnboardingForm.notes}
                onChange={(e) => setPreOnboardingForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                disabled={preOnboardingLocked}
                className="md:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document Attachments</p>
                  {!preOnboardingLocked && (
                    <div className="flex items-center gap-2">
                      <select
                        value={preOnboardingDocumentType}
                        onChange={(e) => setPreOnboardingDocumentType(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        <option value="id_proof">ID Proof</option>
                        <option value="address_proof">Address Proof</option>
                        <option value="bank_proof">Bank Proof</option>
                        <option value="education_proof">Education</option>
                        <option value="other">Other</option>
                      </select>
                      <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        {preOnboardingDocUploading ? 'Uploading...' : 'Upload document'}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          disabled={preOnboardingDocUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPreOnboardingDocument(f);
                            e.target.value = '';
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
                {(preOnboardingForm.documents || []).length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {(preOnboardingForm.documents || []).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                        <div className="min-w-0">
                          <span className="block truncate pr-2">{doc.file_name}</span>
                          <span className="text-[11px] text-slate-500">{pretty(doc.document_type)}</span>
                        </div>
                        <span className="shrink-0 text-slate-500">{formatDate(doc.uploaded_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No documents uploaded yet.</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-3">
            {!preOnboardingLocked ? (
              <button
                onClick={submitPreOnboarding}
                disabled={preOnboardingSaving}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {preOnboardingSaving ? 'Submitting...' : 'Submit to HR'}
              </button>
            ) : (
              <p className="text-xs text-slate-500">Form is locked after submission and awaiting HR verification.</p>
            )}
          </div>
        </div>
      )}

      {isOnboarded && activeTab === 'pre-onboarding' && (
        <div className={PANEL_CLASS}>
          <h2 className="text-base font-semibold text-slate-900">Pre-Onboarding</h2>
          <p className="mt-2 text-sm text-slate-600">
            This pre-onboarding link is intended for employee first-login onboarding.
            If you opened this from an HR session, use an incognito window and sign in with the employee credentials.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Once the employee signs in, they will be redirected to complete the pre-onboarding form.
          </p>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className={PANEL_CLASS}>
          <h2 className="text-base font-semibold text-slate-900">My Attendance</h2>
          <p className="mt-2 text-sm text-slate-600">Today: {pretty(data?.todayAttendance?.status)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">Check-in: {formatTime(data?.todayPunch?.check_in_at)}</span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1">Check-out: {formatTime(data?.todayPunch?.check_out_at)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => submitPunch('check_in')}
              disabled={punching || Boolean(data?.todayPunch?.check_in_at)}
              className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:from-emerald-100 hover:to-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {data?.todayPunch?.check_in_at ? 'Checked In' : punching ? 'Processing...' : 'Check In'}
            </button>
            <button
              onClick={() => submitPunch('check_out')}
              disabled={punching || !data?.todayPunch?.check_in_at || Boolean(data?.todayPunch?.check_out_at)}
              className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:from-amber-100 hover:to-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {data?.todayPunch?.check_out_at ? 'Checked Out' : punching ? 'Processing...' : 'Check Out'}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">Present Days (Last 30 Days): {attendanceSummary.present}</div>
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-700">Half Day (Last 30 Days): {attendanceSummary.halfDay}</div>
            <div className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-700">Absent Days (Last 30 Days): {attendanceSummary.absent}</div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Request Attendance Correction</h3>
            <p className="mt-1 text-xs text-slate-600">Send a correction request to HR with your note. HR will review it in Corrections queue.</p>
            <p className="mt-1 text-xs text-slate-500">Current status on selected date: {pretty(selectedDateCurrentStatus)}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={attendanceCorrectionDate}
                  onChange={(e) => setAttendanceCorrectionDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Requested Status</label>
                <select
                  value={attendanceRequestedStatus}
                  onChange={(e) => setAttendanceRequestedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs text-slate-500">Employee Note for HR</label>
                <input
                  value={attendanceCorrectionReason}
                  onChange={(e) => setAttendanceCorrectionReason(e.target.value)}
                  placeholder="Example: I checked in from client site, biometric was down."
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={submitAttendanceCorrection}
              disabled={attendanceCorrectionSubmitting}
              className="mt-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
            >
              {attendanceCorrectionSubmitting ? 'Sending...' : 'Send Correction to HR'}
            </button>
            {correctionMatchesCurrent && (
              <p className="mt-2 text-xs text-amber-700">
                Requested status matches the current status. Request will still be sent to HR with your note.
              </p>
            )}
            {attendanceCorrectionError && <p className="mt-2 text-xs text-rose-600">{attendanceCorrectionError}</p>}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">My Correction Requests</p>
            {attendanceCorrections.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No correction requests yet.</div>
            ) : (
              <div className="space-y-2">
                {attendanceCorrections.map((row) => {
                  const statusStyles: Record<string, string> = {
                    pending: 'border-amber-200 bg-amber-50 text-amber-700',
                    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
                  };
                  const style = statusStyles[row.status] || 'border-slate-200 bg-slate-50 text-slate-700';
                  return (
                    <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{formatDate(row.date)}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${style}`}>{pretty(row.status)}</span>
                        <span className="text-xs text-slate-600">{pretty(row.current_status || '-')} → {pretty(row.requested_status)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Employee note: {row.reason || '-'}</p>
                      {row.review_note && <p className="mt-1 text-xs text-slate-600">HR note: {row.review_note}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(success || error) && (
            <p className={`mt-3 text-sm ${error ? 'text-rose-600' : 'text-emerald-700'}`}>
              {error || success}
            </p>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className={PANEL_CLASS}>
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                <svg className="h-4 w-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-900">My Leave</h2>
            </div>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
              {new Date().getFullYear()} Balance
            </span>
          </div>

          {/* Leave Balance Cards */}
          {leaveBalance?.balances?.length ? (
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {leaveBalance.balances.map((row) => {
                const colorMap: Record<string, { bg: string; border: string; text: string; bar: string }> = {
                  casual:  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    bar: 'bg-cyan-500' },
                  sick:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    bar: 'bg-rose-500' },
                  earned:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
                  unpaid:  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500' },
                };
                const c = colorMap[row.leave_type] ?? { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', bar: 'bg-slate-500' };
                const total = row.accrued || 1;
                const usedPct = Math.min(100, Math.round(((row.used || 0) / total) * 100));
                return (
                  <div key={row.leave_type} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{pretty(row.leave_type)}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold text-slate-900">{row.available === null ? 'As needed' : row.available}</span>
                        <span className="ml-1 text-xs text-slate-500">left</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{row.accrued} accrued</div>
                        <div>{row.used} used</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${usedPct}%` }} />
                    </div>
                    {row.pending > 0 && (
                      <div className="mt-1.5 text-xs text-amber-700">{row.pending} pending</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Request Leave Form — leave tab only */}
          {activeTab === 'leave' && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-medium text-slate-900">Request Leave</p>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  >
                    <option value="casual">Casual</option>
                    <option value="sick">Sick</option>
                    <option value="earned">Earned</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">From Date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">To Date</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-4">
                  <label className="text-xs text-slate-500">Reason for Leave</label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Add a short reason for HR approval"
                    rows={3}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end md:col-span-4 md:max-w-xs">
                  <button
                    onClick={submitLeaveRequest}
                    disabled={leaveSubmitting}
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                  >
                    {leaveSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leave History */}
          {(data?.leaveHistory || []).length > 0 ? (
            <div className="space-y-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Recent History</p>
              {(data?.leaveHistory || []).slice(0, 6).map((leave) => {
                const statusStyles: Record<string, string> = {
                  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
                  pending:  'border-amber-200 bg-amber-50 text-amber-700',
                };
                const st = statusStyles[leave.status ?? ''] ?? 'border-slate-200 bg-slate-50 text-slate-600';
                const leaveTypeColors: Record<string, string> = {
                  casual:  'text-cyan-700',
                  sick:    'text-rose-700',
                  earned:  'text-emerald-700',
                  unpaid:  'text-amber-700',
                };
                const ltc = leaveTypeColors[leave.leave_type ?? ''] ?? 'text-slate-700';
                return (
                  <div key={leave.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${leave.status === 'approved' ? 'bg-emerald-400' : leave.status === 'rejected' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <span className={`text-sm font-medium ${ltc}`}>{pretty(leave.leave_type)}</span>
                        <span className="mx-2 text-slate-400">·</span>
                        <span className="text-sm text-slate-600">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</span>
                        {leave.days_count != null && (
                          <span className="ml-2 text-xs text-slate-500">({leave.days_count}d)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${st}`}>
                        {leave.status}
                      </span>
                      {activeTab === 'leave' && leave.status === 'pending' && (
                        <button
                          onClick={() => cancelLeaveRequest(leave.id)}
                          disabled={leaveCancellingId === leave.id}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          {leaveCancellingId === leave.id ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              No leave records yet
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-cyan-50 via-white to-amber-50 p-5 shadow-sm">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                <svg className="h-4 w-4 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-900">My Calendar & Holidays</h2>
            </div>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
              {(data?.calendar?.holidays || []).length} holidays this year
            </span>
          </div>

          {/* Upcoming approved leave */}
          {(data?.upcomingApprovedLeave || []).length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming Approved Leave</p>
              <div className="space-y-2">
                {(data?.upcomingApprovedLeave || []).map((leave) => (
                  <div key={leave.id} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">{pretty(leave.leave_type)}</span>
                    <span className="text-sm text-slate-600">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</span>
                    {leave.days_count != null && (
                      <span className="ml-auto text-xs text-slate-500">{leave.days_count}d</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming public holidays */}
          {(() => {
            const holidays = data?.calendar?.holidays || [];
            const today = new Date().toISOString().slice(0, 10);
            const upcoming = holidays.filter((h) => h.date >= today).slice(0, 8);
            const categoryStyle: Record<string, { dot: string; badge: string }> = {
              national:  { dot: 'bg-amber-500',   badge: 'border-amber-200 bg-amber-50 text-amber-700' },
              festival:  { dot: 'bg-pink-500',    badge: 'border-pink-200 bg-pink-50 text-pink-700' },
              religious: { dot: 'bg-cyan-500',    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
            };
            return (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming Public Holidays</p>
                {upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.map((h) => {
                      const s = categoryStyle[h.category] ?? { dot: 'bg-slate-500', badge: 'border-slate-200 bg-slate-50 text-slate-700' };
                      const d = new Date(h.date + 'T00:00:00');
                      const isNext7Days = (d.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                      return (
                        <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} />
                            <div>
                              <span className="text-sm font-medium text-slate-900">{h.name}</span>
                              {h.optional && (
                                <span className="ml-2 text-xs text-slate-500">optional</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            {isNext7Days && (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700">Soon</span>
                            )}
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${s.badge}`}>{h.category}</span>
                            <span className="text-xs text-slate-500">{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                    No upcoming holidays
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className={PANEL_CLASS}>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My Payroll</h2>
            <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
              Payroll & Payslips
            </span>
          </div>

          {data?.payroll?.latest_payslip ? (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-xs uppercase tracking-wide text-indigo-700">Latest Period</p>
                <p className="mt-1 font-semibold text-indigo-900">
                  {String(data.payroll.latest_payslip.period_month).padStart(2, '0')}/{data.payroll.latest_payslip.period_year}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Net Pay</p>
                <p className="mt-1 font-semibold text-emerald-900">{formatINR(data.payroll.latest_payslip.net_pay)}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-700">TDS</p>
                <p className="mt-1 font-semibold text-amber-900">{formatINR(data.payroll.latest_payslip.tds)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{data?.payroll?.message || 'No finalized payslips available yet.'}</p>
          )}

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {payrollError && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-700">{payrollError}</div>}

            {taxDeclaration && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-slate-900">Tax Declaration</p>
                  <span className="text-xs text-slate-500">Last updated: {formatDate(taxDeclaration.updated_at)}</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <select
                    value={taxDeclaration.regime}
                    onChange={(e) =>
                      setTaxDeclaration((prev) =>
                        prev
                          ? {
                              ...prev,
                              regime: (String(e.target.value).toUpperCase() === 'OLD' ? 'OLD' : 'NEW') as 'OLD' | 'NEW',
                            }
                          : prev
                      )
                    }
                    className="rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                  >
                    <option value="NEW">New Regime</option>
                    <option value="OLD">Old Regime</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={150000}
                    value={taxDeclaration.declared_80c}
                    onChange={(e) =>
                      setTaxDeclaration((prev) => (prev ? { ...prev, declared_80c: Number(e.target.value || 0) } : prev))
                    }
                    className="rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                    placeholder="80C Declaration"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={taxDeclaration.declared_80d}
                    onChange={(e) =>
                      setTaxDeclaration((prev) => (prev ? { ...prev, declared_80d: Number(e.target.value || 0) } : prev))
                    }
                    className="rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                    placeholder="80D Declaration"
                  />
                  <button
                    onClick={saveTaxDeclaration}
                    disabled={taxSaving}
                    className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 disabled:opacity-50"
                  >
                    {taxSaving ? 'Saving...' : 'Save Tax Declaration'}
                  </button>
                </div>

                {taxDeclaration.simulation && (
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div className="rounded border border-slate-200 bg-white p-2 text-xs">
                      <div className="text-slate-500">Monthly Gross</div>
                      <div className="mt-1 font-semibold text-slate-900">{formatINR(taxDeclaration.simulation.monthly_gross)}</div>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2 text-xs">
                      <div className="text-slate-500">Estimated Monthly TDS</div>
                      <div className="mt-1 font-semibold text-slate-900">{formatINR(taxDeclaration.simulation.estimated_monthly_tds)}</div>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2 text-xs">
                      <div className="text-slate-500">Annual Tax</div>
                      <div className="mt-1 font-semibold text-slate-900">{formatINR(taxDeclaration.simulation.annual_tax)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {payslipLoading && <div>Loading payslips...</div>}

            {!payslipLoading && payslips.length === 0 && (
              <div className="rounded border border-slate-200 bg-slate-50 p-2">No payslips found.</div>
            )}

            {!payslipLoading && payslips.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Period</th>
                      <th className="px-3 py-3">Gross</th>
                      <th className="px-3 py-3">Deductions</th>
                      <th className="px-3 py-3">Net</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((row) => {
                      const deductions = Number(row.pf_employee || 0) + Number(row.esi_employee || 0) + Number(row.professional_tax || 0) + Number(row.tds || 0);
                      return (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-3 text-slate-900">
                            {String(row.period_month).padStart(2, '0')}/{row.period_year}
                            <div className="mt-1 text-xs text-slate-500">LOP: {row.lop_days}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{formatINR(row.gross_earnings)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatINR(deductions)}</td>
                          <td className="px-3 py-3 font-semibold text-emerald-700">{formatINR(row.net_pay)}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => downloadPayslip(row.id)}
                              disabled={downloadingPayslipId === row.id}
                              className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 disabled:opacity-50"
                            >
                              {downloadingPayslipId === row.id ? 'Downloading...' : 'Download PDF'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'work-mode' && (
        <div className={PANEL_CLASS}>
          <h2 className="text-base font-semibold text-slate-900">Work Mode</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {['office', 'remote', 'hybrid'].map((mode) => (
              <button
                key={mode}
                onClick={() => setWorkMode(mode)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  workMode === mode ? 'border-indigo-300 bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={saveWorkMode}
            disabled={saving}
            className="mt-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Work Mode'}
          </button>
          {success && <p className="mt-2 text-sm text-emerald-700">{success}</p>}
        </div>
      )}
    </div>
  );
}