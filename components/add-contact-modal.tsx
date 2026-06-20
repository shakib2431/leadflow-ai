"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AddContactModal({ isOpen, onClose, onRefresh }: any) {
  const [formData, setFormData] = useState({ first_name: "", email: "", phone: "", company_id: "" });
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("companies").select("id, name").then(({ data }) => setCompanies(data || []));
  }, []);

  const handleSubmit = async () => {
    await supabase.from("leads").insert([formData]);
    onRefresh();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#111827] p-6 rounded-2xl border border-white/10 w-96">
        <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
        <input placeholder="Name" className="w-full mb-3 bg-black p-3 rounded-lg" onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
        <input placeholder="Email" className="w-full mb-3 bg-black p-3 rounded-lg" onChange={(e) => setFormData({...formData, email: e.target.value})} />
        
        <select className="w-full mb-4 bg-black p-3 rounded-lg" onChange={(e) => setFormData({...formData, company_id: e.target.value})}>
          <option value="">Select Company</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 p-3 bg-white/5 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 p-3 bg-violet-600 rounded-lg">Add Contact</button>
        </div>
      </div>
    </div>
  );
}