"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Plus, Filter, DollarSign, Target, TrendingUp, 
  AlertCircle, Clock, GripHorizontal, Building2, User, X, Trash2
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
  contacts?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
  };
}

const STAGES = [
  { name: "Lead In", color: "bg-blue-500", border: "border-blue-500/20" },
  { name: "Contact Made", color: "bg-cyan-500", border: "border-cyan-500/20" },
  { name: "Demo Scheduled", color: "bg-violet-500", border: "border-violet-500/20" },
  { name: "Proposal Sent", color: "bg-amber-500", border: "border-amber-500/20" },
  { name: "Won", color: "bg-emerald-500", border: "border-emerald-500/20" },
  { name: "Lost", color: "bg-rose-500", border: "border-rose-500/20" }
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
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
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  
  const [dealForm, setDealForm] = useState({
    title: "",
    value: 0,
    stage: "Lead In",
    probability: 10,
    expected_close_date: "",
    contact_id: ""
  });

  useEffect(() => {
    fetchDeals();
    fetchContacts(); // Load contacts for the dropdown
  }, []);

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

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const previousDeals = [...deals];
    setDeals(deals.map(deal => 
      deal.id === draggedDealId ? { ...deal, stage: targetStage } : deal
    ));
    setDraggedDealId(null);

    const { error } = await supabase
      .from("deals")
      .update({ stage: targetStage })
      .eq("id", draggedDealId);

    if (error) {
      alert("Failed to update deal stage");
      setDeals(previousDeals);
    }
  };

  // --- DEAL CRUD LOGIC ---
  const openNewDealPanel = () => {
    setSelectedDeal(null);
    setDealForm({ title: "", value: 0, stage: "Lead In", probability: 10, expected_close_date: "", contact_id: "" });
    setIsPanelOpen(true);
  };

  const openEditDealPanel = (deal: Deal) => {
    setSelectedDeal(deal);
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

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      ...dealForm,
      contact_id: dealForm.contact_id === "" ? null : dealForm.contact_id,
      expected_close_date: dealForm.expected_close_date === "" ? null : dealForm.expected_close_date
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
      alert("Error saving deal: " + error.message);
    } else {
      setIsPanelOpen(false);
      fetchDeals(); 
    }
    setIsSaving(false);
  };

  const handleDeleteDeal = async () => {
    if (!selectedDeal) return;
    if (!confirm("Are you sure you want to delete this deal?")) return;
    
    const { error } = await supabase.from("deals").delete().eq("id", selectedDeal.id);
    if (!error) {
      setIsPanelOpen(false);
      fetchDeals();
    }
  };

  // --- FILTERING LOGIC ---
  const filteredDeals = deals.filter(d => {
    // 1. Text Search
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contacts?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Dropdown Filter
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

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans relative overflow-hidden flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Sales Pipeline</h1>
          <p className="text-white/40">Drag and drop opportunities to update revenue forecasts.</p>
        </div>

        <div className="flex gap-4">
          {/* SEARCH */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search deals or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0e12] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* FILTER BUTTON & DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all ${
                filterType !== 'All Deals' 
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-400' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Filter size={16} /> {filterType === 'All Deals' ? 'Filter' : filterType}
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

          {/* NEW DEAL BUTTON */}
          <button 
            onClick={openNewDealPanel}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
          >
            <Plus size={16} /> New Deal
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-[#0d0e12] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Active Pipeline</p>
            <p className="text-3xl font-bold">₹{totalPipeline.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="bg-[#0d0e12] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Weighted Pipeline</p>
            <p className="text-3xl font-bold text-violet-400">₹{weightedPipeline.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <Target size={20} />
          </div>
        </div>
        <div className="bg-[#0d0e12] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Total Active Deals</p>
            <p className="text-3xl font-bold text-emerald-400">{activeDeals.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto pb-8 custom-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white/40 animate-pulse">
            Loading Pipeline...
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.name);
              
              return (
                <div 
                  key={stage.name}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.name)}
                  className={`w-[320px] shrink-0 bg-[#0d0e12] rounded-3xl border ${stage.border} flex flex-col max-h-[70vh]`}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color} shadow-[0_0_8px_currentColor]`} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">{stage.name}</h3>
                      </div>
                      <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-md text-white/60">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-white/80">₹{getStageTotal(stage.name).toLocaleString('en-IN')}</p>
                  </div>

                  {/* Column Body (Scrollable) */}
                  <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3 min-h-[150px]">
                    {stageDeals.map((deal) => (
                      <div 
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openEditDealPanel(deal)}
                        className="bg-black/40 border border-white/5 p-4 rounded-2xl cursor-grab active:cursor-grabbing hover:border-violet-500/50 hover:bg-white/[0.02] transition-all group shadow-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-sm leading-snug group-hover:text-violet-300 transition-colors pr-4">
                            {deal.title}
                          </h4>
                          <GripHorizontal size={14} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        
                        <div className="text-lg font-bold font-mono text-white/90 mb-4">
                          ₹{Number(deal.value).toLocaleString('en-IN')}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40 flex items-center gap-1.5"><Target size={12}/> Probability</span>
                            <span className="font-bold text-white/80">{deal.probability}%</span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${deal.probability >= 80 ? 'bg-emerald-400' : deal.probability >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`} 
                              style={{ width: `${deal.probability}%` }} 
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2">
                            <span className="text-white/40 flex items-center gap-1.5"><Clock size={12}/> Close Date</span>
                            <span className="font-medium text-white/60">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}</span>
                          </div>
                        </div>

                        {/* Linked Contact */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-1">
                          {deal.contacts ? (
                            <>
                              <div className="text-[10px] text-white/60 flex items-center gap-1.5">
                                <User size={10} className="text-white/40"/> 
                                {deal.contacts.first_name} {deal.contacts.last_name}
                              </div>
                              {deal.contacts.company_name && (
                                <div className="text-[10px] text-white/40 flex items-center gap-1.5 font-bold uppercase tracking-wider line-clamp-1">
                                  <Building2 size={10} className="text-violet-400/60 shrink-0"/> 
                                  {deal.contacts.company_name}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[10px] text-white/40 italic flex items-center gap-1.5">
                              <AlertCircle size={10} /> Unassigned Deal
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- DEAL SLIDE-OUT PANEL --- */}
      {isPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" onClick={() => setIsPanelOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0d0e12] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">{selectedDeal ? 'Edit Deal' : 'New Deal'}</h2>
              <div className="flex gap-2">
                {selectedDeal && (
                  <button onClick={handleDeleteDeal} className="p-2 text-rose-400 hover:bg-white/5 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={() => setIsPanelOpen(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <form id="deal-form" onSubmit={handleSaveDeal} className="space-y-5">
                
                <div>
                  <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Deal Title <span className="text-rose-500">*</span></label>
                  <input required type="text" value={dealForm.title} onChange={e => setDealForm({...dealForm, title: e.target.value})} placeholder="e.g. Enterprise License Q3" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Value (₹) <span className="text-rose-500">*</span></label>
                    <input required type="number" min="0" value={dealForm.value} onChange={e => setDealForm({...dealForm, value: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Probability (%)</label>
                    <input required type="number" min="0" max="100" value={dealForm.probability} onChange={e => setDealForm({...dealForm, probability: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Stage</label>
                    <select value={dealForm.stage} onChange={e => setDealForm({...dealForm, stage: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors appearance-none">
                      {STAGES.map(s => <option key={s.name} value={s.name} className="bg-[#1a1b23]">{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Close Date</label>
                    <input type="date" value={dealForm.expected_close_date} onChange={e => setDealForm({...dealForm, expected_close_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors [color-scheme:dark]" />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Linked Contact</label>
                  <select value={dealForm.contact_id} onChange={e => setDealForm({...dealForm, contact_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors appearance-none">
                    <option value="" className="bg-[#1a1b23]">-- No Contact Attached --</option>
                    {availableContacts.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1a1b23]">
                        {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1"><AlertCircle size={10}/> Link this deal to an existing contact in your database.</p>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-white/5 shrink-0 bg-[#0d0e12]">
              <button form="deal-form" disabled={isSaving} type="submit" className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                {isSaving ? "Saving..." : "Save Deal"}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}