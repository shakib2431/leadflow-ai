

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Calendar, CheckCircle, XCircle, Users, X, Palmtree, Tent, CheckCircle2, AlertCircle, Database, RefreshCw } from "lucide-react";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { INDIAN_STANDARD_HOLIDAYS_2026, type HolidayRow } from "@/lib/hrms/companyHolidays";

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string;
  status?: string;
  employment_history?: Array<{ designation?: string; effective_to?: string | null }>;
};

type LeaveRow = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  employees?: { first_name?: string; last_name?: string };
};

type CorrectionRow = {
  id: string;
  employee_id: string;
  date: string;
  current_status?: string | null;
  requested_status: 'present' | 'absent' | 'half_day';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  employees?: { first_name?: string; last_name?: string; employee_code?: string };
};

type AttendanceSourceRow = {
  id: string;
  name: string;
  provider: 'manual' | 'biometric_csv' | 'biometric_api';
  status: 'active' | 'inactive';
  last_synced_at?: string | null;
};

type AttendanceSyncLogRow = {
  id: string;
  source_id: string;
  sync_date: string;
  status: 'success' | 'failed';
  total_records: number;
  created_records: number;
  updated_records: number;
  error_message?: string | null;
  created_at: string;
};

type AttendanceMetaRow = {
  check_in_at?: string | null;
  check_out_at?: string | null;
};

// HolidayRow type and INDIAN_STANDARD_HOLIDAYS_2026 are now sourced from @/lib/hrms/companyHolidays

