"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Mail, Phone, Building2, Briefcase, Search, Edit2, X } from "lucide-react";

export default function DirectoryPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- EXPANDED EDIT STATE ---
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "Male",
    pan_number: "",
    aadhaar_number_masked: "",
    bank_account_number: "",
    bank_ifsc: ""
  });

  useEffect(() => {
    fetchActiveDirectory();
  }, []);

  async function fetchActiveDirectory() {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        employment_history!employment_history_employee_id_fkey (
          designation,
          department,
          effective_to
        )
      `)
      .eq("status", "active");

    if (error) {
      console.error("Failed to fetch directory:", error.message || error);
    } else if (data) {
      setEmployees(data);
    }
    
    setIsLoading(false);
  }

  // --- UPDATED SAVE FUNCTION ---
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from("employees")
      .update({
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        phone: editFormData.phone,
        date_of_birth: editFormData.date_of_birth,
        gender: editFormData.gender,
        pan_number: editFormData.pan_number,
        aadhaar_number_masked: editFormData.aadhaar_number_masked,
        bank_account_number: editFormData.bank_account_number,
        bank_ifsc: editFormData.bank_ifsc,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingEmp.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      setEditingEmp(null);
      fetchActiveDirectory(); // Refresh the UI with new data
    }
    setIsSaving(false);
  };

  const openEditModal = (emp: any) => {
    setEditingEmp(emp);
    setEditFormData({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      date_of_birth: emp.date_of_birth || "",
      gender: emp.gender || "Male",
      pan_number: emp.pan_number || "",
      aadhaar_number_masked: emp.aadhaar_number_masked || "",
      bank_account_number: emp.bank_account_number || "",
      bank_ifsc: emp.bank_ifsc || ""
    });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Directory</h1>
          <p className="text-white/40">Manage your active workforce and their current assignments.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input 
            type="text"
            placeholder="Search name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0e12] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-sm animate-pulse">Syncing with authoritative schema...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filteredEmployees.map((emp) => {
            const activeHistory = emp.employment_history?.find((h: any) => h.effective_to === null);
            const activeRole = activeHistory || { designation: "Pending Assignment", department: "Unassigned" };

            return (
              <div key={emp.id} className="bg-[#0d0e12] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative">
                
                {/* Edit Button */}
                <button 
                  onClick={() => openEditModal(emp)}
                  className="absolute top-6 right-6 text-white/20 hover:text-violet-400 transition-colors"
                >
                  <Edit2 size={16} />
                </button>

                <div className="flex justify-between items-start mb-4 pr-8">
                  <div>
                    <h2 className="font-bold text-lg">{emp.first_name} {emp.last_name}</h2>
                    <span className="text-[10px] text-violet-400 font-mono bg-violet-500/10 px-2 py-1 rounded">
                      {emp.employee_code}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Briefcase size={14} className="text-white/40" />
                    <span>{activeRole.designation}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Building2 size={14} className="text-white/40" />
                    <span>{activeRole.department}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-3 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                    <Mail size={12} />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                    <Phone size={12} />
                    <span>{emp.phone}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredEmployees.length === 0 && (
             <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
               <p className="text-white/40 text-sm">No active employees found.</p>
             </div>
          )}
        </div>
      )}

      {/* --- EXPANDED EDIT MODAL --- */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit Employee Profile</h2>
              <button onClick={() => setEditingEmp(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateEmployee} className="space-y-6">
              <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6 custom-scrollbar">
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">First Name</label>
                    <input required type="text" value={editFormData.first_name} onChange={e => setEditFormData({...editFormData, first_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Last Name</label>
                    <input required type="text" value={editFormData.last_name} onChange={e => setEditFormData({...editFormData, last_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Email</label>
                    <input required type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Phone Number</label>
                    <input required type="text" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Date of Birth</label>
                    <input required type="date" value={editFormData.date_of_birth} onChange={e => setEditFormData({...editFormData, date_of_birth: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase mb-1">Gender</label>
                    <select value={editFormData.gender} onChange={e => setEditFormData({...editFormData, gender: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-violet-400 mb-4">Statutory & Banking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase mb-1">PAN Number</label>
                      <input required type="text" value={editFormData.pan_number} onChange={e => setEditFormData({...editFormData, pan_number: e.target.value.toUpperCase()})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500 uppercase" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase mb-1">Aadhaar (Last 4)</label>
                      <input required type="text" value={editFormData.aadhaar_number_masked} onChange={e => setEditFormData({...editFormData, aadhaar_number_masked: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase mb-1">Bank Account No.</label>
                      <input required type="text" value={editFormData.bank_account_number} onChange={e => setEditFormData({...editFormData, bank_account_number: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase mb-1">Bank IFSC Code</label>
                      <input required type="text" value={editFormData.bank_ifsc} onChange={e => setEditFormData({...editFormData, bank_ifsc: e.target.value.toUpperCase()})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500 uppercase" />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}