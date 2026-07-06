"use client";

import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import HRMSSidebarNav from '@/app/hrms/v2/components/hrms-sidebar-nav';
import HRMSTopHeader from '@/app/hrms/v2/components/hrms-top-header';
import { ArrowRight, BarChart3, Calendar, ChevronRight, Download, DollarSign, RefreshCw, ShieldCheck, TrendingUp, Users } from 'lucide-react';

type OptionRow = { id: string; name: string };

type ReportData = {
  filters: {
    month: number;
    year: number;
    business_entity_id: string | null;
    department_id: string | null;
    designation_id: string | null;
    employee_status: string | null;
    include_archived: boolean;
    period_start: string;
    period_end: string;
  };
  kpis: Record<string, number>;
  counts?: {
    attendance_records: number;
    leave_records: number;
    payroll_records: number;
  };
  departmentBreakdown: Array<{
    department_id: string;
    employee_count: number;
    attendance_present: number;
    attendance_total: number;
    present_rate_percent: number;
    payroll_net: number;
  }>;
  topEmployees: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string | null;
    gross_earnings: number;
    net_pay: number;
  }>;
};

function monthName(month: number) {
  return new Date(2000, Math.max(0, month - 1), 1).toLocaleString('en-IN', { month: 'long' });
}

function prettyMetric(name: string) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function currency(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function percent(value: number, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function HRMSReportingCenterPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [businessEntityId, setBusinessEntityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [entities, setEntities] = useState<OptionRow[]>([]);
  const [departments, setDepartments] = useState<OptionRow[]>([]);
  const [designations, setDesignations] = useState<OptionRow[]>([]);

  const [data, setData] = useState<ReportData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const isAdmin = role === 'HR Admin' || role === 'HR Executive';

  const entityById = useMemo(() => new Map(entities.map((row) => [row.id, row.name])), [entities]);
  const departmentById = useMemo(() => new Map(departments.map((row) => [row.id, row.name])), [departments]);
  const designationById = useMemo(() => new Map(designations.map((row) => [row.id, row.name])), [designations]);

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return {
        'x-dev-mode': 'true',
        'Content-Type': 'application/json',
      };
    }

    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
    }

    if (!token) throw new Error('No active session. Please login again.');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async function apiGet(path: string) {
    const headers = await authHeader();
    const res = await fetch(path, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function loadReferenceData() {
    const [entityRows, deptRows, desigRows] = await Promise.all([
      apiGet('/api/hrms/v2/business-entities'),
      apiGet('/api/hrms/v2/departments'),
      apiGet('/api/hrms/v2/designations'),
    ]);

    setEntities((entityRows || []).map((r: any) => ({ id: String(r.id), name: String(r.name || r.id) })));
    setDepartments((deptRows || []).map((r: any) => ({ id: String(r.id), name: String(r.name || r.id) })));
    setDesignations((desigRows || []).map((r: any) => ({ id: String(r.id), name: String(r.name || r.id) })));
  }

  async function loadRoleAndData() {
    setLoading(true);
    setError(null);

    try {
      const me = await apiGet('/api/hrms/v2/user-roles/me');
      setRole(String(me.role || ''));

      if (!(me.role === 'HR Admin' || me.role === 'HR Executive')) {
        setData(null);
        return;
      }

      await Promise.all([loadReferenceData(), loadReportData()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load report center');
    } finally {
      setLoading(false);
    }
  }

  async function loadReportData() {
    const query = new URLSearchParams({
      month: String(month),
      year: String(year),
      include_archived: includeArchived ? 'true' : 'false',
    });

    if (businessEntityId) query.set('business_entity_id', businessEntityId);
    if (departmentId) query.set('department_id', departmentId);
    if (designationId) query.set('designation_id', designationId);
    if (employeeStatus) query.set('employee_status', employeeStatus);

    const result = await apiGet(`/api/hrms/v2/reports/summary?${query.toString()}`);
    setData(result as ReportData);
  }

  useEffect(() => {
    loadRoleAndData();
  }, []);

  const departmentMax = useMemo(() => {
    const values = (data?.departmentBreakdown || []).map((row) => Number(row.payroll_net || 0));
    return Math.max(1, ...values, 1);
  }, [data]);

  const activeFilters = useMemo(() => [
    { label: 'Period', value: `${monthName(month)} ${year}` },
    { label: 'Entity', value: entityById.get(businessEntityId) || 'All entities' },
    { label: 'Department', value: departmentById.get(departmentId) || 'All departments' },
    { label: 'Designation', value: designationById.get(designationId) || 'All roles' },
    { label: 'Status', value: employeeStatus ? employeeStatus[0].toUpperCase() + employeeStatus.slice(1) : 'All employees' },
    { label: 'Archived', value: includeArchived ? 'Included' : 'Excluded' },
  ], [month, year, businessEntityId, departmentId, designationId, employeeStatus, includeArchived, entityById, departmentById, designationById]);

  const reportCards = useMemo(() => {
    const totalEmployees = Number(data?.kpis?.employees_total || 0);
    const activeEmployees = Number(data?.kpis?.employees_active || 0);
    const presentCount = Number(data?.kpis?.attendance_present_count || 0);
    const absentCount = Number(data?.kpis?.attendance_absent_count || 0);
    const halfDayCount = Number(data?.kpis?.attendance_half_day_count || 0);
    const leavePending = Number(data?.kpis?.leave_pending_count || 0);
    const gross = Number(data?.kpis?.payroll_gross_total || 0);
    const net = Number(data?.kpis?.payroll_net_total || 0);
    const totalAttendance = presentCount + absentCount + halfDayCount;

    return [
      { label: 'Total Employees', value: totalEmployees.toLocaleString('en-IN'), note: `${activeEmployees.toLocaleString('en-IN')} active`, icon: Users, tone: 'from-slate-50 to-slate-100 border-slate-200 text-slate-700' },
      { label: 'Attendance Present', value: presentCount.toLocaleString('en-IN'), note: totalAttendance > 0 ? `${percent((presentCount / totalAttendance) * 100)} presence rate` : 'No attendance rows', icon: Calendar, tone: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700' },
      { label: 'Leave Pending', value: leavePending.toLocaleString('en-IN'), note: `${Number(data?.kpis?.leave_approved_count || 0).toLocaleString('en-IN')} approved`, icon: ShieldCheck, tone: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-700' },
      { label: 'Gross Payroll', value: currency(gross), note: `${Number(data?.counts?.payroll_records || 0).toLocaleString('en-IN')} payroll rows`, icon: DollarSign, tone: 'from-violet-50 to-fuchsia-50 border-violet-200 text-violet-700' },
      { label: 'Net Payroll', value: currency(net), note: gross > 0 ? `${percent((net / gross) * 100)} net-to-gross` : 'No payroll data', icon: TrendingUp, tone: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700' },
      { label: 'Department Coverage', value: String((data?.departmentBreakdown || []).length), note: `${Number(data?.counts?.attendance_records || 0).toLocaleString('en-IN')} attendance rows`, icon: BarChart3, tone: 'from-orange-50 to-rose-50 border-orange-200 text-orange-700' },
    ];
  }, [data]);

  const overallAttendanceRate = useMemo(() => {
    const present = Number(data?.kpis?.attendance_present_count || 0);
    const absent = Number(data?.kpis?.attendance_absent_count || 0);
    const halfDay = Number(data?.kpis?.attendance_half_day_count || 0);
    const total = present + absent + halfDay;
    return total > 0 ? (present / total) * 100 : 0;
  }, [data]);

  const leaveClosureRate = useMemo(() => {
    const approved = Number(data?.kpis?.leave_approved_count || 0);
    const total = approved + Number(data?.kpis?.leave_pending_count || 0) + Number(data?.kpis?.leave_rejected_count || 0);
    return total > 0 ? (approved / total) * 100 : 0;
  }, [data]);

  const payrollEfficiency = useMemo(() => {
    const gross = Number(data?.kpis?.payroll_gross_total || 0);
    const net = Number(data?.kpis?.payroll_net_total || 0);
    return gross > 0 ? (net / gross) * 100 : 0;
  }, [data]);

  const avgPayrollPerEmployee = useMemo(() => {
    const net = Number(data?.kpis?.payroll_net_total || 0);
    const employees = Math.max(1, Number(data?.kpis?.employees_active || data?.kpis?.employees_total || 1));
    return net / employees;
  }, [data]);

  const reportFilters = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, index) => currentYear - 4 + index);

    return [
      {
        id: 'month',
        label: 'Month',
        type: 'select',
        value: String(month),
        options: Array.from({ length: 12 }, (_, index) => {
          const value = index + 1;
          return { value: String(value), label: monthName(value) };
        }),
        onChange: (value: string) => setMonth(Math.max(1, Math.min(12, Number(value) || 1))),
      },
      {
        id: 'year',
        label: 'Year',
        type: 'select',
        value: String(year),
        options: years.map((value) => ({ value: String(value), label: String(value) })),
        onChange: (value: string) => setYear(Number(value) || currentYear),
      },
      {
        id: 'entity',
        label: 'Entity',
        type: 'select',
        value: businessEntityId,
        options: entities.map((row) => ({ value: row.id, label: row.name })),
        onChange: (value: string) => setBusinessEntityId(value),
      },
      {
        id: 'department',
        label: 'Department',
        type: 'select',
        value: departmentId,
        options: departments.map((row) => ({ value: row.id, label: row.name })),
        onChange: (value: string) => setDepartmentId(value),
      },
      {
        id: 'designation',
        label: 'Role',
        type: 'select',
        value: designationId,
        options: designations.map((row) => ({ value: row.id, label: row.name })),
        onChange: (value: string) => setDesignationId(value),
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        value: employeeStatus,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
        onChange: (value: string) => setEmployeeStatus(value),
      },
    ];
  }, [month, year, businessEntityId, departmentId, designationId, employeeStatus, entities, departments, designations]);

  const reportPeriod = `${monthName(month)} ${year}`;

  async function exportReport(section: 'summary' | 'department' | 'employees', format: 'csv' | 'json') {
    setExporting(true);
    setError(null);

    try {
      const headers = await authHeader();
      const query = new URLSearchParams({
        month: String(month),
        year: String(year),
        section,
        format,
        include_archived: includeArchived ? 'true' : 'false',
      });

      if (businessEntityId) query.set('business_entity_id', businessEntityId);
      if (departmentId) query.set('department_id', departmentId);
      if (designationId) query.set('designation_id', designationId);
      if (employeeStatus) query.set('employee_status', employeeStatus);

      const res = await fetch(`/api/hrms/v2/reports/export?${query.toString()}`, { headers });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to export report');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hrms-report-${section}-${year}-${String(month).padStart(2, '0')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  }

  function exportPDF() {
    if (!data) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 44;

    doc.setFontSize(18);
    doc.text('HRMS Reporting Center', 40, y);
    y += 20;

    doc.setFontSize(11);
    doc.text(`Period: ${monthName(month)} ${year}`, 40, y);
    y += 16;
    doc.text(`Filters: entity=${businessEntityId || 'all'}, department=${departmentId || 'all'}, designation=${designationId || 'all'}, status=${employeeStatus || 'all'}`, 40, y);
    y += 24;

    doc.setFontSize(13);
    doc.text('Key Metrics', 40, y);
    y += 18;

    doc.setFontSize(10);
    for (const [k, v] of Object.entries(data.kpis || {})) {
      doc.text(`${prettyMetric(k)}: ${Number(v).toLocaleString('en-IN')}`, 48, y);
      y += 14;
      if (y > 760) {
        doc.addPage();
        y = 44;
      }
    }

    y += 12;
    doc.setFontSize(13);
    doc.text('Department Breakdown', 40, y);
    y += 18;

    doc.setFontSize(10);
    for (const row of data.departmentBreakdown || []) {
      doc.text(`Dept ${row.department_id} | Headcount ${row.employee_count} | Present ${row.present_rate_percent}% | Net ${Number(row.payroll_net).toLocaleString('en-IN')}`, 48, y);
      y += 14;
      if (y > 760) {
        doc.addPage();
        y = 44;
      }
    }

    doc.save(`hrms-report-${year}-${String(month).padStart(2, '0')}.pdf`);
  }

  const departmentRows = (data?.departmentBreakdown || []).map((row) => ({
    ...row,
    label: departmentById.get(row.department_id) || (row.department_id === 'unassigned' ? 'Unassigned' : row.department_id),
  }));

  const topEmployeeRows = (data?.topEmployees || []).map((row) => ({
    ...row,
    initials: initials(row.employee_name),
  }));

  return (
    <div className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav max-w-7xl mx-auto space-y-6">
        <HRMSTopHeader
          title="Reports"
          subtitle="Attendance, payroll, leave, and employee insights in one unified command view."
        />

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white/80" />
            ))}
          </div>
        ) : !isAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-700">
            Reporting Center is restricted to HR Admin and HR Executive roles.
          </div>
        ) : (
          <>
            <section className="hrms-dashboard-shell space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Filters</h2>
                  <p className="text-xs text-slate-500">{reportPeriod} reporting window</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                    <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="rounded" />
                    Include archived
                  </label>
                  <button
                    onClick={loadRoleAndData}
                    disabled={loading}
                    className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                  <button
                    onClick={() => loadReportData()}
                    className="hrms-btn hrms-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    Apply Filters
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setFiltersExpanded((value) => !value)}
                    className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    {filtersExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {filtersExpanded ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
                  {reportFilters.map((filter: any) => (
                    <div key={filter.id} className="min-w-0">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{filter.label}</label>
                      <select
                        value={filter.value}
                        onChange={(e) => filter.onChange(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#a5b4fc] focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">{filter.label}</option>
                        {filter.options?.map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {reportFilters.map((filter: any) => (
                    <span key={filter.id} className="hrms-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
                      <span className="text-slate-500">{filter.label}:</span>
                      <span className="text-slate-800">{String(filter.value || 'All')}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportCards.map((card) => (
                <article key={card.label} className={`rounded-3xl border bg-gradient-to-br p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${card.tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{card.value}</p>
                      <p className="mt-2 text-sm text-slate-600">{card.note}</p>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-slate-700 shadow-sm">
                      <card.icon size={18} />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <article className="hrms-dashboard-shell space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Operational Snapshot</h2>
                    <p className="text-sm text-slate-500">Live ratios calculated from the currently filtered reporting window.</p>
                  </div>
                  <button disabled={exporting} onClick={() => exportReport('summary', 'csv')} className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> Summary CSV
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Attendance rate</p>
                    <p className="mt-2 text-3xl font-black text-blue-900">{percent(overallAttendanceRate)}</p>
                    <p className="mt-1 text-sm text-blue-700">Present vs. all recorded attendance statuses</p>
                    <div className="mt-4 h-2 rounded-full bg-blue-100">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${overallAttendanceRate}%` }} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Leave closure</p>
                    <p className="mt-2 text-3xl font-black text-emerald-900">{percent(leaveClosureRate)}</p>
                    <p className="mt-1 text-sm text-emerald-700">Approved leaves out of the full leave request volume</p>
                    <div className="mt-4 h-2 rounded-full bg-emerald-100">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${leaveClosureRate}%` }} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Payroll efficiency</p>
                    <p className="mt-2 text-3xl font-black text-violet-900">{percent(payrollEfficiency)}</p>
                    <p className="mt-1 text-sm text-violet-700">Net pay as a share of gross payroll</p>
                    <div className="mt-4 h-2 rounded-full bg-violet-100">
                      <div className="h-2 rounded-full bg-violet-600" style={{ width: `${payrollEfficiency}%` }} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Active Filter Snapshot</h3>
                      <p className="text-xs text-slate-500">Every metric below is scoped by the selected filters.</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{data?.counts?.attendance_records ?? 0} attendance rows</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activeFilters.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="hrms-dashboard-shell space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Report Governance</h2>
                  <p className="text-sm text-slate-500">Export, review, and share the same dataset across formats.</p>
                </div>

                <div className="space-y-3">
                  <button disabled={exporting} onClick={() => exportReport('summary', 'csv')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Export summary CSV</p>
                      <p className="text-xs text-slate-500">KPI snapshot for leadership review</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                  <button disabled={exporting} onClick={() => exportReport('department', 'csv')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Export department CSV</p>
                      <p className="text-xs text-slate-500">Headcount, presence, and payroll by department</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                  <button disabled={exporting} onClick={() => exportReport('employees', 'json')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Export employee JSON</p>
                      <p className="text-xs text-slate-500">Top payroll contributors in structured form</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                  <button disabled={exporting || !data} onClick={exportPDF} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-rose-200 hover:bg-rose-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Generate PDF pack</p>
                      <p className="text-xs text-slate-500">Board-ready summary with current filters</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dataset coverage</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between"><span>Attendance rows</span><span className="font-semibold text-slate-900">{Number(data?.counts?.attendance_records || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex items-center justify-between"><span>Leave rows</span><span className="font-semibold text-slate-900">{Number(data?.counts?.leave_records || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex items-center justify-between"><span>Payroll rows</span><span className="font-semibold text-slate-900">{Number(data?.counts?.payroll_records || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex items-center justify-between"><span>Average net payroll per active employee</span><span className="font-semibold text-slate-900">{currency(avgPayrollPerEmployee)}</span></div>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <article className="hrms-dashboard-shell">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Department Performance</h2>
                    <p className="text-xs text-slate-500">Headcount, attendance, and payroll distribution by department.</p>
                  </div>
                  <button disabled={exporting} onClick={() => exportReport('department', 'csv')} className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {departmentRows.slice(0, 8).map((row) => (
                    <div key={row.department_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{row.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.employee_count.toLocaleString('en-IN')} employees • {percent(row.present_rate_percent)} present rate
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Net payroll</p>
                          <p className="text-sm font-bold text-slate-900">{currency(row.payroll_net)}</p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" style={{ width: `${Math.max(6, (Number(row.payroll_net || 0) / departmentMax) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {departmentRows.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No department data for this filter set.
                    </div>
                  )}
                </div>
              </article>

              <article className="hrms-dashboard-shell">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Top Payroll Contributors</h2>
                    <p className="text-xs text-slate-500">Employees with the highest net payroll in the current window.</p>
                  </div>
                  <button disabled={exporting} onClick={() => exportReport('employees', 'csv')} className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {topEmployeeRows.slice(0, 6).map((row) => (
                    <div key={row.employee_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-600 text-sm font-black text-white">
                          {row.initials || 'E'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{row.employee_name}</p>
                          <p className="text-xs text-slate-500">{row.employee_code || row.employee_id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{currency(row.net_pay)}</p>
                        <p className="text-xs text-slate-500">Net pay</p>
                      </div>
                    </div>
                  ))}
                  {topEmployeeRows.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No payroll contribution rows available for the selected period.
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="hrms-dashboard-shell">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Export Suite</h2>
                  <p className="text-xs text-slate-500">Multiple output formats from the same live report data.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={exporting} onClick={() => exportReport('summary', 'csv')} className="hrms-btn hrms-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> CSV
                  </button>
                  <button disabled={exporting} onClick={() => exportReport('summary', 'json')} className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> JSON
                  </button>
                  <button disabled={exporting || !data} onClick={exportPDF} className="hrms-btn hrms-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <Download size={14} /> PDF
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
