import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';

type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';

const POLICY: Record<LeaveType, { monthlyAccrual: number; annualCap: number | null }> = {
  casual: { monthlyAccrual: 1.5, annualCap: 18 },
  sick: { monthlyAccrual: 1, annualCap: 12 },
  earned: { monthlyAccrual: 1, annualCap: 12 },
  unpaid: { monthlyAccrual: 0, annualCap: null },
};

function toDateText(input: Date) {
  return input.toISOString().slice(0, 10);
}

function monthsElapsedInYear(startDate: Date, endDate: Date) {
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  if (startYear !== endYear) return 12;

  const monthDiff = endDate.getUTCMonth() - startDate.getUTCMonth();
  return Math.max(0, monthDiff + 1);
}

function normalizeLeaveType(value: unknown): LeaveType | null {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'casual' || text === 'sick' || text === 'earned' || text === 'unpaid') return text;
  return null;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  let employeeId = '';
  const url = new URL(req.url);
  const employeeIdParam = String(url.searchParams.get('employee_id') || '').trim();

  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });
    employeeId = scope.employeeId;
  } else {
    employeeId = employeeIdParam;
    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id is required for admin leave balance queries' }, { status: 422 });
    }
  }

  const { data: employee, error: employeeErr } = await supabaseAdmin
    .from('employees')
    .select('id, date_of_joining, joining_date, first_name, last_name, employee_code')
    .eq('id', employeeId)
    .maybeSingle();

  if (employeeErr) return NextResponse.json({ error: employeeErr.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const joiningText = String(employee.date_of_joining || employee.joining_date || '').trim();
  const joiningDate = joiningText ? new Date(`${joiningText}T00:00:00Z`) : yearStart;
  const accrualStart = joiningDate > yearStart ? joiningDate : yearStart;
  const elapsedMonths = monthsElapsedInYear(accrualStart, now);

  const { data: approvedRows, error: approvedErr } = await supabaseAdmin
    .from('leave_requests')
    .select('leave_type, days_count, start_date, status')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('start_date', toDateText(yearStart))
    .lte('start_date', toDateText(now));

  if (approvedErr) return NextResponse.json({ error: approvedErr.message }, { status: 500 });

  const { data: pendingRows, error: pendingErr } = await supabaseAdmin
    .from('leave_requests')
    .select('leave_type, days_count, status')
    .eq('employee_id', employeeId)
    .eq('status', 'pending');

  if (pendingErr) return NextResponse.json({ error: pendingErr.message }, { status: 500 });

  const usedByType: Record<LeaveType, number> = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
  for (const row of approvedRows || []) {
    const type = normalizeLeaveType((row as any).leave_type);
    if (!type) continue;
    usedByType[type] += Number((row as any).days_count || 0);
  }

  const pendingByType: Record<LeaveType, number> = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
  for (const row of pendingRows || []) {
    const type = normalizeLeaveType((row as any).leave_type);
    if (!type) continue;
    pendingByType[type] += Number((row as any).days_count || 0);
  }

  const balances = (Object.keys(POLICY) as LeaveType[]).map((type) => {
    const policy = POLICY[type];
    const accruedRaw = policy.monthlyAccrual * elapsedMonths;
    const accrued = policy.annualCap == null ? accruedRaw : Math.min(policy.annualCap, accruedRaw);
    const used = usedByType[type];
    const pending = pendingByType[type];
    const available = policy.annualCap == null ? null : Math.max(0, Number((accrued - used).toFixed(2)));

    return {
      leave_type: type,
      accrued: Number(accrued.toFixed(2)),
      used,
      pending,
      available,
      monthly_accrual: policy.monthlyAccrual,
      annual_cap: policy.annualCap,
    };
  });

  return NextResponse.json({
    data: {
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        employee_code: employee.employee_code,
      },
      accrual: {
        year: now.getUTCFullYear(),
        start_date: toDateText(accrualStart),
        elapsed_months: elapsedMonths,
      },
      balances,
    },
  });
}
