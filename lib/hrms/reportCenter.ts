import { supabaseAdmin } from '@/lib/supabase-admin';

export type ReportCenterFilters = {
  month: number;
  year: number;
  businessEntityId?: string;
  departmentId?: string;
  designationId?: string;
  employeeStatus?: string;
  includeArchived?: boolean;
};

type EmployeeRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  status?: string;
  business_entity_id?: string | null;
  department_id?: string | null;
  designation_id?: string | null;
};

function startEndDate(month: number, year: number) {
  const mm = String(month).padStart(2, '0');
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

export async function buildHRMSReportCenter(filters: ReportCenterFilters) {
  const month = Number(filters.month);
  const year = Number(filters.year);
  const { startDate, endDate } = startEndDate(month, year);

  let employeesQuery = supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, status, business_entity_id, department_id, designation_id, archived_at')
    .order('first_name', { ascending: true })
    .limit(2000);

  if (filters.businessEntityId) employeesQuery = employeesQuery.eq('business_entity_id', filters.businessEntityId);
  if (filters.departmentId) employeesQuery = employeesQuery.eq('department_id', filters.departmentId);
  if (filters.designationId) employeesQuery = employeesQuery.eq('designation_id', filters.designationId);
  if (filters.employeeStatus) employeesQuery = employeesQuery.eq('status', filters.employeeStatus);
  if (!filters.includeArchived) employeesQuery = employeesQuery.is('archived_at', null);

  const { data: employees, error: employeeError } = await employeesQuery;
  if (employeeError) throw new Error(employeeError.message);

  const employeeRows = (employees || []) as EmployeeRow[];
  const employeeIds = employeeRows.map((row) => String(row.id));
  const employeeMap = new Map(employeeRows.map((row) => [String(row.id), row]));

  const [attendanceRes, leaveRes, runsRes] = await Promise.all([
    employeeIds.length > 0
      ? supabaseAdmin
          .from('attendance_records')
          .select('employee_id, status, date')
          .in('employee_id', employeeIds)
          .gte('date', startDate)
          .lte('date', endDate)
      : Promise.resolve({ data: [], error: null } as any),
    employeeIds.length > 0
      ? supabaseAdmin
          .from('leave_requests')
          .select('employee_id, status, leave_type, start_date, end_date')
          .in('employee_id', employeeIds)
          .lte('start_date', endDate)
          .gte('end_date', startDate)
      : Promise.resolve({ data: [], error: null } as any),
    supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status')
      .eq('period_month', month)
      .eq('period_year', year),
  ]);

  if (attendanceRes.error) throw new Error(attendanceRes.error.message);
  if (leaveRes.error) throw new Error(leaveRes.error.message);
  if (runsRes.error) throw new Error(runsRes.error.message);

  const runIds = (runsRes.data || []).map((row: any) => String(row.id));

  const payrollRes =
    runIds.length > 0 && employeeIds.length > 0
      ? await supabaseAdmin
          .from('payroll_line_items')
          .select('employee_id, gross_earnings, net_pay, pf_employee, pf_employer, esi_employee, professional_tax, tds, payroll_run_id')
          .in('payroll_run_id', runIds)
          .in('employee_id', employeeIds)
      : ({ data: [], error: null } as any);

  if (payrollRes.error) throw new Error(payrollRes.error.message);

  const attendanceRows = attendanceRes.data || [];
  const leaveRows = leaveRes.data || [];
  const payrollRows = payrollRes.data || [];

  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  for (const row of attendanceRows) {
    const status = String(row.status || '').toLowerCase();
    if (status === 'present') presentCount += 1;
    else if (status === 'absent') absentCount += 1;
    else if (status === 'half_day') halfDayCount += 1;
  }

  let leavePending = 0;
  let leaveApproved = 0;
  let leaveRejected = 0;
  for (const row of leaveRows) {
    const status = String(row.status || '').toLowerCase();
    if (status === 'pending') leavePending += 1;
    else if (status === 'approved') leaveApproved += 1;
    else if (status === 'rejected') leaveRejected += 1;
  }

  const payrollTotals = payrollRows.reduce(
    (acc: any, row: any) => {
      acc.gross += Number(row.gross_earnings || 0);
      acc.net += Number(row.net_pay || 0);
      acc.pfEmployee += Number(row.pf_employee || 0);
      acc.pfEmployer += Number(row.pf_employer || 0);
      acc.esi += Number(row.esi_employee || 0);
      acc.pt += Number(row.professional_tax || 0);
      acc.tds += Number(row.tds || 0);
      return acc;
    },
    { gross: 0, net: 0, pfEmployee: 0, pfEmployer: 0, esi: 0, pt: 0, tds: 0 }
  );

  const departmentBreakdownMap = new Map<string, any>();
  for (const emp of employeeRows) {
    const deptId = String(emp.department_id || 'unassigned');
    if (!departmentBreakdownMap.has(deptId)) {
      departmentBreakdownMap.set(deptId, {
        department_id: deptId,
        employee_count: 0,
        attendance_present: 0,
        attendance_total: 0,
        payroll_net: 0,
      });
    }
    const bucket = departmentBreakdownMap.get(deptId);
    bucket.employee_count += 1;
  }

  for (const row of attendanceRows) {
    const emp = employeeMap.get(String(row.employee_id));
    const deptId = String(emp?.department_id || 'unassigned');
    const bucket = departmentBreakdownMap.get(deptId);
    if (!bucket) continue;
    bucket.attendance_total += 1;
    if (String(row.status || '').toLowerCase() === 'present') bucket.attendance_present += 1;
  }

  for (const row of payrollRows) {
    const emp = employeeMap.get(String(row.employee_id));
    const deptId = String(emp?.department_id || 'unassigned');
    const bucket = departmentBreakdownMap.get(deptId);
    if (!bucket) continue;
    bucket.payroll_net += Number(row.net_pay || 0);
  }

  const departmentBreakdown = Array.from(departmentBreakdownMap.values())
    .map((row) => ({
      ...row,
      present_rate_percent: row.attendance_total > 0 ? Number(((row.attendance_present / row.attendance_total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.payroll_net - a.payroll_net);

  const employeeContributionMap = new Map<string, any>();
  for (const row of payrollRows) {
    const empId = String(row.employee_id);
    const emp = employeeMap.get(empId);
    if (!employeeContributionMap.has(empId)) {
      employeeContributionMap.set(empId, {
        employee_id: empId,
        employee_name: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.employee_code || empId,
        employee_code: emp?.employee_code || null,
        net_pay: 0,
        gross_earnings: 0,
      });
    }
    const item = employeeContributionMap.get(empId);
    item.net_pay += Number(row.net_pay || 0);
    item.gross_earnings += Number(row.gross_earnings || 0);
  }

  const topEmployees = Array.from(employeeContributionMap.values()).sort((a, b) => b.net_pay - a.net_pay).slice(0, 20);

  const kpis = {
    employees_total: employeeRows.length,
    employees_active: employeeRows.filter((row) => String(row.status || '').toLowerCase() === 'active').length,
    attendance_present_count: presentCount,
    attendance_absent_count: absentCount,
    attendance_half_day_count: halfDayCount,
    leave_pending_count: leavePending,
    leave_approved_count: leaveApproved,
    leave_rejected_count: leaveRejected,
    payroll_gross_total: payrollTotals.gross,
    payroll_net_total: payrollTotals.net,
    payroll_pf_total: payrollTotals.pfEmployee + payrollTotals.pfEmployer,
    payroll_esi_total: payrollTotals.esi,
    payroll_professional_tax_total: payrollTotals.pt,
    payroll_tds_total: payrollTotals.tds,
  };

  return {
    filters: {
      month,
      year,
      business_entity_id: filters.businessEntityId || null,
      department_id: filters.departmentId || null,
      designation_id: filters.designationId || null,
      employee_status: filters.employeeStatus || null,
      include_archived: Boolean(filters.includeArchived),
      period_start: startDate,
      period_end: endDate,
    },
    kpis,
    departmentBreakdown,
    topEmployees,
    counts: {
      attendance_records: attendanceRows.length,
      leave_records: leaveRows.length,
      payroll_records: payrollRows.length,
    },
  };
}
