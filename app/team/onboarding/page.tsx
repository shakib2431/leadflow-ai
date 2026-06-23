"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Clock, FileCheck, X, AlertCircle } from "lucide-react";

export default function HRTeamOnboardingPage() {
  const [onboardingEmps, setOnboardingEmps] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const [formData, setFormData] = useState({
    date_of_birth: "",
    gender: "Male",
    pan_number: "",
    aadhaar_number_masked: "",
    bank_account_number: "",
    bank_ifsc: "",
    ctc_annual: ""
  });

  useEffect(() => { fetchOnboarding(); }, []);

  async function fetchOnboarding() {
    // CRITICAL: Fetching from employees so we have the right ID
    const { data } = await supabase.from("employees").select("*").eq("status", "onboarding");
    if (data) setOnboardingEmps(data);
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivating(true);

    try {
      const res = await fetch('/api/hr/activate-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmp.id,
          ...formData,
          ctc_annual: Number(formData.ctc_annual)
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert(`Success! ${selectedEmp.first_name} is now Active.`);
      setSelectedEmp(null);
      fetchOnboarding();
    } catch (error: any) {
      alert(`Activation Failed: ${error.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-2">Onboarding Control Center</h1>
      <p className="text-white/40 mb-8">Finalize compliance data and activate pending hires.</p>

      <div className="grid gap-4 max-w-5xl">
        {onboardingEmps.map(emp => (
          <div key={emp.id} className="bg-[#0d0e12] p-6 rounded-2xl border border-white/5 flex items-center justify-between group">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-bold text-lg">{emp.first_name} {emp.last_name}</h2>
              </div>
              <div className="flex gap-4 text-sm text-white/40">
                <span>{emp.email}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedEmp(emp)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
            >
              <FileCheck size={14} /> Collect Data & Activate
            </button>
          </div>
        ))}

        {onboardingEmps.length === 0 && (
          <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-white/40">
            No pending employees in the onboarding pipeline.
          </div>
        )}
      </div>

      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-2xl p-8 my-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-xl">Activate {selectedEmp.first_name}</h2>
                <p className="text-xs text-white/40 mt-1">Fill missing statutory details</p>
              </div>
              <button onClick={() => setSelectedEmp(null)}><X size={20} className="text-white/40 hover:text-white"/></button>
            </div>

            <form onSubmit={handleActivate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Date of Birth</label>
                  <input required type="date" className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Gender</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">PAN Number</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm uppercase" onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Aadhaar (Last 4)</label>
                  <input required type="text" maxLength={4} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" onChange={e => setFormData({...formData, aadhaar_number_masked: `XXXX-XXXX-${e.target.value}`})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Bank Account No.</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" onChange={e => setFormData({...formData, bank_account_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Bank IFSC Code</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm uppercase" onChange={e => setFormData({...formData, bank_ifsc: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-violet-400">Initial Compensation</h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Annual CTC (₹)</label>
                  <input required type="number" className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm" onChange={e => setFormData({...formData, ctc_annual: e.target.value})} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isActivating}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
              >
                {isActivating ? "Activating..." : "Finalize & Activate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}