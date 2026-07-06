

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, User, Mail, Phone, Briefcase, Building2, Sparkles, AlertCircle } from "lucide-react";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AddContactModal({ isOpen, onClose, onRefresh }: AddContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    company_name: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("contacts")
      .insert([{
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title,
        company_name: formData.company_name,
        status: 'Lead',
        lead_score: Math.floor(Math.random() * 40) + 10,
        source: 'Manual Entry'
      }]);

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setFormData({ first_name: "", last_name: "", email: "", phone: "", job_title: "", company_name: "" });
    setIsSubmitting(false);
    onRefresh();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0d0e12] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-white/[0.02] border-b border-white/5 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-violet-400" size={20} />
              Add New Contact
            </h2>
            <p className="text-xs text-white/40 mt-1">Create a new record in your CRM database.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">First Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="Jane" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Last Name</label>
              <div className="relative">
                <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="Doe" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email Address *</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="jane@example.com" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Company</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="Acme Corp" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Job Title</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" placeholder="CEO" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-white/5 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] flex justify-center items-center gap-2">
              {isSubmitting ? <span className="animate-pulse">Saving Record...</span> : "Save Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}