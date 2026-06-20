"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Clock, Send, FileCheck, X, FileText } from "lucide-react";

export default function OnboardingPage() {
  const [onboardingEmps, setOnboardingEmps] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  useEffect(() => {
    fetchOnboarding();
  }, []);

  async function fetchOnboarding() {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("status", "Onboarding");
    if (data) setOnboardingEmps(data);
  }

  const handleCompleteOnboarding = async (id: string) => {
    await supabase.from("employees").update({ status: "Active" }).eq("id", id);
    setSelectedEmp(null);
    fetchOnboarding();
  };

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">Onboarding Control Center</h1>

      <div className="grid gap-4">
        {onboardingEmps.map(emp => (
          <div key={emp.id} className="bg-[#0d0e12] p-6 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">{emp.full_name}</h2>
              <p className="text-sm text-white/40">{emp.role}</p>
            </div>
            <button 
              onClick={() => setSelectedEmp(emp)}
              className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl text-xs font-bold"
            >
              Review Requirements
            </button>
          </div>
        ))}
      </div>

      {/* CHECKLIST MODAL */}
     {/* CHECKLIST MODAL */}
{selectedEmp && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-xl text-white">Review {selectedEmp.full_name}</h2>
        <button onClick={() => setSelectedEmp(null)}><X size={20} className="text-white/40"/></button>
      </div>

      <div className="space-y-3 mb-8">
        {[
          { label: 'Government ID', file: 'id_document.pdf' },
          { label: 'Employment Contract', file: 'contract.pdf' },
          { label: 'Bank Details', file: 'bank_details.pdf' }
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 group">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {/* The "View Document" Action */}
            <a 
              href={`/api/documents/view/${selectedEmp.id}/${item.file}`} 
              target="_blank"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 underline"
            >
              View Document
            </a>
          </div>
        ))}
      </div>

      <button 
        onClick={() => handleCompleteOnboarding(selectedEmp.id)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-emerald-500/20"
      >
        Finalize & Activate Employee
      </button>
    </div>
  </div>
)}
    </div>
  );
}