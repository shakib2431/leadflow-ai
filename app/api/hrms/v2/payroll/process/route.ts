import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

/**
 * Payroll processing with leave deduction, salary calculation, and tax computation
 */
async function handler(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    if (req.method === 'POST') {
      const { month, year, run_name } = await req.json();

      if (!month || !year) {
        return NextResponse.json({ error: 'month and year required' }, { status: 400 });
      }

      // Check if payroll already processed for this month
      const { data: existing } = await supabaseAdmin
        .from('payroll_runs')
        .select('id')
        .eq('month', month)
        .eq('year', year)
        .eq('status', 'processed')
        .single();

      if (existing) {
        return NextResponse.json(
          { error: `Payroll already processed for ${month}/${year}` },
          { status: 400 }
        );
      }

      // Create payroll run record
      const { data: payrollRun, error: runError } = await supabaseAdmin
        .from('payroll_runs')
        .insert({
          month,
          year,
          run_name: run_name || `Payroll ${month}/${year}`,
          status: 'processing',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      // Get all active employees
      const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, email, salary_structures(basic, hra, dearness_allowance, special_allowance)')
        .eq('archived_at', null)
        .eq('employment_status', 'active');

      if (empError) throw empError;

      const payslips = [];

      // Calculate payroll for each employee
      for (const emp of employees || []) {
        const salary = emp.salary_structures;
        if (!salary) continue;

        // Calculate gross salary
        const basic = salary.basic || 0;
        const hra = salary.hra || 0;
        const da = salary.dearness_allowance || 0;
        const sa = salary.special_allowance || 0;
        const grossSalary = basic + hra + da + sa;

        // Get approved leaves for the month (deduction)
        const { data: leaves } = await supabaseAdmin
          .from('leave_requests')
          .select('days_count')
          .eq('employee_id', emp.id)
          .eq('status', 'approved')
          .gte('start_date', `${year}-${String(month).padStart(2, '0')}-01`)
          .lte('end_date', `${year}-${String(month).padStart(2, '0')}-${getDaysInMonth(month, year)}`);

        const leaveDays = leaves?.reduce((sum: number, l: any) => sum + l.days_count, 0) || 0;
        const leaveDeduction = (leaveDays / 30) * basic;

        // Calculate taxes (simplified)
        const taxableAmount = grossSalary - leaveDeduction;
        const incomeTax = Math.max(0, (taxableAmount - 250000) * 0.20); // Simplified: 20% above 2.5L
        const esi = Math.min(20000, taxableAmount * 0.0075); // ESI capped at 20k
        const pf = Math.min(13500, (basic * 12) / 100); // PF capped at 13.5k
        const totalDeductions = incomeTax + esi + pf + leaveDeduction;

        const netSalary = grossSalary - totalDeductions;

        // Create payslip record
        const { data: payslip, error: slipError } = await supabaseAdmin
          .from('payslips')
          .insert({
            payroll_run_id: payrollRun.id,
            employee_id: emp.id,
            month,
            year,
            basic_salary: basic,
            hra,
            dearness_allowance: da,
            special_allowance: sa,
            gross_salary: grossSalary,
            leave_days: leaveDays,
            leave_deduction: leaveDeduction,
            income_tax: incomeTax,
            esi,
            pf,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            status: 'generated',
          })
          .select()
          .single();

        if (slipError) {
          console.error('Error creating payslip:', slipError);
          continue;
        }

        payslips.push(payslip);

        // Send payroll ready notification
        try {
          await sendNotificationEmail({
            event: 'payroll_ready',
            recipient_email: emp.email,
            recipient_name: emp.first_name,
            subject: `Your Payslip - ${month}/${year}`,
            data: {
              employee_name: emp.first_name,
              period: `${month}/${year}`,
              net_pay: netSalary.toFixed(2),
              payslip_link: `${process.env.NEXT_PUBLIC_APP_URL}/employee/payslips/${payslip.id}`,
            },
          });
        } catch (emailErr) {
          console.error('Failed to send payroll email:', emailErr);
        }
      }

      // Update payroll run status
      await supabaseAdmin
        .from('payroll_runs')
        .update({
          status: 'processed',
          total_employees: employees?.length || 0,
          total_payslips: payslips.length,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payrollRun.id);

      return NextResponse.json(
        { data: { payroll_run: payrollRun, payslips_generated: payslips.length } },
        { status: 201 }
      );
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const month = url.searchParams.get('month');
      const year = url.searchParams.get('year');

      let query = supabaseAdmin.from('payroll_runs').select('*').order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (month) query = query.eq('month', parseInt(month));
      if (year) query = query.eq('year', parseInt(year));

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export const GET = rateLimitMiddleware('payroll')(handler);
export const POST = rateLimitMiddleware('payroll')(handler);
