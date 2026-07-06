

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IndianRupee, Play, CheckCircle2, FileText, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";

function toAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type PayrollConfig = {
  cycleStartDay: number;
  cutoffDay: number;
  approvalRequired: boolean;
};

type PayrollPreview = {
  period: { month: number; year: number; startDate: string; endDate: string };
  totals: { gross: number; deductions: number; net: number };
  employeeCount: number;
  items: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string | null;
    lop_days: number;
    gross_earnings: number;
    deductions: number;
    net_pay: number;
  }>;
};

type PayrollDashboard = {
  period: { month: number; year: number };
  run: { id: string; status: string; period_month: number; period_year: number } | null;
  totals: { gross: number; net: number; deductions: number; pf: number; esi: number; pt: number; tds: number; lwf: number };
  employeeCount: number;
  statusCounts: Record<string, number>;
  trend: Array<{ month: number; year: number; gross: number; net: number }>;
};

type PayrollReport = {
  runs: Array<{ id: string; period_month: number; period_year: number; status: string }>;
  monthlySummary: Array<{ period_key: string; month: number; year: number; gross: number; net: number; deductions: number; employee_count: number }>;
  employeeSummary: Array<{ employee_id: string; employee_name: string; employee_code: string | null; gross: number; net: number; deductions: number; runs: number }>;
};

type PayrollCoverage = {
  activeEmployees: number;
  employeesInRun: number;
  excludedEmployees: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string | null;
    reason: string;
  }>;
};

function openSalarySetup(employeeId: string) {
  if (typeof window === 'undefined') return;
  window.location.href = `/team/onboarding/${encodeURIComponent(employeeId)}`;
}

