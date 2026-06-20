"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, UserPlus, Sparkles, Upload, FileText, X } from "lucide-react";

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCandidates(); }, []);

  async function fetchCandidates() {
    const { data } = await supabase.from("candidates").select("*");
    if (data) setCandidates(data);
  }

  // AI-Powered Resume Parser
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Send to our backend parser
      const res = await fetch('/api/hr/parse-resume', { method: 'POST', body: formData });
      const { text } = await res.json();

      // Here, you would normally send the 'text' to your AI Agent/Gemini to extract JSON
      // For now, we simulate the AI extraction with a prompt for the user
      console.log("AI Extracted Text:", text); 
      
      // Simulate adding the candidate
      await supabase.from("candidates").insert([{
        name: "New Candidate (Parsed)", // AI would populate this
        email: "candidate@example.com", // AI would populate this
        role_applied: "Marketing Lead",  // AI would populate this
        stage: "Applied"
      }]);
      
      fetchCandidates();
    } catch (err) {
      alert("Parsing failed. Check your API route.");
    } finally {
      setIsParsing(false);
    }
  };

  async function hireCandidate(candidate: any) {
    // 1. Move to Employees
    const { error } = await supabase.from("employees").insert([{
      full_name: candidate.name,
      email: candidate.email,
      role: candidate.role_applied,
      status: "Onboarding"
    }]);

    if (!error) {
      // 2. Update Candidate Stage
      await supabase.from("candidates").update({ stage: "Hired" }).eq("id", candidate.id);
      fetchCandidates();
    }
  }

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-white/40 text-sm mt-1">Manage the lifecycle from applicant to hire.</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isParsing}
          className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 px-4 py-2 rounded-xl text-sm font-bold transition-all"
        >
          {isParsing ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Parsing...</>
          ) : (
            <><Sparkles size={16} /> AI Parse Resume</>
          )}
        </button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf" />
      </div>

      {/* PIPELINE GRID */}
      <div className="grid grid-cols-4 gap-4">
        {['Applied', 'Interviewing', 'Offered', 'Hired'].map(stage => (
          <div key={stage} className="bg-[#0d0e12] p-4 rounded-2xl border border-white/5 min-h-[60vh]">
            <h3 className="font-bold text-white/40 uppercase text-xs mb-4 flex justify-between">
              {stage} 
              <span className="bg-white/5 px-2 py-0.5 rounded text-[10px]">{candidates.filter(c => c.stage === stage).length}</span>
            </h3>
            
            {candidates.filter(c => c.stage === stage).map(c => (
              <div key={c.id} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 mb-3 hover:border-violet-500/30 transition-all">
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-white/40 mb-3">{c.role_applied}</p>
                
                {stage === 'Offered' && (
                  <button onClick={() => hireCandidate(c)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all">
                    <UserPlus size={12} /> Hire Now
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}