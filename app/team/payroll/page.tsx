"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Download, RefreshCw, FileSpreadsheet, CheckCircle2, AlertCircle, Filter, Plus, X } from "lucide-react";

export default function PayrollPrepPage() {
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("All"); // All, Ready, Review
  
  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [adjustmentForm, setAdjustmentForm] = useState({ amount: "", type: "Bonus", description: "" });

  const currentCycle = "2026-06"; // June 2026 (based on your current environment)

  const fetchPayrollData = async () => {
    setLoading(true);
    
    // 1. Fetch active/onboarding employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*")
      .neq("status", "Offboarding");

    // 2. Fetch adjustments for the current cycle
    const { data: adjustments } = await supabase
      .from("payroll_adjustments")
      .select("*")
      .eq("cycle_month", currentCycle);

    if (employees) {
      // 3. Aggregate the data (The "Payroll Engine")
      const aggregatedData = employees.map(emp => {
        const empAdjustments = adjustments?.filter(adj => adj.employee_id === emp.id) || [];
        
        // Calculate Base (Assuming Monthly cycle from Annual Salary)
        const annualSalary = Number(emp.salary) || 0;
        const baseMonthly = Math.round(annualSalary / 12);
        
        // Calculate Additions/Deductions
        let additions = 0;
        let deductions = 0;
        
        empAdjustments.forEach(adj => {
          if (adj.type === "Deduction") deductions += Number(adj.amount);
          else additions += Number(adj.amount);
        });

        const periodGross = baseMonthly + additions - deductions;
        
        // Logic: If salary is 0, it needs HR review. 
        const status = annualSalary > 0 ? "Ready" : "Review Hours/Pay";

        return {
          ...emp,
          baseMonthly,
          additions,
          deductions,
          periodGross,
          status,
          adjustments: empAdjustments
        };
      });

      setPayrollData(aggregatedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await fetchPayrollData();
    setTimeout(() => setSyncing(false), 800); // UI feedback delay
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("payroll_adjustments").insert([{
      employee_id: selectedEmpId,
      cycle_month: currentCycle,
      amount: Number(adjustmentForm.amount),
      type: adjustmentForm.type,
      description: adjustmentForm.description
    }]);
    
    setIsAdjustmentModalOpen(false);
    setAdjustmentForm({ amount: "", type: "Bonus", description: "" });
    handleSync();
  };

  // The Real CSV Export Function
  const exportToCSV = () => {
    const headers = ["Employee Name", "Role", "Annual Salary", "Monthly Base", "Additions", "Deductions", "Period Gross", "Status"];
    
    const csvRows = payrollData.map(row => [
      `"${row.full_name}"`,
      `"${row.role}"`,
      row.salary,
      row.baseMonthly,
      row.additions,
      row.deductions,
      row.periodGross,
      `"${row.status}"`
    ]);

    const csvContent = [headers.join(","), ...csvRows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_Export_${currentCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived Stats
  const totalGross = payrollData.reduce((sum, emp) => sum + emp.periodGross, 0);
  const needsReviewCount = payrollData.filter(emp => emp.status !== "Ready").length;
  
  // Filter Logic
  const filteredData = payrollData.filter(emp => {
    if (filter === "Ready") return emp.status === "Ready";
    if (filter === "Review") return emp.status !== "Ready";
    return true;
  });

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Preparation</h1>
          <p className="text-white/40 mt-1">Aggregate hours, salaries, and commissions for the current cycle.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin text-violet-400" : ""} /> 
            {syncing ? "Syncing..." : "Sync Data"}
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Estimated Gross Payroll</p>
          <p className="text-3xl font-bold text-white mb-2">
            ₹{totalGross.toLocaleString()}
          </p>
          {needsReviewCount > 0 ? (
             <p className="text-xs text-amber-400 flex items-center gap-1"><AlertCircle size={12}/> {needsReviewCount} records need review</p>
          ) : (
             <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> All records calculated</p>
          )}
        </div>
        
        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Team Members</p>
          <p className="text-3xl font-bold text-white mb-2">{payrollData.length}</p>
          <p className="text-xs text-white/40">Active payroll roster</p>
        </div>

        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-emerald-500/20 shadow-xl bg-gradient-to-br from-[#0d0e12] to-emerald-500/5">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Payroll Cycle</p>
          <p className="text-2xl font-bold text-white mb-1">June 2026</p>
          <p className="text-xs text-white/60">Closes in 9 days</p>
        </div>
      </div>

      {/* Payroll Roster Table */}
      <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
              <FileSpreadsheet size={16} /> Compensation Roster
            </h3>
            
            {/* Real HR Filters */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 p-1 rounded-lg">
              {['All', 'Ready', 'Review'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs font-medium bg-white/5 px-3 py-1 rounded-full text-white/60 border border-white/10">
            Cycle: 01 Jun - 30 Jun
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-white/40">Calculating payroll...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Monthly Base</th>
                  <th className="pb-3 font-medium">Adjustments</th>
                  <th className="pb-3 font-medium text-right">Period Gross</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4">
                      <div className="font-bold text-white">{record.full_name}</div>
                      <div className="text-xs text-white/40">{record.role}</div>
                    </td>
                    <td className="py-4 font-mono text-white/80">₹{record.baseMonthly.toLocaleString()}</td>
                    
                    <td className="py-4">
                      {record.additions > 0 && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded mr-2">+₹{record.additions.toLocaleString()}</span>}
                      {record.deductions > 0 && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">-₹{record.deductions.toLocaleString()}</span>}
                      {record.additions === 0 && record.deductions === 0 && <span className="text-xs text-white/20">—</span>}
                    </td>

                    <td className="py-4 font-mono font-bold text-emerald-400 text-right text-base">
                      ₹{record.periodGross.toLocaleString()}
                    </td>
                    
                    <td className="py-4 text-right flex justify-end">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        record.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {record.status === 'Ready' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {record.status}
                      </span>
                    </td>
                    
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => { setSelectedEmpId(record.id); setIsAdjustmentModalOpen(true); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-white/60 hover:text-white"
                        title="Add Bonus/Deduction"
                      >
                        <Plus size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="text-center py-10 text-white/40 text-sm">No records match this filter.</div>
            )}
          </div>
        )}
      </div>

      {/* ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h2 className="text-base font-bold text-white">Add Payroll Adjustment</h2>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddAdjustment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Adjustment Type</label>
                <select className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-violet-500/50" value={adjustmentForm.type} onChange={(e) => setAdjustmentForm({...adjustmentForm, type: e.target.value})}>
                  <option value="Bonus">Bonus</option>
                  <option value="Commission">Commission</option>
                  <option value="Reimbursement">Reimbursement</option>
                  <option value="Deduction">Deduction (Negative)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Amount (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input required type="number" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-violet-500/50" placeholder="5000" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm({...adjustmentForm, amount: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Description</label>
                <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-violet-500/50" placeholder="Q2 Performance Bonus" value={adjustmentForm.description} onChange={(e) => setAdjustmentForm({...adjustmentForm, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-violet-500 hover:bg-violet-600 text-white font-bold py-3 rounded-xl transition-all text-sm mt-2">
                Apply to Payroll
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}