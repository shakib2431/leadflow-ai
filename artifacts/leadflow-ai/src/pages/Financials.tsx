    "use client";

    import { useState, useEffect } from "react";
    import { supabase } from "@/lib/supabase";
    import Sidebar from "@/components/sidebar";
    import TopNavbar from "@/components/top-navbar";
    import { 
    CreditCard, FileText, Plus, Search, 
    TrendingUp, Clock, CheckCircle2, AlertCircle,
    MoreVertical, Download, Send, X, Trash2, Link as LinkIcon, DollarSign
    } from "lucide-react";

    interface LineItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    }

    export default function FinancialsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"proposals" | "invoices">("proposals");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Live Data State
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Builder State
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [docTitle, setDocTitle] = useState("");
    const [clientName, setClientName] = useState("");
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: "1", description: "Enterprise CRM License (Annual)", quantity: 1, price: 12000 }
    ]);

    useEffect(() => {
        fetchDocuments();
    }, []);

    // const fetchDocuments = async () => {
    const fetchDocuments = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    setDocuments(data || []);

  } catch (error) {
    console.error("Fetch proposals error:", error);

    setDocuments([]);
  } finally {
    setLoading(false);
  }
};
    //     setLoading(true);
    //     // Fetch from Supabase. We order by created_at.
    //     const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
        
    //     // If no data exists yet, we provide some highly realistic mock data for UI testing
    //     if (!data || data.length === 0) {
    //     setDocuments([
    //         { id: "PRP-001", title: "Q3 Software Implementation", status: "sent", total_amount: 12500, created_at: new Date().toISOString() },
    //         { id: "PRP-002", title: "Consulting Retainer", status: "accepted", total_amount: 8200, created_at: new Date(Date.now() - 86400000).toISOString() },
    //     ]);
    //     } else {
    //     setDocuments(data);
    //     }
    //     setLoading(false);
    // };

    // --- BUILDER MATH ---
    const calculateTotal = () => lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    const addLineItem = () => {
        setLineItems([...lineItems, { id: Date.now().toString(), description: "", quantity: 1, price: 0 }]);
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeLineItem = (id: string) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    // --- CORE ACTIONS ---
    // const handleSaveDocument = async (status: string) => {
    //     try {
    //     const { data: bizData } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    //     const total = calculateTotal();

    //     // 1. Save main proposal
    //     const { data: proposal, error } = await supabase.from('proposals').insert({
    //         business_id: bizData?.id,
    //         title: docTitle || `Proposal for ${clientName || 'Client'}`,
    //         status: status,
    //         total_amount: total
    //     }).select().single();

    //     if (error) throw error;

    //     // 2. Save line items
    //     if (proposal) {
    //         const itemsToInsert = lineItems.map(item => ({
    //         proposal_id: proposal.id,
    //         description: item.description,
    //         quantity: item.quantity,
    //         unit_price: item.price,
    //         total_price: item.quantity * item.price
    //         }));
    //         await supabase.from('proposal_line_items').insert(itemsToInsert);
    //     }

    //     setIsBuilderOpen(false);
    //     fetchDocuments();
    //     alert(`Document saved successfully as ${status}!`);

    //     } catch (err: any) {
    //     console.error("Save error:", err);
    //     // Fallback for UI if DB isn't strictly configured yet
    //     setDocuments([{
    //         id: `PRP-${Date.now().toString().slice(-4)}`,
    //         title: docTitle || `Proposal for ${clientName || 'Client'}`,
    //         status: status,
    //         total_amount: calculateTotal(),
    //         created_at: new Date().toISOString()
    //     }, ...documents]);
    //     setIsBuilderOpen(false);
    //     }
    // };
    const handleSaveDocument = async (status: string) => {
  try {
    const total = calculateTotal();

    const proposalPayload = {
      lead_id: null, // can be connected to a lead later
      title: docTitle || `Proposal for ${clientName || "Client"}`,
      line_items: lineItems,
      total_amount: total,
      status,
    };

    const { data, error } = await supabase
      .from("proposals")
      .insert(proposalPayload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log("Proposal saved:", data);

    alert(`Document saved successfully as ${status}!`);

    setDocTitle("");
    setClientName("");

    setLineItems([
      {
        id: "1",
        description: "Enterprise CRM License (Annual)",
        quantity: 1,
        price: 12000,
      },
    ]);

    setIsBuilderOpen(false);

    await fetchDocuments();

  } catch (err: any) {
    console.error("Save error:", err);

    alert(
      err?.message ||
      "Failed to save document."
    );
  }
};

    const handleGenerateStripeLink = async (docId: string) => {
        // In production, this hits your /api/stripe/checkout route
        alert("Simulating Stripe API Call...\n\nGenerating secure checkout session for Invoice.");
        
        // Update local state to show it was sent/payment link generated
        setDocuments(documents.map(d => d.id === docId ? { ...d, status: 'sent' } : d));
        
        setTimeout(() => {
        alert(`Payment Link Generated!\n\nhttps://checkout.stripe.com/pay/cs_test_${docId.slice(-6)}`);
        }, 800);
    };

    const handleExportCSV = () => {
        const headers = "ID,Title,Status,Amount,Date\n";
        const csvData = documents.map(d => `${d.id},${d.title},${d.status},${d.total_amount},${d.created_at}`).join("\n");
        const blob = new Blob([headers + csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financials_export_${Date.now()}.csv`;
        a.click();
    };

    // --- FILTERING ---
    // const filteredDocs = documents.filter(doc => 
    //     (doc.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    //     doc.id.toLowerCase().includes(searchQuery.toLowerCase())
    // );
    const filteredDocs = documents.filter((doc) => {
  const title = doc.title?.toLowerCase() || "";
  const id = String(doc.id || "").toLowerCase();

  return (
    title.includes(searchQuery.toLowerCase()) ||
    id.includes(searchQuery.toLowerCase())
  );
});

    return (
        <div className="min-h-screen bg-[#07070a] text-white flex overflow-hidden font-sans">
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

            <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <CreditCard size={24} />
                    </div>
                    Financials & Billing
                    </h1>
                    <p className="text-white/40 mt-2 text-sm">Manage proposals, track invoices, and collect payments natively.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all">
                    <Download size={16} /> Export
                    </button>
                    <button 
                    onClick={() => setIsBuilderOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                    <Plus size={16} /> New Document
                    </button>
                </div>
                </div>

                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} className="text-emerald-400" /></div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-white">$42,500</p>
                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">+14% vs last month</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Outstanding</p>
                    <p className="text-3xl font-bold text-amber-400">$18,200</p>
                    <p className="text-xs text-white/40 mt-2 font-medium">Across 4 invoices</p>
                </div>
                <div className="bg-[#0d0e12] border border-white/[0.04] p-5 rounded-2xl">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Active Proposals</p>
                    <p className="text-3xl font-bold text-white">{documents.length}</p>
                    <p className="text-xs text-white/40 mt-2 font-medium">Pipeline visibility</p>
                </div>
                <div className="bg-[#0d0e12] border border-rose-500/10 p-5 rounded-2xl relative">
                    <div className="absolute top-4 right-4"><span className="flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span></div>
                    <p className="text-rose-400/60 text-xs font-bold uppercase tracking-wider mb-1">Overdue</p>
                    <p className="text-3xl font-bold text-rose-400">$6,250</p>
                    <p className="text-xs text-rose-400/60 mt-2 font-medium">Requires attention</p>
                </div>
                </div>

                {/* Document Manager */}
                <div className="bg-[#0d0e12] border border-white/[0.04] rounded-3xl overflow-hidden flex flex-col">
                
                {/* Tabs & Search */}
                <div className="p-2 border-b border-white/[0.04] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex p-1 bg-black/40 rounded-xl w-fit">
                    <button onClick={() => setActiveTab("proposals")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "proposals" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}><FileText size={16} /> Proposals</button>
                    <button onClick={() => setActiveTab("invoices")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "invoices" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}><CreditCard size={16} /> Invoices</button>
                    </div>
                    <div className="relative px-2 sm:px-0">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..." className="w-full sm:w-64 bg-black/40 border border-white/5 rounded-xl pl-9 sm:pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-all" />
                    </div>
                </div>

                {/* List View */}
                <div className="divide-y divide-white/[0.04]">
                    {filteredDocs.length === 0 ? (
                    <div className="p-10 text-center text-white/40 text-sm">No documents found.</div>
                    ) : (
                    filteredDocs.map((doc) => (
                        <div key={doc.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/[0.02] transition-colors group gap-4 sm:gap-0">
                        <div className="flex items-center gap-5">
                            <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${doc.status === 'accepted' ? 'text-emerald-400' : 'text-white/60'}`}>
                            {activeTab === "proposals" ? <FileText size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                            <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-emerald-400 transition-colors">{doc.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                                <span className="font-mono text-white/60">{String(doc.id).substring(0,8).toUpperCase()}</span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-12 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                            <p className="font-bold text-white">${Number(doc.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            <p className="text-xs text-white/40 mt-0.5">Total Value</p>
                            </div>

                            {/* Status Badges */}
                            <div className="w-24 flex justify-end">
                            {doc.status === 'draft' && <span className="px-2.5 py-1 rounded-md bg-white/5 text-white/60 text-[10px] font-bold uppercase tracking-wider border border-white/10">Draft</span>}
                            {doc.status === 'sent' && <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">Sent</span>}
                            {doc.status === 'accepted' && <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Accepted</span>}
                            </div>

                            <div className="flex items-center gap-2">
                            {doc.status !== 'accepted' && (
                                <button onClick={() => handleGenerateStripeLink(doc.id)} title="Generate Payment Link" className="p-2 text-white/40 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/5 border border-transparent hover:border-emerald-500/30">
                                <LinkIcon size={16}/>
                                </button>
                            )}
                            <button className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"><MoreVertical size={16}/></button>
                            </div>
                        </div>
                        </div>
                    ))
                    )}
                </div>
                </div>
            </div>
            </main>

            {/* SLIDE-OUT PROPOSAL BUILDER */}
            {isBuilderOpen && (
            <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-2xl bg-[#0d0e12] border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
                
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                    <h2 className="text-xl font-bold">Document Constructor</h2>
                    <p className="text-xs text-white/40">Draft new proposal or invoice</p>
                    </div>
                    <button onClick={() => setIsBuilderOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block">Document Title</label>
                        <input 
                        type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Q4 Marketing Retainer" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block">Bill To (Client)</label>
                        <input 
                        type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client or Company Name" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/40">Line Items</label>
                    </div>
                    
                    <div className="space-y-3">
                        {lineItems.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 group">
                            <div className="flex-1 space-y-3">
                            <input 
                                type="text" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} placeholder="Item description" 
                                className="w-full bg-transparent border-b border-white/10 px-1 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                            />
                            <div className="flex gap-4">
                                <div className="w-24">
                                <label className="text-[10px] text-white/40 uppercase">Qty</label>
                                <input 
                                    type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-emerald-500 outline-none"
                                />
                                </div>
                                <div className="flex-1">
                                <label className="text-[10px] text-white/40 uppercase">Price</label>
                                <div className="relative">
                                    <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input 
                                    type="number" value={item.price} onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-sm text-white focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                </div>
                                <div className="w-24 text-right">
                                <label className="text-[10px] text-white/40 uppercase block">Total</label>
                                <div className="py-1.5 text-sm font-mono">${(item.quantity * item.price).toLocaleString()}</div>
                                </div>
                            </div>
                            </div>
                            <button onClick={() => removeLineItem(item.id)} className="p-2 mt-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/5"><Trash2 size={16} /></button>
                        </div>
                        ))}
                    </div>

                    <button onClick={addLineItem} className="mt-4 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">+ Add New Item</button>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-white/60"><span>Subtotal</span><span>${calculateTotal().toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm text-white/60"><span>Tax (0%)</span><span>$0.00</span></div>
                        <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
                        <span>Total</span><span>${calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>
                    </div>

                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex justify-between items-center shrink-0">
                    <button onClick={() => handleSaveDocument('draft')} className="px-5 py-2.5 rounded-xl text-white/60 hover:text-white font-semibold text-sm transition-all hover:bg-white/5 border border-transparent">
                    Save as Draft
                    </button>
                    <button onClick={() => handleSaveDocument('sent')} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20">
                    <Send size={16} /> Send to Client
                    </button>
                </div>

                </div>
            </div>
            )}

        </div>
        </div>
    );
    }