export default function AttendancePage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Record<string, string>>({});
  const [attendanceMeta, setAttendanceMeta] = useState<Record<string, AttendanceMetaRow>>({});
  const [pendingPTO, setPendingPTO] = useState<LeaveRow[]>([]);
  const [approvedPTO, setApprovedPTO] = useState<LeaveRow[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<CorrectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAttendanceId, setSavingAttendanceId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    employee_id: '',
    date: '',
    requested_status: 'present' as 'present' | 'absent' | 'half_day',
    reason: '',
  });

  const [attendanceSources, setAttendanceSources] = useState<AttendanceSourceRow[]>([]);
  const [syncLogs, setSyncLogs] = useState<AttendanceSyncLogRow[]>([]);
  const [sourceForm, setSourceForm] = useState({
    name: '',
    provider: 'biometric_csv' as 'manual' | 'biometric_csv' | 'biometric_api',
  });
  const [syncControl, setSyncControl] = useState({
    sourceId: '',
    syncDate: new Date().toLocaleDateString('en-CA'),
    defaultStatus: 'present' as 'present' | 'absent' | 'half_day',
  });
  const [sourceLoading, setSourceLoading] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [runningSyncSourceId, setRunningSyncSourceId] = useState<string | null>(null);
  const [csvUploadSourceId, setCsvUploadSourceId] = useState('');
  const [csvUploadDate, setCsvUploadDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [csvUploadFile, setCsvUploadFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  
  const [showOutTodayModal, setShowOutTodayModal] = useState(false);

  const todayDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time

  useEffect(() => {
    fetchAttendanceData();
    fetchAttendanceSourceData();
  }, []);

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return { 'x-dev-mode': 'true', 'Content-Type': 'application/json' };
    }

    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshResult = await supabase.auth.refreshSession();
      token = refreshResult.data.session?.access_token;
    }

    if (!token) throw new Error('No active session');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async function formAuthHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return { 'x-dev-mode': 'true' };
    }

    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshResult = await supabase.auth.refreshSession();
      token = refreshResult.data.session?.access_token;
    }

    if (!token) throw new Error('No active session');
    return { Authorization: `Bearer ${token}` };
  }

  async function apiGet(path: string) {
    const headers = await authHeader();
    const res = await fetch(path, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function apiPost(path: string, payload: Record<string, unknown>) {
    const headers = await authHeader();
    const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function apiPut(path: string, payload: Record<string, unknown>) {
    const headers = await authHeader();
    const res = await fetch(path, { method: 'PUT', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function fetchAttendanceSourceData() {
    setSourceLoading(true);

    try {
      const [sourceRows, logRows] = await Promise.all([
        apiGet('/api/hrms/v2/attendance/sources').catch(() => []),
        apiGet('/api/hrms/v2/attendance/sync-logs?limit=10').catch(() => []),
      ]);

      const sources = (sourceRows || []) as AttendanceSourceRow[];
      setAttendanceSources(sources);
      setSyncLogs((logRows || []) as AttendanceSyncLogRow[]);

      if (!syncControl.sourceId && sources[0]?.id) {
        setSyncControl((prev) => ({ ...prev, sourceId: sources[0].id }));
      }
      if (!csvUploadSourceId && sources[0]?.id) {
        setCsvUploadSourceId(sources[0].id);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to load attendance sources.' });
    } finally {
      setSourceLoading(false);
    }
  }

  async function createAttendanceSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceForm.name.trim()) {
      setActionMessage({ type: 'error', text: 'Source name is required.' });
      return;
    }

    setCreatingSource(true);
    try {
      const row = (await apiPost('/api/hrms/v2/attendance/sources', sourceForm)) as AttendanceSourceRow;
      setSourceForm((prev) => ({ ...prev, name: '' }));
      setSyncControl((prev) => ({ ...prev, sourceId: row.id }));
      setActionMessage({ type: 'success', text: 'Attendance source created.' });
      await fetchAttendanceSourceData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to create attendance source.' });
    } finally {
      setCreatingSource(false);
    }
  }

  async function runSourceSync(sourceId: string) {
    if (!sourceId) {
      setActionMessage({ type: 'error', text: 'Please choose an attendance source.' });
      return;
    }

    if (employees.length === 0) {
      setActionMessage({ type: 'error', text: 'No active employees found for attendance sync.' });
      return;
    }

    setRunningSyncSourceId(sourceId);
    try {
      const entries = employees.map((emp) => {
        const current = attendanceToday[emp.id];
        const normalizedStatus = current === 'present' || current === 'absent' || current === 'half_day' ? current : syncControl.defaultStatus;
        return {
          employee_id: emp.id,
          date: syncControl.syncDate,
          status: normalizedStatus,
        };
      });

      await apiPost(`/api/hrms/v2/attendance/sources/${sourceId}/sync`, {
        sync_date: syncControl.syncDate,
        entries,
      });

      setActionMessage({ type: 'success', text: 'Attendance sync completed successfully.' });
      await Promise.all([fetchAttendanceData(), fetchAttendanceSourceData()]);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Attendance sync failed.' });
      await fetchAttendanceSourceData();
    } finally {
      setRunningSyncSourceId(null);
    }
  }

  async function uploadSourceCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!csvUploadSourceId) {
      setActionMessage({ type: 'error', text: 'Please select a source for CSV upload.' });
      return;
    }
    if (!csvUploadFile) {
      setActionMessage({ type: 'error', text: 'Please select a CSV file to upload.' });
      return;
    }

    setUploadingCsv(true);
    try {
      const headers = await formAuthHeader();
      const formData = new FormData();
      formData.append('file', csvUploadFile);
      formData.append('sync_date', csvUploadDate);

      const res = await fetch(`/api/hrms/v2/attendance/sources/${csvUploadSourceId}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const body = await res.json();

      if (!res.ok) {
        const reportHint = body?.data?.artifact?.artifact_file ? ` Report: ${body.data.artifact.artifact_file}` : '';
        throw new Error((body.error || 'CSV upload failed') + reportHint);
      }

      setCsvUploadFile(null);
      const invalidRows = Number(body?.data?.invalid_rows || 0);
      const reportHint = body?.data?.artifact?.artifact_file ? ` Report: ${body.data.artifact.artifact_file}` : '';
      setActionMessage({
        type: 'success',
        text: `CSV sync complete. Valid rows: ${Number(body?.data?.valid_rows || 0)}, Invalid rows: ${invalidRows}.${reportHint}`,
      });
      await Promise.all([fetchAttendanceData(), fetchAttendanceSourceData()]);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to upload CSV.' });
    } finally {
      setUploadingCsv(false);
    }
  }

  // async function fetchAttendanceData() {
  //   setLoading(true);

  //   // 1. Fetch Active Employees & their current role
  //   const { data: empData } = await supabase
  //     .from("employees")
  //     .select(`
  //       id, first_name, last_name, employee_code,
  //       employment_history (designation)
  //     `)
  //     .eq("status", "active");
  //   if (empData) setEmployees(empData);

  //   // 2. Fetch Today's Daily Attendance (Present/Absent/Half Day)
  //   const { data: records } = await supabase
  //     .from("attendance_records")
  //     .select("employee_id, status")
  //     .eq("date", todayDate);

  //   if (records) {
  //     const attendanceMap: Record<string, string> = {};
  //     records.forEach(r => { attendanceMap[r.employee_id] = r.status; });
  //     setAttendanceToday(attendanceMap);
  //   }
  async function fetchAttendanceData() {
    setLoading(true);
    setActionMessage(null);

    try {
      const [attendanceData, correctionsData] = await Promise.all([
        apiGet(`/api/hrms/v2/attendance?date=${todayDate}`),
        apiGet('/api/hrms/v2/attendance/corrections?status=pending').catch(() => []),
      ]);

      const employeeRows = (attendanceData?.employees || []) as EmployeeRow[];
      const records = attendanceData?.attendanceRecords || [];
      const attendanceMap: Record<string, string> = {};
      const attendanceMetaMap: Record<string, AttendanceMetaRow> = {};
      records.forEach((r: any) => {
        attendanceMap[String(r.employee_id)] = String(r.status);
        attendanceMetaMap[String(r.employee_id)] = {
          check_in_at: r?.check_in_at ? String(r.check_in_at) : null,
          check_out_at: r?.check_out_at ? String(r.check_out_at) : null,
        };
      });

      setEmployees(employeeRows);
      setAttendanceToday(attendanceMap);
      setAttendanceMeta(attendanceMetaMap);
      setPendingPTO((attendanceData?.pendingPTO || []) as LeaveRow[]);
      setApprovedPTO((attendanceData?.approvedPTO || []) as LeaveRow[]);
      setPendingCorrections((correctionsData || []) as CorrectionRow[]);

      if (!correctionForm.employee_id && employeeRows[0]?.id) {
        setCorrectionForm((prev) => ({ ...prev, employee_id: employeeRows[0].id, date: todayDate }));
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to load attendance data.' });
    } finally {
      setLoading(false);
    }
  }

  // Handle Daily Clock-in / Roster
  async function markAttendance(employeeId: string, status: 'present' | 'absent' | 'half_day' | 'leave') {
    if (status === 'leave') return;

    setSavingAttendanceId(employeeId);
    setAttendanceToday(prev => ({ ...prev, [employeeId]: status }));

    try {
      await apiPost('/api/hrms/v2/attendance', {
        employee_id: employeeId,
        date: todayDate,
        status,
      });
      setActionMessage({ type: 'success', text: 'Attendance updated.' });
    } catch (err: any) {
      await fetchAttendanceData();
      setActionMessage({ type: 'error', text: err.message || 'Failed to update attendance.' });
    } finally {
      setSavingAttendanceId(null);
    }
  }

  // Handle Leave Approvals
  const handleApprovePTO = async (id: string) => {
    try {
      await supabase.from("leave_requests").update({ status: "approved" }).eq("id", id);
      setActionMessage({ type: 'success', text: 'Leave request approved.' });
      await fetchAttendanceData();
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to approve leave request.' });
    }
  };

  const handleDenyPTO = async (id: string) => {
    try {
      await supabase.from("leave_requests").update({ status: "rejected" }).eq("id", id);
      setActionMessage({ type: 'success', text: 'Leave request denied.' });
      await fetchAttendanceData();
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to deny leave request.' });
    }
  };

  function openCorrectionModal(employeeId: string) {
    setCorrectionForm({ employee_id: employeeId, date: todayDate, requested_status: 'present', reason: '' });
    setShowCorrectionModal(true);
  }

  async function submitCorrectionRequest(e: React.FormEvent) {
    e.preventDefault();

    try {
      await apiPost('/api/hrms/v2/attendance/corrections', correctionForm);
      setShowCorrectionModal(false);
      setActionMessage({ type: 'success', text: 'Attendance correction request submitted.' });
      await fetchAttendanceData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit correction request.' });
    }
  }

  async function reviewCorrection(id: string, action: 'approve' | 'reject') {
    try {
      await apiPut(`/api/hrms/v2/attendance/corrections/${id}`, { action });
      setActionMessage({
        type: 'success',
        text: action === 'approve' ? 'Correction approved and attendance updated.' : 'Correction rejected.',
      });
      await fetchAttendanceData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to review correction request.' });
    }
  }

  if (loading) return <div className="hrms-enterprise h-screen flex items-center justify-center text-slate-500 bg-slate-50">Syncing attendance...</div>;

  const activeCount = employees.filter((emp) => {
    const isOutOnPTO = approvedPTO.some((pto) => pto.employee_id === emp.id);
    if (isOutOnPTO) return false;

    const status = attendanceToday[emp.id];
    return status === 'present' || status === 'half_day';
  }).length;

  const holidayCalendar = [...INDIAN_STANDARD_HOLIDAYS_2026].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingHolidays = holidayCalendar.filter((h) => h.date >= todayDate);
  const nationalHolidays = holidayCalendar.filter((h) => h.category === 'national');
  const majorObservances = holidayCalendar.filter((h) => h.category !== 'national');

  const formatHolidayDate = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8 font-sans">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
      <HRMSTopHeader
        title="Attendance"
        subtitle="Monitor daily attendance, corrections, biometric sync, and leave-linked exceptions."
      />

      {actionMessage && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${actionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {actionMessage.text}
        </div>
      )}

      {/* TOP STATS */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Active Now</p>
            <p className="text-3xl font-bold text-emerald-400">
              {activeCount}
              <span className="text-lg text-slate-500 font-normal"> / {employees.length}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Clock className="text-emerald-400" size={24} />
          </div>
        </div>
        
        <div 
          onClick={() => setShowOutTodayModal(true)}
          className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between cursor-pointer hover:border-amber-500/30 hover:bg-slate-50 transition-all group"
        >
          <div>
            <p className="text-slate-500 group-hover:text-amber-400/70 transition-colors text-xs font-bold uppercase tracking-widest mb-1">On PTO Today</p>
            <p className="text-3xl font-bold text-amber-400">{approvedPTO.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
            <Calendar className="text-amber-400" size={24} />
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Corrections</p>
            <p className="text-3xl font-bold text-cyan-600">{pendingCorrections.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
            <AlertCircle className="text-cyan-600" size={24} />
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database size={18} className="text-cyan-600" />
              Attendance Source Control Center
            </h2>
            <p className="mt-1 text-sm text-slate-500">Phase 6 foundation: configure biometric/manual sources and run controlled syncs.</p>
          </div>
          <button
            onClick={fetchAttendanceSourceData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <form onSubmit={createAttendanceSource} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Create Source</p>
            <div className="space-y-3">
              <input
                value={sourceForm.name}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Source Name (Eg: Mumbai Biometrics)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                required
              />
              <select
                value={sourceForm.provider}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, provider: e.target.value as any }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="biometric_csv">Biometric CSV</option>
                <option value="biometric_api">Biometric API</option>
                <option value="manual">Manual Upload</option>
              </select>
              <button
                type="submit"
                disabled={creatingSource}
                className="w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-50"
              >
                {creatingSource ? 'Creating Source...' : 'Create Source'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Run Sync</p>
            <div className="space-y-3">
              <select
                value={syncControl.sourceId}
                onChange={(e) => setSyncControl((prev) => ({ ...prev, sourceId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Select Source</option>
                {attendanceSources.map((source) => (
                  <option key={source.id} value={source.id}>{`${source.name} (${source.provider})`}</option>
                ))}
              </select>
              <input
                type="date"
                value={syncControl.syncDate}
                onChange={(e) => setSyncControl((prev) => ({ ...prev, syncDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <select
                value={syncControl.defaultStatus}
                onChange={(e) => setSyncControl((prev) => ({ ...prev, defaultStatus: e.target.value as 'present' | 'absent' | 'half_day' }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="present">Default Status: Present</option>
                <option value="half_day">Default Status: Half Day</option>
                <option value="absent">Default Status: Absent</option>
              </select>
              <button
                type="button"
                onClick={() => runSourceSync(syncControl.sourceId)}
                disabled={runningSyncSourceId === syncControl.sourceId || !syncControl.sourceId}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
              >
                {runningSyncSourceId === syncControl.sourceId ? 'Syncing...' : 'Run Attendance Sync'}
              </button>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">CSV Upload</p>
              <form onSubmit={uploadSourceCsv} className="space-y-2">
                <select
                  value={csvUploadSourceId}
                  onChange={(e) => setCsvUploadSourceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Select Source</option>
                  {attendanceSources.map((source) => (
                    <option key={source.id} value={source.id}>{`${source.name} (${source.provider})`}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={csvUploadDate}
                  onChange={(e) => setCsvUploadDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-xs file:text-slate-700"
                />
                <button
                  type="submit"
                  disabled={uploadingCsv || !csvUploadSourceId || !csvUploadFile}
                  className="w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-50"
                >
                  {uploadingCsv ? 'Uploading CSV...' : 'Upload CSV & Sync'}
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Latest Sync Logs</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {sourceLoading && <p className="text-sm text-slate-500">Loading source data...</p>}
              {!sourceLoading && syncLogs.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No sync logs yet.</p>
              )}
              {syncLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{log.sync_date}</span>
                    <span className={`rounded px-2 py-0.5 font-bold uppercase ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Rows {log.total_records} | Created {log.created_records} | Updated {log.updated_records}</p>
                  {log.error_message && <p className="mt-1 text-xs text-rose-700">{log.error_message}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LIVE TEAM STATUS (ROSTER) */}
        <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Clock size={16} /> Daily Roster
            </h3>
            <span className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-mono">{todayDate}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Status Today</th>
                  <th className="pb-3 font-medium text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isOutOnPTO = approvedPTO.some(pto => pto.employee_id === emp.id);
                  const activeRole = emp.employment_history?.find((h:any) => h.effective_to === null)?.designation || "Unassigned";
                  const currentStatus = isOutOnPTO ? 'leave' : attendanceToday[emp.id];
                  const checkInAt = attendanceMeta[emp.id]?.check_in_at;
                  const checkOutAt = attendanceMeta[emp.id]?.check_out_at;

                  return (
                    <tr key={emp.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-4">
                        <div className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-slate-500">{activeRole} • {emp.employee_code}</div>
                      </td>
                      <td className="py-4">
                        {!currentStatus && <span className="text-slate-500 italic">Not Marked</span>}
                        {currentStatus === 'present' && <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs font-bold"><CheckCircle2 size={14}/> Present</span>}
                        {currentStatus === 'absent' && <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-md text-xs font-bold"><XCircle size={14}/> Absent</span>}
                        {currentStatus === 'half_day' && <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md text-xs font-bold"><Clock size={14}/> Half Day</span>}
                        {currentStatus === 'leave' && <span className="inline-flex items-center gap-1.5 text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-md text-xs font-bold"><AlertCircle size={14}/> On Leave</span>}
                        {(checkInAt || checkOutAt) && (
                          <div className="mt-2 text-[11px] text-slate-500">
                            <span>In: {checkInAt ? new Date(checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                            <span className="mx-2">|</span>
                            <span>Out: {checkOutAt ? new Date(checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => markAttendance(emp.id, 'present')} disabled={isOutOnPTO || savingAttendanceId === emp.id} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentStatus === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-500/20 hover:text-emerald-400'} disabled:opacity-30`}>Present</button>
                          <button onClick={() => markAttendance(emp.id, 'half_day')} disabled={isOutOnPTO || savingAttendanceId === emp.id} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentStatus === 'half_day' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-500/20 hover:text-amber-400'} disabled:opacity-30`}>Half Day</button>
                          <button onClick={() => markAttendance(emp.id, 'absent')} disabled={isOutOnPTO || savingAttendanceId === emp.id} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentStatus === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-500/20 hover:text-rose-400'} disabled:opacity-30`}>Absent</button>
                          <button onClick={() => openCorrectionModal(emp.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all">Correction</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          
          {/* PENDING APPROVALS */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Calendar size={16} /> Pending Leave
            </h3>
            <div className="space-y-4">
              {pendingPTO.map((request) => (
                <div key={request.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{request.employees?.first_name} {request.employees?.last_name}</span>
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{request.leave_type}</span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg mb-4 border border-slate-200">
                    <span className="text-xs text-slate-500">Req: <strong className="text-slate-900">{request.days_count} Days</strong></span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleApprovePTO(request.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleDenyPTO(request.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/20">
                      <XCircle size={14} /> Deny
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingPTO.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">All caught up.</p>
              )}
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <AlertCircle size={16} /> Pending Corrections
            </h3>
            <div className="space-y-3">
              {pendingCorrections.map((correction) => (
                <div key={correction.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {correction.employees?.first_name || 'Employee'} {correction.employees?.last_name || ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {correction.date} • {correction.current_status || 'not_marked'} {'->'} {correction.requested_status}
                  </p>
                  <p className="text-xs text-slate-700 mt-2">{correction.reason}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => reviewCorrection(correction.id, 'approve')} className="flex-1 rounded border border-emerald-200 bg-emerald-50 py-1.5 text-xs font-bold text-emerald-700">Approve</button>
                    <button onClick={() => reviewCorrection(correction.id, 'reject')} className="flex-1 rounded border border-rose-200 bg-rose-50 py-1.5 text-xs font-bold text-rose-700">Reject</button>
                  </div>
                </div>
              ))}
              {pendingCorrections.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50">No pending correction requests.</p>
              )}
            </div>
          </div>

          {/* COMPANY HOLIDAYS */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Palmtree size={16} /> Company Holidays
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                <p className="font-semibold text-slate-800">{holidayCalendar.length}</p>
                <p>Standard India holidays (2026)</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                <p className="font-semibold text-slate-800">{upcomingHolidays.length}</p>
                <p>Upcoming from today</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">National Holidays</p>
              {nationalHolidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Tent size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{holiday.name}</p>
                      <p className="text-xs text-slate-500">{formatHolidayDate(holiday.date)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] rounded-full border border-slate-300 px-2 py-0.5 font-semibold text-slate-600">Mandatory</span>
                </div>
              ))}

              <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Major Observances</p>
              {majorObservances.slice(0, 7).map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{holiday.name}</p>
                    <p className="text-xs text-slate-500">{formatHolidayDate(holiday.date)}</p>
                  </div>
                  <span className="text-[10px] rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                    {holiday.optional ? 'Optional' : 'Observed'}
                  </span>
                </div>
              ))}

              <p className="pt-2 text-[11px] text-slate-500">
                Notes: Festival dates follow 2026 India observances and can vary by state and company policy.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* OUT TODAY MODAL */}
      {showOutTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="text-amber-400" size={20} /> Team Out Today
              </h2>
              <button onClick={() => setShowOutTodayModal(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {approvedPTO.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Everyone is scheduled to be in today!</p>
              ) : (
                <div className="space-y-4">
                  {approvedPTO.map(pto => (
                    <div key={pto.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <h4 className="font-bold text-slate-900 mb-1">{pto.employees?.first_name} {pto.employees?.last_name}</h4>
                      <div className="flex items-center gap-2 mt-2 text-xs text-amber-400 bg-amber-500/10 w-fit px-2 py-1 rounded">
                        <Calendar size={12} /> {pto.leave_type} until {new Date(pto.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Request Attendance Correction</h2>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-500 hover:text-slate-900"><X size={18} /></button>
            </div>

            <form onSubmit={submitCorrectionRequest} className="space-y-3">
              <select value={correctionForm.employee_id} onChange={(e) => setCorrectionForm((prev) => ({ ...prev, employee_id: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" required>
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{`${emp.first_name} ${emp.last_name}`}</option>
                ))}
              </select>

              <input type="date" value={correctionForm.date} onChange={(e) => setCorrectionForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" required />

              <select value={correctionForm.requested_status} onChange={(e) => setCorrectionForm((prev) => ({ ...prev, requested_status: e.target.value as 'present' | 'absent' | 'half_day' }))} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" required>
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>

              <textarea value={correctionForm.reason} onChange={(e) => setCorrectionForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for correction" className="w-full min-h-[90px] rounded-lg border border-slate-200 bg-white p-2 text-sm" required />

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCorrectionModal(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