export default function PayrollPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig>({
    cycleStartDay: 1,
    cutoffDay: 25,
    approvalRequired: true,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [dashboard, setDashboard] = useState<PayrollDashboard | null>(null);
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [creatingStructure, setCreatingStructure] = useState(false);
  const [coverage, setCoverage] = useState<PayrollCoverage>({ activeEmployees: 0, employeesInRun: 0, excludedEmployees: [] });

  const month = currentDate.getMonth() + 1; // 1-12
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    fetchPayrollData();
    fetchPayrollInsights();
  }, [month, year]);

  useEffect(() => {
    loadPayrollConfig();
  }, []);

  async function apiHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-dev-mode': 'true',
    };
  }

  async function apiGet(path: string) {
    const headers = await apiHeaders();
    const res = await fetch(path, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function apiPut(path: string, payload: any) {
    const headers = await apiHeaders();
    const res = await fetch(path, { method: 'PUT', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function apiPost(path: string, payload: any) {
    const headers = await apiHeaders();
    const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function fetchPayrollInsights() {
    setLoadingInsights(true);
    try {
      const [dashboardData, reportData] = await Promise.all([
        apiGet(`/api/hrms/v2/payroll/dashboard?month=${month}&year=${year}`),
        apiGet(`/api/hrms/v2/payroll/reports?month=${month}&year=${year}`),
      ]);

      setDashboard((dashboardData || null) as PayrollDashboard | null);
      setReport((reportData || null) as PayrollReport | null);
    } catch (err: any) {
      console.error('Failed to fetch payroll insights:', err.message);
      setDashboard(null);
      setReport(null);
    } finally {
      setLoadingInsights(false);
    }
  }

  const seedSalaryStructure = async () => {
    setCreatingStructure(true);
    try {
      const employee = lineItems?.[0]?.employee_id || preview?.items?.[0]?.employee_id;
      if (!employee) {
        alert('No employee found to seed salary structure. Generate preview first.');
        return;
      }

      const ctcAnnual = 1200000;
      await apiPost('/api/hrms/v2/payroll/salary-structures', {
        employee_id: employee,
        ctc_annual: ctcAnnual,
        effective_from: new Date().toLocaleDateString('en-CA'),
        components: [
          { component_name: 'Basic', component_type: 'wages', amount_monthly: 50000 },
          { component_name: 'HRA', component_type: 'allowance', amount_monthly: 25000 },
          { component_name: 'Special Allowance', component_type: 'allowance', amount_monthly: 25000 },
        ],
      });
      alert('Salary structure seeded for one employee.');
      await Promise.all([fetchPayrollData(), fetchPayrollInsights()]);
    } catch (err: any) {
      alert(`Failed to seed salary structure: ${err.message}`);
    } finally {
      setCreatingStructure(false);
    }
  };

  async function loadPayrollConfig() {
    try {
      const data = await apiGet('/api/hrms/v2/payroll/config');
      if (data) {
        setPayrollConfig({
          cycleStartDay: Number(data.cycleStartDay || 1),
          cutoffDay: Number(data.cutoffDay || 25),
          approvalRequired: Boolean(data.approvalRequired),
        });
      }
    } catch (error: any) {
      console.error('Failed to load payroll config:', error.message);
    }
  }

  async function fetchPayrollData() {
    setLoading(true);
    setExpandedRow(null);

    try {
      // 1. Check if a run exists for this month/year
      const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle();

      if (runError && !runError.message.toLowerCase().includes('no rows')) {
        throw runError;
      }

      setPayrollRun(run || null);

      // 2. If it exists, fetch the computed line items
      if (run) {
        // FIX: Added explicit relationship '!employment_history_employee_id_fkey'
        const { data: items, error } = await supabase
          .from('payroll_line_items')
          .select(`
            *,
            employees (
              first_name, 
              last_name, 
              employee_code, 
              employment_history!employment_history_employee_id_fkey(designation, effective_to)
            )
          `)
          .eq('payroll_run_id', run.id)
          .order('net_pay', { ascending: false });

        if (error) {
          console.error("Failed to fetch payroll items:", error);
        }

        const normalizedItems = (items || []).map((item: any) => {
          const emp = item?.employees || {};
          const first = String(emp?.first_name || item?.employee_name || '').trim();
          const last = String(emp?.last_name || '').trim();
          const displayName = `${first} ${last}`.trim() || `Employee ${String(item?.employee_id || '').slice(0, 8)}`;

          const gross = toAmount(item?.gross_earnings);
          const net = toAmount(item?.net_pay);
          const pfEmployee = toAmount(item?.pf_employee);
          const esiEmployee = toAmount(item?.esi_employee);
          const professionalTax = toAmount(item?.professional_tax);
          const tds = toAmount(item?.tds);
          const lwfEmployee = toAmount(item?.lwf_employee);

          const computedDeductions = pfEmployee + esiEmployee + professionalTax + tds + lwfEmployee;
          const normalizedNet = net > 0 ? net : Math.max(0, gross - computedDeductions);

          return {
            ...item,
            gross_earnings: gross,
            net_pay: normalizedNet,
            lop_days: toAmount(item?.lop_days),
            pf_employee: pfEmployee,
            esi_employee: esiEmployee,
            professional_tax: professionalTax,
            tds,
            lwf_employee: lwfEmployee,
            employees: {
              ...emp,
              first_name: first || displayName,
              last_name: last,
              employee_code: emp?.employee_code || item?.employee_code || null,
            },
            __display_name: displayName,
          };
        });

        setLineItems(normalizedItems);

        const { data: activeEmployees, error: activeEmpError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code, created_at, date_of_joining, salary_structures(id, effective_to)')
          .eq('status', 'active');

        if (activeEmpError) {
          console.error('Failed to fetch active employees for payroll coverage:', activeEmpError.message);
          setCoverage({ activeEmployees: 0, employeesInRun: normalizedItems.length, excludedEmployees: [] });
        } else {
          const inRunIds = new Set(normalizedItems.map((row: any) => String(row.employee_id || '')));
          const excluded = (activeEmployees || [])
            .filter((emp: any) => !inRunIds.has(String(emp.id || '')))
            .map((emp: any) => {
              const structures = Array.isArray(emp.salary_structures) ? emp.salary_structures : [];
              const hasActiveStructure = structures.some((s: any) => !s?.effective_to);
              const fullName = `${String(emp.first_name || '').trim()} ${String(emp.last_name || '').trim()}`.trim() || `Employee ${String(emp.id || '').slice(0, 8)}`;
              const runCreatedAt = payrollRun?.created_at ? new Date(String(payrollRun.created_at)).getTime() : 0;
              const empJoinTs = emp?.date_of_joining ? new Date(String(emp.date_of_joining)).getTime() : 0;
              const empCreatedTs = emp?.created_at ? new Date(String(emp.created_at)).getTime() : 0;
              const effectiveEmpTs = Math.max(empJoinTs || 0, empCreatedTs || 0);
              const addedAfterRun = runCreatedAt > 0 && effectiveEmpTs > runCreatedAt;

              let reason = 'No payroll line item generated';
              if (!hasActiveStructure) {
                reason = 'Missing active salary structure';
              } else if (addedAfterRun) {
                reason = 'Added after this payroll run was processed';
              }

              return {
                employee_id: String(emp.id),
                employee_name: fullName,
                employee_code: emp.employee_code || null,
                reason,
              };
            });

          setCoverage({
            activeEmployees: (activeEmployees || []).length,
            employeesInRun: normalizedItems.length,
            excludedEmployees: excluded,
          });
        }
      } else {
        setLineItems([]);
        setCoverage({ activeEmployees: 0, employeesInRun: 0, excludedEmployees: [] });
      }
    } catch (error: any) {
      console.error('Failed to fetch payroll data:', error?.message || error);
      setPayrollRun(null);
      setLineItems([]);
      setCoverage({ activeEmployees: 0, employeesInRun: 0, excludedEmployees: [] });
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  const savePayrollConfig = async () => {
    if (payrollConfig.cycleStartDay < 1 || payrollConfig.cycleStartDay > 28) {
      alert('Cycle start day must be between 1 and 28');
      return;
    }

    if (payrollConfig.cutoffDay < 1 || payrollConfig.cutoffDay > 31) {
      alert('Cutoff day must be between 1 and 31');
      return;
    }

    setSavingConfig(true);
    try {
      const updated = await apiPut('/api/hrms/v2/payroll/config', payrollConfig);
      setPayrollConfig(updated);
      alert('Payroll cycle settings saved.');
    } catch (error: any) {
      alert(`Failed to save payroll settings: ${error.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      const data = await apiPost('/api/hrms/v2/payroll/runs/preview', { month, year });
      setPreview(data);
    } catch (error: any) {
      alert(`Payroll preview failed: ${error.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    setIsProcessing(true);
    try {
      // Calls the massive Phase 1 Compliance Batch Processor
      const res = await fetch('/api/hr/process-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, user_id: null }) // Passing null for user_id in this demo
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const summary = result?.data;
      const summaryLine = summary
        ? `\nProcessed: ${summary.processed_employee_count}/${summary.active_employee_count}\nSkipped: ${summary.skipped_employee_count}`
        : '';
      alert(`${result.message || 'Payroll processed.'}${summaryLine}`);
      fetchPayrollData();
    } catch (error: any) {
      alert(`Payroll Processing Failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRunStatus = async (status: 'finalized' | 'paid') => {
    if (!payrollRun) return;

    const action = status === 'finalized' ? 'approve' : 'mark_paid';

    try {
      await apiPost(`/api/hrms/v2/payroll/runs/${payrollRun.id}/checkpoint`, { action });
      fetchPayrollData();
    } catch (error: any) {
      alert(`Failed to update payroll run: ${error.message}`);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Summary Math
  const totalGross = lineItems.reduce((sum, item) => sum + toAmount(item?.gross_earnings), 0);
  const totalNet = lineItems.reduce((sum, item) => sum + toAmount(item?.net_pay), 0);
  const totalDeductions = totalGross - totalNet;

  return (
    <div className="hrms-enterprise min-h-screen px-4 py-6 pb-24 md:px-8 md:py-8 font-sans">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
      <HRMSTopHeader
        title="Payroll"
        subtitle="Run payroll, finalize cycles, review structures, and generate payout artifacts."
      />

      <div className="mb-8 mt-4 flex justify-end">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ChevronDown size={16} className="rotate-90" />
          </button>
          <div className="w-32 text-center font-bold tracking-wide text-slate-800">
            {monthName} {year}
          </div>
          <button onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500 animate-pulse">Loading payroll data...</div>
      ) : (
        <>
          {/* CONTROL PANEL */}
          <div className="hrms-panel mb-8 flex flex-col items-center justify-between gap-6 rounded-3xl p-6 lg:flex-row">
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${!payrollRun ? 'bg-slate-300' : payrollRun.status === 'draft' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : payrollRun.status === 'finalized' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Current Status</p>
                <p className="text-lg font-bold capitalize text-slate-900">{payrollRun?.status || 'Not Started'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {(!payrollRun || payrollRun.status === 'draft') && (
                <button 
                  onClick={handleRunPayroll}
                  disabled={isProcessing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50 lg:flex-none"
                >
                  {isProcessing ? <><Clock size={18} className="animate-spin" /> Processing Engines...</> : <><Play size={18} /> {payrollRun ? 'Re-Run Calculations' : 'Generate Payroll'}</>}
                </button>
              )}
              
              {payrollRun?.status === 'draft' && (
                <button 
                  onClick={() => updateRunStatus('finalized')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-all hover:bg-emerald-500 lg:flex-none"
                >
                  <CheckCircle2 size={18} /> Finalize Register
                </button>
              )}

              {payrollRun?.status === 'finalized' && (
                <button 
                  onClick={() => updateRunStatus('paid')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-900 transition-all hover:bg-slate-50 lg:flex-none"
                >
                  <IndianRupee size={18} /> Mark as Paid
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <section className="hrms-panel rounded-3xl p-6">
              <h3 className="font-semibold text-lg mb-4">Payroll Cycle Config</h3>
              <p className="mb-4 text-sm text-slate-500">Set cycle policy and approval checkpoint behavior for payroll runs.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Cycle Start Day</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={payrollConfig.cycleStartDay}
                    onChange={(e) => setPayrollConfig((prev) => ({ ...prev, cycleStartDay: Number(e.target.value || 1) }))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Cutoff Day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={payrollConfig.cutoffDay}
                    onChange={(e) => setPayrollConfig((prev) => ({ ...prev, cutoffDay: Number(e.target.value || 25) }))}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700"
                  />
                </label>
                <label className="text-sm flex items-end">
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={payrollConfig.approvalRequired}
                      onChange={(e) => setPayrollConfig((prev) => ({ ...prev, approvalRequired: e.target.checked }))}
                    />
                    Require approval checkpoint
                  </span>
                </label>
              </div>
              <button
                onClick={savePayrollConfig}
                disabled={savingConfig}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Payroll Policy'}
              </button>
            </section>

            <section className="hrms-panel rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Run Preview</h3>
                  <p className="text-sm text-slate-500">Estimate totals before final approval for {monthName} {year}.</p>
                </div>
                <button
                  onClick={runPreview}
                  disabled={previewLoading}
                  className="rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {previewLoading ? 'Generating...' : 'Generate Preview'}
                </button>
              </div>

              {!preview ? (
                <p className="text-sm text-slate-500">No preview generated yet.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="text-slate-600">
                    Period: {preview.period.startDate} to {preview.period.endDate} | Employees: {preview.employeeCount}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-500">Gross</p>
                      <p className="mt-1 font-semibold text-slate-900">INR {preview.totals.gross.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-500">Deductions</p>
                      <p className="mt-1 font-semibold text-rose-600">INR {preview.totals.deductions.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-500">Net</p>
                      <p className="mt-1 font-semibold text-emerald-700">INR {preview.totals.net.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <section className="hrms-panel rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Payroll Dashboard Snapshot</h3>
                  <p className="text-sm text-slate-500">Run-level and deduction-wise distribution for current period.</p>
                </div>
                <button onClick={fetchPayrollInsights} disabled={loadingInsights} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  {loadingInsights ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {!dashboard ? (
                <p className="text-sm text-slate-500">No dashboard data available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Run Status</p>
                    <p className="mt-1 font-semibold capitalize text-slate-900">{dashboard.run?.status || 'not_started'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Employees</p>
                    <p className="mt-1 font-semibold text-slate-900">{dashboard.employeeCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">TDS/PF/ESI/PT</p>
                    <p className="mt-1 font-semibold text-slate-900">₹ {(dashboard.totals.tds + dashboard.totals.pf + dashboard.totals.esi + dashboard.totals.pt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}

              {dashboard && (
                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  <p>Trend (last months): {dashboard.trend.map((row) => `${String(row.month).padStart(2, '0')}/${row.year}`).join(', ') || 'No trend data'}</p>
                  <p>Status Counts: draft {dashboard.statusCounts?.draft || 0} | finalized {dashboard.statusCounts?.finalized || 0} | paid {dashboard.statusCounts?.paid || 0}</p>
                </div>
              )}
            </section>

            <section className="hrms-panel rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Payroll Report Insights</h3>
                  <p className="text-sm text-slate-500">Monthly and top employee payout summary for leadership review.</p>
                </div>
                <button onClick={seedSalaryStructure} disabled={creatingStructure} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs text-white hover:bg-cyan-600 disabled:opacity-50">
                  {creatingStructure ? 'Seeding...' : 'Seed Structure'}
                </button>
              </div>

              {!report ? (
                <p className="text-sm text-slate-500">No report data available.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Latest Monthly Summary</p>
                    {report.monthlySummary?.[0] ? (
                      <p className="mt-1">
                        {String(report.monthlySummary[0].month).padStart(2, '0')}/{report.monthlySummary[0].year} | Gross ₹ {report.monthlySummary[0].gross.toLocaleString('en-IN')} | Net ₹ {report.monthlySummary[0].net.toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-500">No monthly summary rows.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Top Paid Employee (Current Filter)</p>
                    {report.employeeSummary?.[0] ? (
                      <p className="mt-1">{report.employeeSummary[0].employee_name} | Net ₹ {report.employeeSummary[0].net.toLocaleString('en-IN')}</p>
                    ) : (
                      <p className="mt-1 text-slate-500">No employee summary rows.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* SUMMARY CARDS */}
          {lineItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Total Gross Pay</p>
                <p className="flex items-center text-3xl font-bold text-slate-900"><IndianRupee size={24} className="mr-1 text-slate-500"/> {totalGross.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Total Deductions (Taxes/PF)</p>
                <p className="flex items-center text-3xl font-bold text-rose-600"><IndianRupee size={24} className="mr-1 opacity-70"/> {totalDeductions.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Total Net Disbursement</p>
                <p className="flex items-center text-3xl font-bold text-emerald-700"><IndianRupee size={24} className="mr-1 opacity-70"/> {totalNet.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}

          {payrollRun && (
            <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-amber-900">Payroll Coverage Check</h3>
                <p className="text-sm font-semibold text-amber-800">
                  In run: {coverage.employeesInRun} / Active: {coverage.activeEmployees}
                </p>
              </div>
              {coverage.excludedEmployees.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">All active employees are included in this payroll run.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-amber-800">
                    {coverage.excludedEmployees.length} active employee(s) are excluded from this run.
                  </p>
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-amber-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-amber-50 text-xs uppercase tracking-wide text-amber-700">
                        <tr>
                          <th className="px-3 py-2">Employee</th>
                          <th className="px-3 py-2">Code</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverage.excludedEmployees.map((emp) => (
                          <tr key={emp.employee_id} className="border-t border-amber-100">
                            <td className="px-3 py-2 font-medium text-slate-900">{emp.employee_name}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.employee_code || '-'}</td>
                            <td className="px-3 py-2 text-amber-800">{emp.reason}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => openSalarySetup(emp.employee_id)}
                                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                {emp.reason === 'Missing active salary structure' ? 'Fix Now' : 'Review'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* DETAILED LINE ITEMS */}
          {lineItems.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 font-bold text-slate-600">Employee</th>
                      <th className="p-4 font-bold text-slate-600">LOP Days</th>
                      <th className="p-4 text-right font-bold text-slate-600">Gross (₹)</th>
                      <th className="p-4 text-right font-bold text-rose-600">Deductions (₹)</th>
                      <th className="p-4 text-right font-bold text-emerald-700">Net Pay (₹)</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                 <tbody className="divide-y divide-slate-200">
  {lineItems.map((item) => {
    const emp = item.employees;
    // Added safety check for employment_history mapping
    const activeRole = emp?.employment_history?.find((h:any) => h.effective_to === null)?.designation || "Unassigned";
    const itemDeductions = toAmount(item?.gross_earnings) - toAmount(item?.net_pay);
    const isExpanded = expandedRow === item.id;
    const breakdown = item.calculation_breakdown;

    return (
      <React.Fragment key={item.id}>
        <tr 
          className="group cursor-pointer transition-colors hover:bg-slate-50" 
          onClick={() => setExpandedRow(isExpanded ? null : item.id)}
        >
          <td className="p-4">
            <div className="font-bold">{item.__display_name || `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim()}</div>
            <div className="text-xs text-slate-500">{activeRole} • {emp?.employee_code}</div>
          </td>
                            <td className="p-4">
                              {item.lop_days > 0 ? (
                                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{item.lop_days}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-700">{toAmount(item?.gross_earnings).toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right font-mono text-rose-600">{itemDeductions.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-700">{toAmount(item?.net_pay).toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right text-slate-500">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                          </tr>
                          
                          {/* EXPANDED BREAKDOWN */}
                          {isExpanded && breakdown && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={6} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                  
                                  {/* Wage Base Integrity */}
                                  <div>
                                    <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                      <FileText size={14}/> Wage Floor Integrity
                                    </h4>
                                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Statutory Wage Base:</span>
                                        <span className="font-mono">{item.wage_base.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Floor Compliant:</span>
                                        {breakdown.wage_floor_compliant ? (
                                          <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={12}/> PASS</span>
                                        ) : (
                                          <span className="text-amber-400 flex items-center gap-1 text-xs font-bold"><AlertCircle size={12}/> ADJUSTED</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Earnings Breakdown */}
                                  <div>
                                    <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-700">Earnings</h4>
                                    <div className="space-y-2">
                                      {breakdown.components?.map((c:any, idx:number) => (
                                        <div key={idx} className="flex justify-between border-b border-slate-200 pb-1 text-sm">
                                          <span className="text-slate-600">{c.component_name}</span>
                                          <span className="font-mono text-slate-800">{c.amount_monthly.toLocaleString('en-IN')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Deductions Breakdown */}
                                  <div>
                                    <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">Deductions</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between border-b border-slate-200 pb-1 text-sm">
                                        <span className="text-slate-600">Provident Fund (PF)</span>
                                        <span className="font-mono text-rose-600">{item.pf_employee.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-200 pb-1 text-sm">
                                        <span className="text-slate-600">ESI Contribution</span>
                                        <span className="font-mono text-rose-600">{item.esi_employee.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-slate-200 pb-1 text-sm">
                                        <span className="text-slate-600">Professional Tax (PT)</span>
                                        <span className="font-mono text-rose-600">{item.professional_tax.toLocaleString('en-IN')}</span>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!payrollRun && !loading && (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FileText size={24} className="text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">No Draft for {monthName}</h3>
              <p className="mx-auto mb-6 max-w-sm text-slate-500">Hit "Generate Payroll" above to run the compliance engines and calculate the initial register.</p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}