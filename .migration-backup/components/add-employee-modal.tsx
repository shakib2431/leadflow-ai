"use client";

import { useState } from "react";
import { X, User, Briefcase, Mail, Building2, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onEmployeeAdded: () => void;
}

export default function AddEmployeeModal({ open, onClose, onEmployeeAdded }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "",
    department: "",
    salary: "",
    status: "Onboarding",
    start_date: "" // <-- Add this
  });

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("employees").insert([{
      full_name: formData.full_name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      salary: Number(formData.salary) || 0,
      status: formData.status
    }]);

    setLoading(false);
    if (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee.");
    } else {
      onEmployeeAdded(); // Refresh the grid
      onClose();         // Close modal
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-violet-400" size={20} /> Add New Hire
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50" placeholder="Jane Doe" onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input required type="email" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50" placeholder="jane@company.com" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50" placeholder="Designer" onChange={(e) => setFormData({...formData, role: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50" placeholder="Creative" onChange={(e) => setFormData({...formData, department: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4">
            {/* New Start Date Field */}
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Official Start Date</label>
            <input 
              required 
              type="date" 
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50 [color-scheme:dark]" 
              onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
            />
          </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Annual Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input type="number" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 outline-none focus:border-violet-500/50" placeholder="75000" onChange={(e) => setFormData({...formData, salary: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Initial Status</label>
              <select className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-violet-500/50 appearance-none" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <option value="Onboarding">Onboarding</option>
                <option value="Active">Active</option>
              </select>
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">
            {loading ? "Adding..." : "Add to Team"}
          </button>
        </form>
      </div>
    </div>
  );
}