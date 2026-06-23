"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, Sparkles, X } from "lucide-react";

export default function RecruitmentPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role_applied_for: ""
  });

  useEffect(() => { fetchCandidates(); }, []);

  async function fetchCandidates() {
    const { data } = await supabase.from("candidates").select("*");
    if (data) setCandidates(data);
  }

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();

    const { error } = await supabase.from("candidates").insert([{ 
      name: fullName, 
      email: formData.email, 
      role_applied: formData.role_applied_for,
      stage: "Applied"
    }]);

    if (error) {
      alert("Error adding candidate: " + error.message);
    } else {
      setShowAddModal(false);
      setFormData({ first_name: "", last_name: "", email: "", role_applied_for: "" });
      fetchCandidates();
    }
    setIsSubmitting(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/hr/parse-resume', { method: 'POST', body: formData });
      await res.json();
      
      await supabase.from("candidates").insert([{
        name: "New Candidate (Parsed)", 
        email: "candidate@example.com", 
        role_applied: "Marketing Lead",  
        stage: "Applied"
      }]);
      
      fetchCandidates();
    } catch (err) {
      alert("Parsing failed.");
    } finally {
      setIsParsing(false);
    }
  };

  async function hireCandidate(candidate: any) {
    setProcessingId(candidate.id);
    const nameParts = candidate.name ? candidate.name.split(' ') : ['Unknown'];
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || '';

    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    const join_date = d.toISOString().split('T')[0];

    try {
      const response = await fetch('/api/hr/hire-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name,
          last_name,
          email: candidate.email || 'pending@example.com',
          phone: candidate.phone || 'PENDING',
          designation: candidate.role_applied || 'Unassigned',
          department: 'Unassigned',
          join_date
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to bridge candidate");

      await supabase.from("candidates").update({ stage: "onboarding" }).eq("id", candidate.id);
      
      alert(`Success! Employee bridged. Redirecting to Onboarding...`);
      router.push('/team/onboarding');

    } catch (error: any) {
      alert(`Handoff Failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-white/40 text-sm mt-1">Manage the lifecycle from applicant to hire.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/5"
          >
            <Plus size={16} /> Add Candidate
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isParsing}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isParsing ? "Parsing..." : <><Sparkles size={16} /> AI Parse Resume</>}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf" />
        </div>
      </div>

      {/* PIPELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Applied', 'Interviewing', 'Offered', 'Hired'].map(stage => (
          <div key={stage} className="bg-[#0d0e12] p-4 rounded-2xl border border-white/5 min-h-[60vh]">
            <h3 className="font-bold text-white/40 uppercase text-xs mb-4 flex justify-between">
              {stage} 
              <span className="bg-white/5 px-2 py-0.5 rounded text-[10px]">
                {candidates.filter(c => c.stage === stage).length}
              </span>
            </h3>
            
            {candidates.filter(c => c.stage === stage).map(c => (
              <div key={c.id} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 mb-3 hover:border-violet-500/30 transition-all">
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-white/40 mb-3">{c.role_applied}</p>
                
                {/* STAGE SWITCHER DROPDOWN */}
                <select 
                  value={c.stage}
                  onChange={async (e) => {
                    const newStage = e.target.value;
                    setCandidates(prev => prev.map(cand => cand.id === c.id ? {...cand, stage: newStage} : cand));
                    await supabase.from("candidates").update({ stage: newStage }).eq("id", c.id);
                  }}
                  className="w-full bg-black/50 border border-white/10 text-white text-[10px] p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                </select>

                {/* THE HIRE BUTTON */}
                {stage === 'Offered' && (
                  <button 
                    onClick={() => hireCandidate(c)} 
                    disabled={processingId === c.id}
                    className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-wait text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                  >
                    {processingId === c.id ? "Bridging..." : <><UserPlus size={12} /> Hire Now</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ADD CANDIDATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add New Candidate</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-1">First Name</label>
                  <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-1">Last Name</label>
                  <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase mb-1">Role Applied For</label>
                <input required type="text" value={formData.role_applied_for} onChange={e => setFormData({...formData, role_applied_for: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none" />
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold">
                  {isSubmitting ? 'Saving...' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}