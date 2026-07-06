

import React, { useEffect, useState } from "react";
import { Users, Search, PlayCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import { supabaseAuth } from "@/lib/auth";

export default function SmartEnrollmentPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedPlaybook, setSelectedPlaybook] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch raw leads for targeting
        const { data: leadsData } = await supabaseAuth
          .from('leads')
          .select('id, full_name, email, phone, status, ai_score')
          .not('status', 'eq', 'lost')
          .order('ai_score', { ascending: false });
        
        // Fetch available playbooks
        const { data: playbooksData } = await supabaseAuth
          .from('crm_playbooks')
          .select('id, name, objective')
          .eq('is_active', true); // Only show active playbooks

        if (leadsData) setLeads(leadsData);
        if (playbooksData) {
          setPlaybooks(playbooksData);
          if (playbooksData.length > 0) setSelectedPlaybook(playbooksData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleLead = (id: string) => {
    const newSet = new Set(selectedLeads);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeads(newSet);
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(leads.map(l => l.id)));
  };

  const handleEnrollment = async () => {
    if (selectedLeads.size === 0 || !selectedPlaybook) return;
    
    setEnrolling(true);
    try {
      const res = await fetch("/api/playbooks/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbook_id: selectedPlaybook,
          lead_ids: Array.from(selectedLeads)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully enrolled ${data.count} leads into the AI engine!`);
        window.location.href = "/playbooks"; // Bounce back to hub
      } else {
        alert("Enrollment failed: " + data.error);
      }
    } catch (err) {
      alert("Failed to connect to enrollment engine.");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 font-sans flex overflow-hidden selection:bg-indigo-500/30">
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0c0d12]/80 backdrop-blur-md z-30 relative">
          <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          
          <div className="max-w-6xl mx-auto">
            <Link to="/playbooks" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition">
              <ArrowLeft size={16} /> Back to Playbooks
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-medium tracking-tight mb-2">Smart Enrollment</h1>
                <p className="text-zinc-500 text-sm max-w-xl">Select target leads and inject them directly into an autonomous sequence.</p>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-2 rounded-2xl">
                <select 
                  value={selectedPlaybook}
                  onChange={(e) => setSelectedPlaybook(e.target.value)}
                  className="bg-[#0a0a0c] border border-white/[0.05] text-sm text-white px-4 py-2.5 rounded-xl outline-none min-w-[200px]"
                >
                  {playbooks.length === 0 && <option value="">No Active Playbooks</option>}
                  {playbooks.map(pb => (
                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                  ))}
                </select>
                
                <button 
                  onClick={handleEnrollment}
                  disabled={selectedLeads.size === 0 || enrolling || !selectedPlaybook}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {enrolling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlayCircle size={16} />}
                  Enroll {selectedLeads.size} Leads
                </button>
              </div>
            </div>

            {/* Target Leads Data Table */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition">
                    {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-400">{selectedLeads.size} Selected</span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search database..." className="bg-[#0a0a0c] border border-white/[0.05] rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none w-64 focus:border-indigo-500/50 transition" />
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : leads.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 text-sm">No active leads found in pipeline.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-zinc-500 text-xs uppercase tracking-wider bg-black/10">
                        <th className="p-5 w-16"></th>
                        <th className="p-5 font-medium">Lead Target</th>
                        <th className="p-5 font-medium">Contact</th>
                        <th className="p-5 font-medium">Status</th>
                        <th className="p-5 font-medium">AI Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {leads.map(lead => (
                        <tr key={lead.id} className={`hover:bg-white/[0.02] transition cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-indigo-500/5' : ''}`} onClick={() => toggleLead(lead.id)}>
                          <td className="p-5 text-center">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedLeads.has(lead.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 bg-black/40'}`}>
                              {selectedLeads.has(lead.id) && <ShieldCheck className="w-3 h-3 text-white" />}
                            </div>
                          </td>
                          <td className="p-5 font-medium text-white/90">{lead.full_name}</td>
                          <td className="p-5 text-zinc-400 font-light text-xs">
                            <div className="flex flex-col gap-1">
                              <span>{lead.email || 'No email'}</span>
                              <span className="opacity-60">{lead.phone || 'No phone'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider text-zinc-300 font-medium">
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-5">
                            {lead.ai_score ? (
                              <span className={`font-bold ${lead.ai_score >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{lead.ai_score}</span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}