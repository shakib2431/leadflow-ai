"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

export default function AddCompanyModal({ open, onClose, onCompanyCreated }: any) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.from("companies").insert([{ name, industry }]);
    setLoading(false);
    onCompanyCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-[#0d0e12] border border-white/10 p-6 rounded-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Add New Company</h2>
          <button onClick={onClose}><X size={18} className="text-white/40" /></button>
        </div>
        <input className="w-full bg-black/40 border border-white/10 p-3 rounded-lg mb-4 text-sm" placeholder="Company Name" onChange={(e) => setName(e.target.value)} required />
        <input className="w-full bg-black/40 border border-white/10 p-3 rounded-lg mb-6 text-sm" placeholder="Industry" onChange={(e) => setIndustry(e.target.value)} />
        <button disabled={loading} className="w-full bg-white text-black py-2.5 rounded-lg font-bold text-sm">
          {loading ? "Creating..." : "Save Company"}
        </button>
      </form>
    </div>
  );
}