"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IndianRupee, Play, CheckCircle2, FileText, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

export default function PayrollPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const month = currentDate.getMonth() + 1; // 1-12
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    fetchPayrollData();
  }, [month, year]);

  async function fetchPayrollData() {
    setLoading(true);
    setExpandedRow(null);
    
    // 1. Check if a run exists for this month/year
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('period_month', month)
      .eq('period_year', year)
      .single();

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
        
      setLineItems(items || []);
    } else {
      setLineItems([]);
    }
    
    setLoading(false);
  }

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
      
      alert(result.message);
      fetchPayrollData();
    } catch (error: any) {
      alert(`Payroll Processing Failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRunStatus = async (status: 'finalized' | 'paid') => {
    if (!payrollRun) return;
    const { error } = await supabase
      .from('payroll_runs')
      .update({ status, finalized_at: status === 'finalized' ? new Date().toISOString() : payrollRun.finalized_at })
      .eq('id', payrollRun.id);
      
    if (error) alert("Failed to update status.");
    else fetchPayrollData();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Summary Math
  const totalGross = lineItems.reduce((sum, item) => sum + item.gross_earnings, 0);
  const totalNet = lineItems.reduce((sum, item) => sum + item.net_pay, 0);
  const totalDeductions = totalGross - totalNet;

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Processing</h1>
          <p className="text-white/40 mt-1">Execute deterministic wage calculations and generate payslips.</p>
        </div>
        
        {/* Month Selector */}
        <div className="flex items-center gap-4 bg-[#0d0e12] border border-white/10 px-2 py-1.5 rounded-xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
            <ChevronDown size={16} className="rotate-90" />
          </button>
          <div className="w-32 text-center font-bold tracking-wide">
            {monthName} {year}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-white/40 animate-pulse">Loading payroll data...</div>
      ) : (
        <>
          {/* CONTROL PANEL */}
          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl mb-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${!payrollRun ? 'bg-white/20' : payrollRun.status === 'draft' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : payrollRun.status === 'finalized' ? 'bg-violet-400' : 'bg-emerald-400'}`} />
              <div>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Current Status</p>
                <p className="font-bold text-lg capitalize">{payrollRun?.status || 'Not Started'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {(!payrollRun || payrollRun.status === 'draft') && (
                <button 
                  onClick={handleRunPayroll}
                  disabled={isProcessing}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-500/20"
                >
                  {isProcessing ? <><Clock size={18} className="animate-spin" /> Processing Engines...</> : <><Play size={18} /> {payrollRun ? 'Re-Run Calculations' : 'Generate Payroll'}</>}
                </button>
              )}
              
              {payrollRun?.status === 'draft' && (
                <button 
                  onClick={() => updateRunStatus('finalized')}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={18} /> Finalize Register
                </button>
              )}

              {payrollRun?.status === 'finalized' && (
                <button 
                  onClick={() => updateRunStatus('paid')}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-xl font-bold transition-all shadow-lg shadow-white/10"
                >
                  <IndianRupee size={18} /> Mark as Paid
                </button>
              )}
            </div>
          </div>

          {/* SUMMARY CARDS */}
          {lineItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Total Gross Pay</p>
                <p className="text-3xl font-bold flex items-center"><IndianRupee size={24} className="mr-1 text-white/40"/> {totalGross.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Total Deductions (Taxes/PF)</p>
                <p className="text-3xl font-bold text-rose-400 flex items-center"><IndianRupee size={24} className="mr-1 opacity-50"/> {totalDeductions.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl border border-emerald-500/20 shadow-xl">
                <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest mb-2">Total Net Disbursement</p>
                <p className="text-3xl font-bold text-emerald-400 flex items-center"><IndianRupee size={24} className="mr-1 opacity-50"/> {totalNet.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}

          {/* DETAILED LINE ITEMS */}
          {lineItems.length > 0 && (
            <div className="bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="p-4 font-bold text-white/60">Employee</th>
                      <th className="p-4 font-bold text-white/60">LOP Days</th>
                      <th className="p-4 font-bold text-white/60 text-right">Gross (₹)</th>
                      <th className="p-4 font-bold text-white/60 text-right text-rose-400/80">Deductions (₹)</th>
                      <th className="p-4 font-bold text-white/60 text-right text-emerald-400/80">Net Pay (₹)</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                 <tbody className="divide-y divide-white/5">
  {lineItems.map((item) => {
    const emp = item.employees;
    // Added safety check for employment_history mapping
    const activeRole = emp?.employment_history?.find((h:any) => h.effective_to === null)?.designation || "Unassigned";
    const itemDeductions = item.gross_earnings - item.net_pay;
    const isExpanded = expandedRow === item.id;
    const breakdown = item.calculation_breakdown;

    return (
      <React.Fragment key={item.id}>
        <tr 
          className="hover:bg-white/[0.02] transition-colors group cursor-pointer" 
          onClick={() => setExpandedRow(isExpanded ? null : item.id)}
        >
          <td className="p-4">
            <div className="font-bold">{emp?.first_name} {emp?.last_name}</div>
            <div className="text-xs text-white/40">{activeRole} • {emp?.employee_code}</div>
          </td>
                            <td className="p-4">
                              {item.lop_days > 0 ? (
                                <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded font-bold text-xs">{item.lop_days}</span>
                              ) : (
                                <span className="text-white/20">-</span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-white/80">{item.gross_earnings.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right font-mono text-rose-400/80">{itemDeductions.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400">{item.net_pay.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right text-white/40">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                          </tr>
                          
                          {/* EXPANDED BREAKDOWN */}
                          {isExpanded && breakdown && (
                            <tr className="bg-black/40">
                              <td colSpan={6} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                  
                                  {/* Wage Base Integrity */}
                                  <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                                      <FileText size={14}/> Wage Floor Integrity
                                    </h4>
                                    <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/5">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-white/60">Statutory Wage Base:</span>
                                        <span className="font-mono">{item.wage_base.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-white/60">Floor Compliant:</span>
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
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400/60 mb-3">Earnings</h4>
                                    <div className="space-y-2">
                                      {breakdown.components?.map((c:any, idx:number) => (
                                        <div key={idx} className="flex justify-between text-sm border-b border-white/5 pb-1">
                                          <span className="text-white/60">{c.component_name}</span>
                                          <span className="font-mono text-white/80">{c.amount_monthly.toLocaleString('en-IN')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Deductions Breakdown */}
                                  <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-rose-400/60 mb-3">Deductions</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm border-b border-white/5 pb-1">
                                        <span className="text-white/60">Provident Fund (PF)</span>
                                        <span className="font-mono text-rose-400/80">{item.pf_employee.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-sm border-b border-white/5 pb-1">
                                        <span className="text-white/60">ESI Contribution</span>
                                        <span className="font-mono text-rose-400/80">{item.esi_employee.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-sm border-b border-white/5 pb-1">
                                        <span className="text-white/60">Professional Tax (PT)</span>
                                        <span className="font-mono text-rose-400/80">{item.professional_tax.toLocaleString('en-IN')}</span>
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
            <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl mt-8">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-white/40" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Draft for {monthName}</h3>
              <p className="text-white/40 max-w-sm mx-auto mb-6">Hit "Generate Payroll" above to run the compliance engines and calculate the initial register.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}