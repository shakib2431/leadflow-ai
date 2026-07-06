"use client";

import { useState, useEffect } from "react";
import { X, User, Briefcase, Building2, DollarSign, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EditEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  employee: any;
  onEmployeeUpdated: () => void;
}

export default function EditEmployeeModal({ open, onClose, employee, onEmployeeUpdated }: EditEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "", email: "", role: "", department: "", salary: "", status: ""
  });

  // Pre-fill the form when the modal opens
  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || "",
        email: employee.email || "",
        role: employee.role || "",
        department: employee.department || "",
        salary: employee.salary?.toString() || "",
        status: employee.status || "Active",
      });
    }
  }, [employee]);

  if (!open || !employee) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("employees")
      .update({
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        salary: Number(formData.salary) || 0,
        status: formData.status
      })
      .eq("id", employee.id);

    setLoading(false);
    if (error) {
      console.error("Update Error:", error);
      alert("Failed to update employee.");
    } else {
      onEmployeeUpdated(); // Refresh the page data
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-violet-500/50" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
            </div>
          </div>

          {/* NEW EMAIL FIELD */}
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input required type="email" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-violet-500/50" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-violet-500/50" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input required type="text" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-violet-500/50" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input type="number" className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-violet-500/50" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Status</label>
              <select className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-violet-500/50 appearance-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <option value="Onboarding">Onboarding</option>
                <option value="Active">Active</option>
                <option value="Offboarding">Offboarding</option>
              </select>
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}