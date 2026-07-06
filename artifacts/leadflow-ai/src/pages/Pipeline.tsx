

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";
import MetricCard from "@/components/metric-card";
import PanelCard from "@/components/panel-card";
import PageShell from "@/components/page-shell";
import { 
  Search, Plus, Filter, DollarSign, Target, TrendingUp, 
  AlertCircle, Clock, GripHorizontal, Building2, User, X, Trash2, Flame
} from "lucide-react";

// --- TYPES ---
interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  contact_id: string | null;
  created_at: string;
  last_activity_at?: string | null; 
  contacts?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
  };
}

const FALLBACK_STAGES = [
  { name: "Lead In", color: "bg-blue-500", border: "border-blue-500/20" },
  { name: "Contact Made", color: "bg-cyan-500", border: "border-cyan-500/20" },
  { name: "Demo Scheduled", color: "bg-violet-500", border: "border-violet-500/20" },
  { name: "Proposal Sent", color: "bg-amber-500", border: "border-amber-500/20" },
  { name: "Won", color: "bg-emerald-500", border: "border-emerald-500/20" },
  { name: "Lost", color: "bg-rose-500", border: "border-rose-500/20" }
];

function PipelinePageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState(FALLBACK_STAGES);
  const [loading, setLoading] = useState(true);
  
  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Deals");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // --- DEAL CRUD STATE ---
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // NEW: Inline UI States replacing alerts
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [deepLinkedDealId, setDeepLinkedDealId] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState({
    title: "",
    value: 0,
    stage: "Lead In",
    probability: 10,
    expected_close_date: "",
    contact_id: ""
  });

  const openNewDealPanel = () => {
    setSelectedDeal(null);
    setSaveError(null);
    setIsDeleting(false);
    setDealForm({ title: "", value: 0, stage: "Lead In", probability: 10, expected_close_date: "", contact_id: "" });
    setIsPanelOpen(true);
  };

  const openEditDealPanel = (deal: Deal) => {
    setSelectedDeal(deal);
    setSaveError(null);
    setIsDeleting(false);
    setDealForm({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : "",
      contact_id: deal.contact_id || ""
    });
    setIsPanelOpen(true);
  };

  useEffect(() => {
    fetchDeals();
    fetchContacts();
  }, []);

  useEffect(() => {
    const dealId = searchParams.get("dealId");
    if (dealId) {
      setDeepLinkedDealId(dealId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!deepLinkedDealId || deals.length === 0 || isPanelOpen) return;
    const deal = deals.find((d) => d.id === deepLinkedDealId);
    if (deal) {
      openEditDealPanel(deal);
      setDeepLinkedDealId(null);
    }
  }, [deepLinkedDealId, deals, isPanelOpen]);

  async function fetchDeals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .select(`
        *,
        contacts (first_name, last_name, company_name)
      `)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching deals:", error);
    } else if (data) {
      setDeals(data);
    }
    setLoading(false);
  }

  async function fetchContacts() {
    const { data } = await supabase.from("contacts").select("id, first_name, last_name, company_name").order("first_name");
    if (data) setAvailableContacts(data);
  }

  // --- HTML5 DRAG & DROP LOGIC ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedDealId(id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDealId(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // const handleDrop = async (e: React.DragEvent, targetStage: string) => {
  //   e.preventDefault();
  //   if (!draggedDealId) return;

  //   const previousDeals = [...deals];
  //   setDeals(deals.map(deal => 
  //     deal.id === draggedDealId ? { ...deal, stage: targetStage, last_activity_at: new Date().toISOString() } : deal
  //   ));
  //   setDraggedDealId(null);

  //   const { error } = await supabase
  //     .from("deals")
  //     .update({ stage: targetStage, last_activity_at: new Date().toISOString() })
  //     .eq("id", draggedDealId);

  //   if (error) {
  //     // Replaced alert() with silent fallback and console error
  //     console.error("Failed to update deal stage in DB:", error.message);
  //     setDeals(previousDeals); // Snap card back if DB fails
  //   }
  // };

  // const handleDrop = async (e: React.DragEvent, targetStage: string) => {
  //   e.preventDefault();
  //   if (!draggedDealId) return;

  //   const previousDeals = [...deals];
  //   const deal = deals.find(d => d.id === draggedDealId);
    
  //   // 1. Update UI
  //   setDeals(deals.map(d => 
  //     d.id === draggedDealId ? { ...d, stage: targetStage, last_activity_at: new Date().toISOString() } : d
  //   ));

  //   // 2. Update Database
  //   const { error } = await supabase
  //     .from("deals")
  //     .update({ stage: targetStage, last_activity_at: new Date().toISOString() })
  //     .eq("id", draggedDealId);

  //   if (error) {
  //     console.error("Failed to update deal stage:", error.message);
  //     setDeals(previousDeals);
  //     return;
  //   }

  //   // 3. PHASE 4 & 6: ACTION TRIGGERS
  //   if (targetStage === "Won") {
  //       console.log("Triggering Won Deal Automations...");
  //       // Roadmap requirement: Log this activity to the unified activity_log
  //       await supabase.from("activity_log").insert({
  //           action: "deal_won",
  //           entity_id: deal?.contact_id,
  //           payload: { deal_id: draggedDealId, value: deal?.value }
  //       });
        
  //       // Roadmap requirement: Trigger Revenue Ops (e.g., Invoicing/HRMS commission)
  //       alert("🎉 Deal Won! Would you like to generate an invoice for this deal?");
  //   }
  // };
  // Add this inside PipelinePage
  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const previousDeals = [...deals];
    const deal = deals.find(d => d.id === draggedDealId);
    
    // 1. Update UI & DB
    setDeals(deals.map(d => d.id === draggedDealId ? { ...d, stage: targetStage, last_activity_at: new Date().toISOString() } : d));

    const { error: updateError } = await supabase
      .from("deals")
      .update({ stage: targetStage, last_activity_at: new Date().toISOString() })
      .eq("id", draggedDealId);

    if (updateError) {
      console.error("Update failed:", updateError.message);
      setDeals(previousDeals);
      return;
    }

    // 2. PHASE 1: LOG TO 360° TIMELINE (activity_log)
    await supabase.from("activity_log").insert({
      entity_id: deal?.contact_id,
      action: `deal_moved_to_${targetStage.toLowerCase().replace(' ', '_')}`,
      actor_type: 'user',
      payload: { deal_id: draggedDealId, title: deal?.title }
    });

    // 3. PHASE 4: TRIGGER FINANCIALS (Proposal/Invoice Creation)
    if (targetStage === "Won" && deal) {
      const { error: finError } = await supabase.from("proposals").insert({
        title: `Invoice for ${deal.title}`,
        total_amount: deal.value,
        status: 'draft',
        // Assuming your 'proposals' table has a link to deals
        // deal_id: deal.id 
      });

      if (!finError) {
        alert("🎉 Deal Won! Invoice draft created in Financials.");
      }
    }
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const payload = {
      ...dealForm,
      contact_id: dealForm.contact_id === "" ? null : dealForm.contact_id,
      expected_close_date: dealForm.expected_close_date === "" ? null : dealForm.expected_close_date,
      last_activity_at: new Date().toISOString()
    };

    let error;
    if (selectedDeal) {
      const res = await supabase.from("deals").update(payload).eq("id", selectedDeal.id);
      error = res.error;
    } else {
      const res = await supabase.from("deals").insert([payload]);
      error = res.error;
    }

    if (error) {
      // Replaced alert() with inline error state
      setSaveError(error.message);
    } else {
      setIsPanelOpen(false);
      fetchDeals(); 
    }
    setIsSaving(false);
  };

  const confirmDelete = async () => {
    if (!selectedDeal) return;
    setIsSaving(true);
    
    const { error } = await supabase.from("deals").delete().eq("id", selectedDeal.id);
    
    if (error) {
      setSaveError("Failed to delete: " + error.message);
      setIsSaving(false);
    } else {
      setIsPanelOpen(false);
      fetchDeals();
      setIsSaving(false);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contacts?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (filterType === "High Probability (>50%)") {
      matchesFilter = d.probability > 50;
    } else if (filterType === "Closing This Month") {
      if (!d.expected_close_date) {
        matchesFilter = false;
      } else {
        const closeDate = new Date(d.expected_close_date);
        const now = new Date();
        matchesFilter = closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesFilter;
  });

  const activeDeals = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
  const totalPipeline = activeDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const weightedPipeline = activeDeals.reduce((sum, d) => sum + (Number(d.value) * (d.probability / 100)), 0);

  const getStageTotal = (stageName: string) => {
    return filteredDeals.filter(d => d.stage === stageName).reduce((sum, d) => sum + Number(d.value), 0);
  };

  const isDealRotting = (deal: Deal) => {
    if (deal.stage === 'Won' || deal.stage === 'Lost') return false;
    const lastActive = new Date(deal.last_activity_at || deal.created_at);
    const diffTime = Math.abs(new Date().getTime() - lastActive.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex overflow-hidden font-sans">
      
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 flex flex-col p-6 lg:p-8 overflow-hidden relative">
          <PageShell title="Pipeline" subtitle="Drag and drop opportunities to update revenue forecasts.">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="relative shrink-0">
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all ${
                    filterType !== 'All Deals' 
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-400' 
                      : 'bg-[#0d0e12] hover:bg-white/5 border-white/10 text-white'
                  }`}
                >
                  <Filter size={16} /> <span className="hidden sm:inline">{filterType === 'All Deals' ? 'Filter' : filterType}</span>
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 top-12 w-56 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                    {['All Deals', 'High Probability (>50%)', 'Closing This Month'].map(type => (
                      <button 
                        key={type}
                        onClick={() => {
                          setFilterType(type);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 ${
                          filterType === type ? 'text-violet-400 font-bold bg-white/5' : 'text-white/80'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={openNewDealPanel}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all shrink-0"
              >
                <Plus size={16} /> New Deal
              </button>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0 animate-in fade-in duration-500 delay-100">
              <div className="bg-[#0d0e12] p-5 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Active Pipeline</p>
                  <p className="text-3xl font-bold">₹{totalPipeline.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <DollarSign size={20} />
                </div>
              </div>

              <div className="bg-[#0d0e12] p-5 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Weighted Pipeline</p>
                  <p className="text-3xl font-bold text-violet-400">₹{weightedPipeline.toLocaleString('en-IN')}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Target size={20} />
                </div>
              </div>

              <div className="bg-[#0d0e12] p-5 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Total Active Deals</p>
                  <p className="text-3xl font-bold text-emerald-400">{activeDeals.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>

            {/* KANBAN BOARD */}
            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
              {loading ? (
                <div className="flex h-full items-center justify-center text-white/40 animate-pulse">
                  Loading Pipeline...
                </div>
              ) : (
                <div className="flex gap-4 h-full items-start min-w-max pb-4 animate-in slide-in-from-bottom-8 duration-500 delay-200">
                  {stages.map((stage) => {
                    const stageDeals = filteredDeals.filter(d => d.stage === stage.name);
                    
                    return (
                      <div 
                        key={stage.name}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage.name)}
                        className={`w-[300px] shrink-0 bg-[#0d0e12] rounded-2xl border ${stage.border} flex flex-col max-h-full`}>
                        {/* stage column content unchanged */}
                        <div className="p-4 border-b border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-[0_0_8px_currentColor]`} />
                              <h3 className="font-bold text-sm uppercase tracking-wider text-white/90">{stage.name}</h3>
                            </div>
                            <span className="text-xs font-bold bg-white/5 px-2 py-0.5 rounded-md text-white/60">
                              {stageDeals.length}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-white/40">₹{getStageTotal(stage.name).toLocaleString('en-IN')}</p>
                        </div>

                        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3 min-h-[150px]">
                          {stageDeals.map((deal) => {
                            const rotting = isDealRotting(deal);
                            
                            return (
                              <div 
                                key={deal.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, deal.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => openEditDealPanel(deal)}
                                className={`bg-black/40 border p-4 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-all group shadow-lg
                                  ${rotting ? 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5 hover:border-violet-500/50'}`}
                              >
                                {/* deal card content unchanged */}
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-sm leading-snug group-hover:text-violet-300 transition-colors pr-2">
                                    {deal.title}
                                  </h4>
                                  <GripHorizontal size={14} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                </div>
                                
                                <div className="text-base font-bold font-mono text-white/90 mb-3">
                                  ₹{Number(deal.value).toLocaleString('en-IN')}
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-white/40">Probability</span>
                                    <span className="font-bold text-white/80">{deal.probability}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${deal.probability >= 80 ? 'bg-emerald-400' : deal.probability >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`} 
                                      style={{ width: `${deal.probability}%` }} 
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] pt-1">
                                    <span className="text-white/40 flex items-center gap-1"><Clock size={10}/> Close Date</span>
                                    <span className="font-medium text-white/60">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}</span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-white/5 flex items-end justify-between gap-2">
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    {deal.contacts ? (
                                      <>
                                        <div className="text-[10px] text-white/60 flex items-center gap-1.5 truncate">
                                          <User size={10} className="text-white/40 shrink-0"/> 
                                          <span className="truncate">{deal.contacts.first_name} {deal.contacts.last_name}</span>
                                        </div>
                                        {deal.contacts.company_name && (
                                          <div className="text-[10px] text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider truncate">
                                            <Building2 size={10} className="text-violet-400/60 shrink-0"/> 
                                            <span className="truncate">{deal.contacts.company_name}</span>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-[10px] text-white/40 italic flex items-center gap-1.5">
                                        <AlertCircle size={10} /> Unassigned
                                      </div>
                                    )}
                                  </div>
                                  
                                  {rotting && (
                                    <div title="No activity in 7+ days" className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                      <Flame size={10} /> Rotting
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </PageShell>

          {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0 animate-in fade-in duration-500 delay-100">
              <div>
                <MetricCard title="Active Pipeline" value={`₹${totalPipeline.toLocaleString('en-IN')}`} icon={<DollarSign size={18} />} subtitle="Open deals value" />
              </div>
              <div>
                <MetricCard title="Weighted Pipeline" value={`₹${weightedPipeline.toLocaleString('en-IN')}`} icon={<Target size={18} />} subtitle="Probability-weighted" />
              </div>
              <div>
                <MetricCard title="Total Active Deals" value={activeDeals.length} icon={<TrendingUp size={18} />} subtitle="Open opportunities" />
              </div>
            </div>

          {/* KANBAN BOARD */}
          <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
            {loading ? (
              <div className="flex h-full items-center justify-center text-white/40 animate-pulse">
                Loading Pipeline...
              </div>
            ) : (
              <div className="flex gap-4 h-full items-start min-w-max pb-4 animate-in slide-in-from-bottom-8 duration-500 delay-200">
                {stages.map((stage) => {
                  const stageDeals = filteredDeals.filter(d => d.stage === stage.name);
                  
                  return (
                    <div 
                      key={stage.name}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage.name)}
                      className={`w-[300px] shrink-0 bg-[#0d0e12] rounded-2xl border ${stage.border} flex flex-col max-h-full`}
                    >
                      <div className="p-4 border-b border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-[0_0_8px_currentColor]`} />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-white/90">{stage.name}</h3>
                          </div>
                          <span className="text-xs font-bold bg-white/5 px-2 py-0.5 rounded-md text-white/60">
                            {stageDeals.length}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-white/40">₹{getStageTotal(stage.name).toLocaleString('en-IN')}</p>
                      </div>

                      <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3 min-h-[150px]">
                        {stageDeals.map((deal) => {
                          const rotting = isDealRotting(deal);
                          
                          return (
                            <div 
                              key={deal.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openEditDealPanel(deal)}
                              className={`bg-black/40 border p-4 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-all group shadow-lg
                                ${rotting ? 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5 hover:border-violet-500/50'}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm leading-snug group-hover:text-violet-300 transition-colors pr-2">
                                  {deal.title}
                                </h4>
                                <GripHorizontal size={14} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                              </div>
                              
                              <div className="text-base font-bold font-mono text-white/90 mb-3">
                                ₹{Number(deal.value).toLocaleString('en-IN')}
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-white/40">Probability</span>
                                  <span className="font-bold text-white/80">{deal.probability}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${deal.probability >= 80 ? 'bg-emerald-400' : deal.probability >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`} 
                                    style={{ width: `${deal.probability}%` }} 
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-1">
                                  <span className="text-white/40 flex items-center gap-1"><Clock size={10}/> Close Date</span>
                                  <span className="font-medium text-white/60">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t border-white/5 flex items-end justify-between gap-2">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  {deal.contacts ? (
                                    <>
                                      <div className="text-[10px] text-white/60 flex items-center gap-1.5 truncate">
                                        <User size={10} className="text-white/40 shrink-0"/> 
                                        <span className="truncate">{deal.contacts.first_name} {deal.contacts.last_name}</span>
                                      </div>
                                      {deal.contacts.company_name && (
                                        <div className="text-[10px] text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider truncate">
                                          <Building2 size={10} className="text-violet-400/60 shrink-0"/> 
                                          <span className="truncate">{deal.contacts.company_name}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-[10px] text-white/40 italic flex items-center gap-1.5">
                                      <AlertCircle size={10} /> Unassigned
                                    </div>
                                  )}
                                </div>
                                
                                {rotting && (
                                  <div title="No activity in 7+ days" className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                    <Flame size={10} /> Rotting
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* --- DEAL SLIDE-OUT PANEL --- */}
        {isPanelOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" onClick={() => setIsPanelOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0d0e12] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
              
              <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                
                {/* NEW: Inline Delete Confirmation */}
                {isDeleting ? (
                  <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in-95">
                    <p className="text-sm font-bold text-rose-400">Delete this deal?</p>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => setIsDeleting(false)} className="px-3 py-1.5 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                      <button onClick={confirmDelete} className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-[0_0_10px_rgba(225,29,72,0.3)]">Yes, Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold">{selectedDeal ? 'Edit Deal' : 'New Deal'}</h2>
                    <div className="flex gap-2">
                      {selectedDeal && (
                        <button onClick={() => setIsDeleting(true)} className="p-2 text-rose-400 hover:bg-white/5 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                      <button onClick={() => setIsPanelOpen(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* NEW: Inline Error Banner */}
                {saveError && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">Database Error</h4>
                      <p className="text-xs text-rose-400/80 leading-relaxed">{saveError}</p>
                      {saveError.includes("last_activity_at") && (
                        <p className="text-[10px] mt-2 text-white/60 font-mono bg-black/40 p-2 rounded">
                          Hint: Run `ALTER TABLE deals ADD COLUMN last_activity_at TIMESTAMPTZ;` in Supabase.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <form id="deal-form" onSubmit={handleSaveDeal} className="space-y-5">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Deal Title <span className="text-rose-500">*</span></label>
                    <input required type="text" value={dealForm.title} onChange={e => setDealForm({...dealForm, title: e.target.value})} placeholder="e.g. Enterprise License Q3" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Value (₹) <span className="text-rose-500">*</span></label>
                      <input required type="number" min="0" value={dealForm.value} onChange={e => setDealForm({...dealForm, value: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Probability (%)</label>
                      <input required type="number" min="0" max="100" value={dealForm.probability} onChange={e => setDealForm({...dealForm, probability: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Stage</label>
                      <select value={dealForm.stage} onChange={e => setDealForm({...dealForm, stage: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors appearance-none">
                        {stages.map(s => <option key={s.name} value={s.name} className="bg-[#1a1b23]">{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Close Date</label>
                      <input type="date" value={dealForm.expected_close_date} onChange={e => setDealForm({...dealForm, expected_close_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors [color-scheme:dark]" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Linked Contact</label>
                    <select value={dealForm.contact_id} onChange={e => setDealForm({...dealForm, contact_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 transition-colors appearance-none">
                      <option value="" className="bg-[#1a1b23]">-- No Contact Attached --</option>
                      {availableContacts.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#1a1b23]">
                          {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1"><AlertCircle size={10}/> Link this deal to a specific lead or executive.</p>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-white/5 shrink-0 bg-black/20">
                <button form="deal-form" disabled={isSaving || isDeleting} type="submit" className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                  {isSaving ? "Processing..." : "Save Deal"}
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070a] text-white flex items-center justify-center">
          Loading pipeline...
        </div>
      }
    >
      <PipelinePageContent />
    </Suspense>
  );
}