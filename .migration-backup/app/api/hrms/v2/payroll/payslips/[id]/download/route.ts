import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { jsPDF } from 'jspdf';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatMonthYear(month: number | null | undefined, year: number | null | undefined) {
  if (!month || !year) return '-';
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ── RGB helpers ──────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const BRAND_DARK:    RGB = [15,  23,  42];   // #0f172a
const BRAND_INDIGO:  RGB = [79,  70, 229];   // #4f46e5
const BRAND_VIOLET:  RGB = [124,  58, 237];  // #7c3aed
const BRAND_CYAN:    RGB = [6,  182, 212];   // #06b6d4
const BRAND_EMERALD: RGB = [16, 185, 129];   // #10b981
const BRAND_ROSE:    RGB = [244,  63,  94];  // #f43f5e
const BRAND_AMBER:   RGB = [245, 158,  11];  // #f59e0b
const WHITE:         RGB = [255, 255, 255];
const SLATE_100:     RGB = [241, 245, 249];
const SLATE_200:     RGB = [226, 232, 240];
const SLATE_400:     RGB = [148, 163, 184];
const SLATE_700:     RGB = [51,  65,  85];

function setFill(doc: jsPDF, rgb: RGB) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setTxt(doc: jsPDF, rgb: RGB)  { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setDrw(doc: jsPDF, rgb: RGB)  { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from('payroll_line_items')
    .select(
      'id, employee_id, gross_earnings, pf_employee, esi_employee, professional_tax, tds, lwf_employee, lop_days, net_pay, calculation_breakdown, payroll_runs(period_month, period_year, status), employees(first_name, last_name, employee_code)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Payslip not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId || scope.employeeId !== data.employee_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['finalized', 'paid'].includes(String(data.payroll_runs?.status || '').toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Payslip is not available yet' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const name       = `${data.employees?.first_name || ''} ${data.employees?.last_name || ''}`.trim() || data.employees?.employee_code || data.employee_id;
  const empCode    = data.employees?.employee_code || '-';
  const month      = String(data.payroll_runs?.period_month || '').padStart(2, '0');
  const year       = data.payroll_runs?.period_year || '';
  const periodLabel = formatMonthYear(data.payroll_runs?.period_month, data.payroll_runs?.period_year);
  const runStatus  = String(data.payroll_runs?.status || '').toUpperCase();

  const earningsRows: Array<{ label: string; amount: number }> =
    Array.isArray((data as any).calculation_breakdown?.components) && (data as any).calculation_breakdown.components.length > 0
      ? (data as any).calculation_breakdown.components.map((c: any) => ({
          label: String(c.component_name || 'Component'),
          amount: Number(c.amount_monthly || 0),
        }))
      : [{ label: 'Gross Earnings', amount: Number(data.gross_earnings || 0) }];

  const deductionRows = [
    { label: 'Provident Fund (PF)', amount: Number(data.pf_employee    || 0) },
    { label: 'ESI',                 amount: Number(data.esi_employee    || 0) },
    { label: 'Professional Tax',   amount: Number(data.professional_tax || 0) },
    { label: 'TDS / Income Tax',   amount: Number(data.tds             || 0) },
    { label: 'Labour Welfare Fund',amount: Number(data.lwf_employee    || 0) },
  ].filter((r) => r.amount > 0);

  const totalEarnings   = earningsRows.reduce((s, r) => s + r.amount, 0);
  const totalDeductions = deductionRows.reduce((s, r) => s + r.amount, 0);
  const netPay          = Number(data.net_pay || 0);

  // ── Document setup ─────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 595
  const PH  = doc.internal.pageSize.getHeight();  // 842
  const M   = 32; // margin

  // ── 1. Dark header band ────────────────────────────────────────────────────
  setFill(doc, BRAND_DARK);
  doc.rect(0, 0, PW, 88, 'F');

  // Gradient accent stripe (left edge)
  setFill(doc, BRAND_INDIGO);
  doc.rect(0, 0, 5, 88, 'F');

  // Company name
  setTxt(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('LEADFLOW AI', M, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setTxt(doc, SLATE_400);
  doc.text('Human Resources · Payroll Department', M, 50);

  // PAYSLIP label (right-aligned)
  setTxt(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PAYSLIP', PW - M, 34, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTxt(doc, SLATE_400);
  doc.text(periodLabel, PW - M, 50, { align: 'right' });

  // Run-status pill
  const pillColor: RGB = runStatus === 'PAID' ? BRAND_EMERALD : runStatus === 'FINALIZED' ? BRAND_CYAN : BRAND_AMBER;
  setFill(doc, pillColor);
  const pillW = 54; const pillH = 16;
  doc.roundedRect(PW - M - pillW, 58, pillW, pillH, 4, 4, 'F');
  setTxt(doc, WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(runStatus, PW - M - pillW / 2, 58 + pillH / 2 + 3, { align: 'center' });

  // ── 2. Employee info card ──────────────────────────────────────────────────
  const infoTop = 104;
  setFill(doc, SLATE_100);
  doc.roundedRect(M, infoTop, PW - M * 2, 72, 6, 6, 'F');
  setDrw(doc, SLATE_200);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, infoTop, PW - M * 2, 72, 6, 6);

  // Avatar circle
  setFill(doc, BRAND_INDIGO);
  doc.circle(M + 28, infoTop + 36, 20, 'F');
  setTxt(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const initials = `${(data.employees?.first_name || '?').charAt(0)}${(data.employees?.last_name || '?').charAt(0)}`.toUpperCase();
  doc.text(initials, M + 28, infoTop + 36 + 4.5, { align: 'center' });

  // Employee details (left column)
  const infoX = M + 58;
  setTxt(doc, SLATE_700);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(name, infoX, infoTop + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setTxt(doc, SLATE_400);
  doc.text(`Employee Code: ${empCode}`, infoX, infoTop + 36);
  doc.text(`Payslip ID: ${data.id}`, infoX, infoTop + 49);

  // Right column
  const infoR = PW - M - 16;
  setTxt(doc, SLATE_700);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Pay Period', infoR - 80, infoTop + 22);
  doc.text('LOP Days', infoR - 80, infoTop + 36);
  doc.text('Department', infoR - 80, infoTop + 49);

  doc.setFont('helvetica', 'normal');
  setTxt(doc, SLATE_700);
  doc.text(periodLabel, infoR, infoTop + 22, { align: 'right' });
  doc.text(String(Number(data.lop_days || 0)), infoR, infoTop + 36, { align: 'right' });
  doc.text('—', infoR, infoTop + 49, { align: 'right' });

  // ── 3. Table section ──────────────────────────────────────────────────────
  const tTop     = infoTop + 90;
  const halfW    = (PW - M * 2 - 10) / 2;
  const earX     = M;
  const dedX     = M + halfW + 10;
  const rowH     = 22;
  const hdrH     = 26;

  // Earnings header
  setFill(doc, BRAND_INDIGO);
  doc.roundedRect(earX, tTop, halfW, hdrH, 4, 4, 'F');
  setTxt(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EARNINGS', earX + 12, tTop + 17);
  doc.text('AMOUNT (INR)', earX + halfW - 10, tTop + 17, { align: 'right' });

  // Deductions header
  setFill(doc, BRAND_ROSE);
  doc.roundedRect(dedX, tTop, halfW, hdrH, 4, 4, 'F');
  setTxt(doc, WHITE);
  doc.text('DEDUCTIONS', dedX + 12, tTop + 17);
  doc.text('AMOUNT (INR)', dedX + halfW - 10, tTop + 17, { align: 'right' });

  // Earnings rows
  let eY = tTop + hdrH;
  earningsRows.forEach((row, i) => {
    if (i % 2 === 0) { setFill(doc, WHITE); } else { setFill(doc, SLATE_100); }
    doc.rect(earX, eY, halfW, rowH, 'F');
    setTxt(doc, SLATE_700);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(row.label, earX + 12, eY + 15);
    doc.setFont('helvetica', 'bold');
    setTxt(doc, BRAND_DARK);
    doc.text(formatCurrency(row.amount), earX + halfW - 10, eY + 15, { align: 'right' });
    eY += rowH;
  });

  // Deductions rows
  let dY = tTop + hdrH;
  if (deductionRows.length === 0) {
    setFill(doc, WHITE);
    doc.rect(dedX, dY, halfW, rowH, 'F');
    setTxt(doc, SLATE_400);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('No deductions applicable', dedX + 12, dY + 15);
    dY += rowH;
  } else {
    deductionRows.forEach((row, i) => {
      if (i % 2 === 0) { setFill(doc, WHITE); } else { setFill(doc, SLATE_100); }
      doc.rect(dedX, dY, halfW, rowH, 'F');
      setTxt(doc, SLATE_700);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(row.label, dedX + 12, dY + 15);
      doc.setFont('helvetica', 'bold');
      setTxt(doc, BRAND_ROSE);
      doc.text(formatCurrency(row.amount), dedX + halfW - 10, dY + 15, { align: 'right' });
      dY += rowH;
    });
  }

  const tableBottom = Math.max(eY, dY);

  // Totals bar
  setFill(doc, SLATE_100);
  doc.rect(earX, tableBottom, halfW, rowH + 2, 'F');
  setFill(doc, SLATE_100);
  doc.rect(dedX, tableBottom, halfW, rowH + 2, 'F');
  setDrw(doc, SLATE_200);
  doc.setLineWidth(0.6);
  doc.line(earX, tableBottom, earX + halfW, tableBottom);
  doc.line(dedX, tableBottom, dedX + halfW, tableBottom);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setTxt(doc, SLATE_700);
  doc.text('Total Earnings', earX + 12, tableBottom + 15);
  setTxt(doc, BRAND_EMERALD);
  doc.text(formatCurrency(totalEarnings), earX + halfW - 10, tableBottom + 15, { align: 'right' });

  setTxt(doc, SLATE_700);
  doc.text('Total Deductions', dedX + 12, tableBottom + 15);
  setTxt(doc, BRAND_ROSE);
  doc.text(formatCurrency(totalDeductions), dedX + halfW - 10, tableBottom + 15, { align: 'right' });

  // ── 4. Net Pay strip ──────────────────────────────────────────────────────
  const npTop = tableBottom + rowH + 20;
  setFill(doc, BRAND_DARK);
  doc.roundedRect(M, npTop, PW - M * 2, 48, 8, 8, 'F');

  // Left accent bar inside net-pay strip
  setFill(doc, BRAND_CYAN);
  doc.roundedRect(M, npTop, 4, 48, 4, 4, 'F');

  setTxt(doc, SLATE_400);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('NET PAY (take-home)', M + 18, npTop + 19);

  setTxt(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`INR ${formatCurrency(netPay)}`, PW - M - 12, npTop + 30, { align: 'right' });

  // ── 5. Summary row (PF / ESI / PT / TDS) ─────────────────────────────────
  const summaryTop = npTop + 68;
  const summaryItems = [
    { label: 'PF (Employee)',   value: formatCurrency(Number(data.pf_employee    || 0)), color: BRAND_INDIGO },
    { label: 'ESI',             value: formatCurrency(Number(data.esi_employee   || 0)), color: BRAND_VIOLET },
    { label: 'Professional Tax',value: formatCurrency(Number(data.professional_tax || 0)), color: BRAND_AMBER },
    { label: 'TDS / Tax',       value: formatCurrency(Number(data.tds            || 0)), color: BRAND_ROSE },
  ];
  const boxW = (PW - M * 2 - 12) / 4;
  summaryItems.forEach((item, i) => {
    const bx = M + i * (boxW + 4);
    setFill(doc, SLATE_100);
    doc.roundedRect(bx, summaryTop, boxW, 44, 5, 5, 'F');
    setFill(doc, item.color);
    doc.roundedRect(bx, summaryTop, boxW, 4, 2, 2, 'F');
    setTxt(doc, SLATE_400);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(item.label.toUpperCase(), bx + boxW / 2, summaryTop + 18, { align: 'center' });
    setTxt(doc, SLATE_700);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`₹ ${item.value}`, bx + boxW / 2, summaryTop + 34, { align: 'center' });
  });

  // ── 6. Footer ──────────────────────────────────────────────────────────────
  const footerY = PH - 36;
  setDrw(doc, SLATE_200);
  doc.setLineWidth(0.4);
  doc.line(M, footerY - 8, PW - M, footerY - 8);
  setTxt(doc, SLATE_400);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(
    'This is a computer-generated payslip and does not require a signature. Confidential — for the recipient only.',
    PW / 2, footerY,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text('LeadFlow AI · HQ Branch', M, footerY);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, PW - M, footerY, { align: 'right' });

  const bytes    = doc.output('arraybuffer');
  const fileName = `payslip-${year}-${month}-${String(data.employees?.employee_code || data.employee_id).replace(/\s+/g, '-')}.pdf`;

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

