

import React, { useEffect, useState } from "react";
import { 
  Bot, Play, Pause, Users, Activity, Plus, 
  Mail, MessageSquare, ArrowRight, Sparkles, Settings2, Clock
} from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import { supabaseAuth } from "@/lib/auth";

export default function PlaybooksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time Metrics State
  const [metrics, setMetrics] = useState({
    active: 0,
    enrolled: 0,
    tasksExecuted: 0, 
    meetingRate: 0 
  });

  const fetchPlaybooks = async () => {
    try {
      setLoading(true);
      
      // Fetch playbooks, their nested steps, and their active enrollments
      const { data, error } = await supabaseAuth
        .from('crm_playbooks')
        .select(`
          *,
          playbook_steps (*),
          playbook_enrollments (id, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Sort steps by step_order for each playbook
        const formattedPlaybooks = data.map(pb => ({
          ...pb,
          playbook_steps: pb.playbook_steps.sort((a: any, b: any) => a.step_order - b.step_order)
        }));

        setPlaybooks(formattedPlaybooks);

        // Calculate dynamic metrics based on the database
        const activeCount = formattedPlaybooks.filter(pb => pb.is_active).length;
        const enrolledCount = formattedPlaybooks.reduce((total, pb) => total + pb.playbook_enrollments.length, 0);

        setMetrics({
          active: activeCount,
          enrolled: enrolledCount,
          tasksExecuted: 0, // Will be updated when we build the activity tracking table
          meetingRate: 0    // Will be updated when we link calendar conversions
        });
      }
    } catch (err) {
      console.error("Failed to load playbooks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const togglePlaybookStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseAuth
        .from('crm_playbooks')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchPlaybooks(); // Refresh the UI
    } catch (err) {
      alert("Failed to update playbook status.");
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 font-sans flex overflow-hidden selection:bg-indigo-500/30">
      
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0c0d12]/80 backdrop-blur-md z-30 relative">
          <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
          <div className="mr-6 flex items-center gap-3">
            <Link to="/playbooks/enroll" className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-sm font-bold px-5 py-2.5 rounded-xl transition-all border border-indigo-500/20">
              <Users size={16} /> Enroll Leads
            </Link>
            <Link to="/playbooks/builder" className="flex items-center gap-2 bg-zinc-100 text-zinc-900 hover:bg-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Plus size={16} /> New Playbook
            </Link>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] uppercase tracking-widest font-medium mb-4">
              <Bot size={12} /> Autonomous SDR Engine
            </div>
            <h1 className="text-4xl font-medium tracking-tight text-zinc-100 mb-3">AI Playbooks</h1>
            <p className="text-zinc-500 font-light max-w-2xl text-sm lg:text-base leading-relaxed">
              Design multi-channel sequences. Enroll segments of your pipeline, and let the AI autonomously draft, execute, and monitor outreach campaigns while you focus on closing.
            </p>
          </div>

          {/* Dynamic Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium flex items-center gap-2"><Play size={14} className="text-indigo-400"/> Active Playbooks</p>
              <p className="text-3xl font-light">{loading ? "-" : metrics.active}</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium flex items-center gap-2"><Users size={14} className="text-emerald-400"/> Enrolled Leads</p>
              <p className="text-3xl font-light">{loading ? "-" : metrics.enrolled}</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 opacity-50">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium flex items-center gap-2"><Sparkles size={14} className="text-purple-400"/> Tasks Executed</p>
              <p className="text-3xl font-light text-purple-100">{metrics.tasksExecuted}</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 opacity-50">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium flex items-center gap-2"><Activity size={14} className="text-amber-400"/> Meeting Rate</p>
              <p className="text-3xl font-light">{metrics.meetingRate}%</p>
            </div>
          </div>

          {loading ? (
             <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : playbooks.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-16 text-center flex flex-col items-center">
              <Bot className="w-12 h-12 text-indigo-500/50 mb-4" />
              <h3 className="text-xl font-medium mb-2">No Playbooks Active</h3>
              <p className="text-zinc-500 text-sm mb-6 max-w-sm">You haven't designed any autonomous sequences yet. Create your first playbook to start automating outreach.</p>
              <Link to="/playbooks/builder" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                Create First Playbook
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="bg-[#0a0a0c] border border-white/[0.05] rounded-3xl p-8 hover:border-white/[0.1] transition-all">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 mb-8 border-b border-white/[0.04] pb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-medium tracking-wide">{playbook.name}</h2>
                        {playbook.is_active ? (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Running</span>
                        ) : (
                          <span className="bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Paused</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 flex items-center gap-2">
                        Objective: <span className="text-zinc-300 font-medium">{playbook.objective}</span>
                        <span className="mx-2 text-white/10">•</span>
                        Enrolled: <span className="text-zinc-300 font-medium">{playbook.playbook_enrollments?.length || 0} Leads</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-sm transition flex items-center gap-2">
                        <Settings2 size={14} /> Configure
                      </button>
                      <button 
                        onClick={() => togglePlaybookStatus(playbook.id, playbook.is_active)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                          playbook.is_active 
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' 
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {playbook.is_active ? (
                          <><Pause size={14} fill="currentColor" /> Pause Engine</>
                        ) : (
                          <><Play size={14} fill="currentColor" /> Activate Engine</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-start w-full">
                    {playbook.playbook_steps?.map((step: any, idx: number) => (
                      <React.Fragment key={step.id}>
                        <div className="flex-1 bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl w-full relative group">
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold flex items-center justify-between">
                            Step {step.step_order}
                            {step.channel === 'email' ? <Mail size={14} className="text-blue-400" /> : <MessageSquare size={14} className="text-emerald-400" />}
                          </p>
                          <p className="text-sm text-zinc-300 leading-relaxed mb-4 line-clamp-3" title={step.ai_prompt_context}>
                            {step.ai_prompt_context}
                          </p>
                          <div className="inline-flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md text-[10px] text-zinc-400 border border-white/[0.02]">
                            <Clock size={10} /> Wait {step.wait_time_hours}h
                          </div>
                        </div>
                        {idx < playbook.playbook_steps.length - 1 && (
                          <div className="hidden md:flex items-center justify-center pt-8 text-zinc-700 shrink-0">
                            <ArrowRight size={20} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}