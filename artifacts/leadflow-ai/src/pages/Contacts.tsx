

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import ContactEnrichmentPanel from "@/components/crm/contact-enrichment-panel";
import AddContactModal from "@/components/crm/add-contact-modal";
import { 
  Search, Plus, Filter, Users, Star, X, Mail, Phone, 
  Building2, Briefcase, Clock, Sparkles, ChevronRight,
  MoreVertical, Activity, Edit2, Trash2, Send, MessageSquare
} from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  company_name: string | null;
  status: string;
  lead_score: number;
  source: string;
  last_contacted_at: string | null;
  created_at: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- EDIT & DELETE STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [isSaving, setIsSaving] = useState(false);

  // --- ACTIVITY TIMELINE STATE ---
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contacts:", error);
    } else if (data) {
      setContacts(data);
    }
    setLoading(false);
  }

  // --- TIMELINE DATA FETCH ---
  async function fetchNotes(contactId: string) {
    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", contactId) 
      .order("created_at", { ascending: false });
    
    if (data) setNotes(data);
  }

  const openContactPanel = (contact: Contact) => {
    setSelectedContact(contact);
    setEditForm(contact);
    setIsEditing(false);
    setShowOptions(false);
    setIsPanelOpen(true);
    fetchNotes(contact.id);
  };

  const closeContactPanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setSelectedContact(null);
      setIsEditing(false);
    }, 300);
  };

  // --- UPDATE CONTACT FUNCTION ---
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("contacts")
      .update(editForm)
      .eq("id", selectedContact.id);

    if (error) {
      alert("Failed to update contact: " + error.message);
    } else {
      setIsEditing(false);
      setSelectedContact({ ...selectedContact, ...editForm } as Contact);
      fetchContacts();
    }
    setIsSaving(false);
  };

  // --- DELETE CONTACT FUNCTION ---
  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    if (!confirm(`Are you sure you want to delete ${selectedContact.first_name}? This cannot be undone.`)) return;

    const { error } = await supabase.from("contacts").delete().eq("id", selectedContact.id);
    if (!error) {
      closeContactPanel();
      fetchContacts();
    } else {
      alert("Failed to delete: " + error.message);
    }
  };

  // --- ADD NOTE FUNCTION ---
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedContact) return;
    setIsSavingNote(true);

    const { error } = await supabase.from("lead_notes").insert([{
      lead_id: selectedContact.id, 
      note: newNote.trim()         
    }]);

    if (error) {
      alert("Database Error: " + error.message);
      console.error(error);
    } else {
      setNewNote("");
      fetchNotes(selectedContact.id);
    }
    setIsSavingNote(false);
  };

  // --- UPDATED: COMBINED SEARCH & FILTER LOGIC ---
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = `${c.first_name || ''} ${c.last_name || ''} ${c.email || ''} ${c.company_name || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || c.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'prospect': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'churned': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    if (score >= 70) return 'text-amber-400';
    return 'text-white/40';
  };

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans relative overflow-hidden">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Contacts</h1>
          <p className="text-white/40">Manage your pipeline, enrich leads, and drive revenue.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0e12] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          
          {/* --- NEW: FUNCTIONAL FILTER DROPDOWN --- */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all ${
                statusFilter !== 'All' 
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-400' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Filter size={16} /> {statusFilter !== 'All' ? statusFilter : 'Filter'}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-12 w-48 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                {['All', 'Lead', 'Prospect', 'Customer', 'Churned'].map(status => (
                  <button 
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 ${
                      statusFilter === status ? 'text-violet-400 font-bold bg-white/5' : 'text-white/80'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Contacts", value: contacts.length, icon: Users, color: "text-blue-400" },
          { label: "Active Prospects", value: contacts.filter(c => c.status === 'Prospect').length, icon: Target, color: "text-violet-400" },
          { label: "High Intent (Score 90+)", value: contacts.filter(c => c.lead_score >= 90).length, icon: Star, color: "text-amber-400" },
          { label: "Customers", value: contacts.filter(c => c.status === 'Customer').length, icon: Building2, color: "text-emerald-400" },
        ].map((metric, idx) => (
          <div key={idx} className="bg-[#0d0e12] p-5 rounded-2xl border border-white/5 shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{metric.label}</p>
              <metric.icon size={16} className={metric.color} />
            </div>
            <p className="text-2xl font-bold">{loading ? '-' : metric.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0e12] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/40 border-b border-white/5">
              <tr>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Company & Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Lead Score</th>
                <th className="p-4 font-semibold text-right">Added</th>
                <th className="p-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/40 animate-pulse">
                    <Sparkles size={24} className="mx-auto mb-3 opacity-50" />
                    Fetching Intelligence...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <Users size={24} className="text-white/40" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No Contacts Found</h3>
                    <p className="text-white/40 mb-6">Your network is empty or the search returned no results.</p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    onClick={() => openContactPanel(contact)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-bold text-violet-300 shadow-inner">
                          {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-violet-400 transition-colors">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-xs text-white/40 flex items-center gap-1">
                            <Mail size={10} /> {contact.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-white/80">{contact.company_name || '—'}</p>
                      <p className="text-xs text-white/40">{contact.job_title || '—'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(contact.status)}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-mono text-lg font-bold ${getScoreColor(contact.lead_score)}`}>
                        {contact.lead_score}
                      </span>
                    </td>
                    <td className="p-4 text-right text-white/40 text-xs">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/contacts/${contact.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/40 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddContactModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onRefresh={fetchContacts} 
      />

      {isPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
            onClick={closeContactPanel}
          />
          
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0d0e12] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            {selectedContact && (
              <>
                {/* HEADER */}
                <div className="sticky top-0 bg-[#0d0e12]/80 backdrop-blur-md border-b border-white/5 p-6 flex justify-between items-start z-10 shrink-0">
                  <div className="flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center font-bold text-2xl text-violet-300 shadow-xl">
                      {selectedContact.first_name?.charAt(0)}{selectedContact.last_name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedContact.first_name} {selectedContact.last_name}</h2>
                      <p className="text-sm text-white/60 mb-2">{selectedContact.job_title} {selectedContact.company_name ? `at ${selectedContact.company_name}` : ''}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(selectedContact.status)}`}>
                        {selectedContact.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* EDIT TOGGLE */}
                    <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-violet-600 text-white' : 'hover:bg-white/10 text-white/40'}`}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={closeContactPanel} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  
                  {isEditing ? (
                    /* --- EDIT FORM --- */
                    <form onSubmit={handleUpdateContact} className="space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">First Name</label>
                          <input type="text" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                        </div>
                        <div>
                          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Last Name</label>
                          <input type="text" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Email</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Phone</label>
                        <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Job Title</label>
                          <input type="text" value={editForm.job_title || ''} onChange={e => setEditForm({...editForm, job_title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                        </div>
                        <div>
                          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Company</label>
                          <input type="text" value={editForm.company_name || ''} onChange={e => setEditForm({...editForm, company_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Status</label>
                        <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-violet-500">
                          <option>Lead</option>
                          <option>Prospect</option>
                          <option>Customer</option>
                          <option>Churned</option>
                        </select>
                      </div>
                      <button disabled={isSaving} type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-lg font-bold mt-4 disabled:opacity-50">
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </form>
                  ) : (
                    /* --- VIEW MODE --- */
                    <>
                      <div className="flex gap-3 relative">
                        {/* FUNCTIONAL BUTTONS */}
                        <a href={`mailto:${selectedContact.email}`} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <Mail size={14} className="text-white/60"/> Email
                        </a>
                        <a href={`tel:${selectedContact.phone || ''}`} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <Phone size={14} className="text-white/60"/> Call
                        </a>
                        
                        <div className="relative">
                          <button onClick={() => setShowOptions(!showOptions)} className="w-10 h-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-colors">
                            <MoreVertical size={16} className="text-white/60"/>
                          </button>
                          {showOptions && (
                            <div className="absolute right-0 top-12 w-48 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                              <button onClick={handleDeleteContact} className="w-full text-left px-4 py-3 text-sm text-rose-400 hover:bg-white/5 flex items-center gap-2">
                                <Trash2 size={14} /> Delete Contact
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                          <Activity size={14}/> Core Intelligence
                        </h3>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/60">Lead Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${selectedContact.lead_score >= 90 ? 'bg-emerald-400' : selectedContact.lead_score >= 70 ? 'bg-amber-400' : 'bg-white/40'}`}
                                  style={{ width: `${selectedContact.lead_score}%` }}
                                />
                              </div>
                              <span className={`font-mono text-sm font-bold ${getScoreColor(selectedContact.lead_score)}`}>
                                {selectedContact.lead_score}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-3">
                            <Mail size={14} className="text-white/40" />
                            <span className="text-white/80 select-all">{selectedContact.email}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-3">
                            <Phone size={14} className="text-white/40" />
                            <span className="text-white/80">{selectedContact.phone || 'No phone provided'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-3">
                            <Clock size={14} className="text-white/40" />
                            <span className="text-white/80">Last contacted: {selectedContact.last_contacted_at ? new Date(selectedContact.last_contacted_at).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                      </div>

                      <ContactEnrichmentPanel email={selectedContact.email} />

                      {/* --- ACTIVITY TIMELINE --- */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                          <MessageSquare size={14}/> Activity & Notes
                        </h3>
                        
                        {/* Note Input */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 mb-6 focus-within:border-violet-500/50 transition-colors">
                          <textarea 
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Log a call, meeting, or note..."
                            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none min-h-[60px]"
                          />
                          <div className="flex justify-end mt-2">
                            <button 
                              onClick={handleAddNote}
                              disabled={!newNote.trim() || isSavingNote}
                              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Timeline Feed */}
                        <div className="space-y-4 pl-2 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-white/10">
                          {notes.length === 0 ? (
                            <p className="text-xs text-white/40 pl-6 py-4 italic">No activity logged yet.</p>
                          ) : (
                            notes.map((note, idx) => (
                              <div key={idx} className="relative pl-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-[#0d0e12]" />
                                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                                  <p className="text-sm text-white/80 whitespace-pre-wrap">{note.note}</p>
                                  <p className="text-[10px] text-white/40 mt-2 font-mono">
                                    {new Date(note.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Target(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}