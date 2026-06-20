"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Mail, Phone, MoreVertical, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import AddEmployeeModal from "@/components/add-employee-modal";

export default function TeamDirectoryPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("full_name");
    
    if (error) console.error("Error fetching team:", error);
    setEmployees(data || []);
    setLoading(false);
  }

  const filteredTeam = employees.filter((emp) =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Directory</h1>
          <p className="text-white/40 mt-1">Manage personnel, roles, and HR operations</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
        <input
          type="text"
          placeholder="Search by name, role, or department..."
          className="w-full bg-[#0d0e12] border border-white/10 py-3 pl-12 pr-4 rounded-xl outline-none focus:border-violet-500/50 transition-all text-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-white/30 text-center py-20 flex flex-col items-center gap-4">
           <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
           Loading team data...
        </div>
      ) : filteredTeam.length === 0 ? (
        <div className="text-center py-20 bg-[#0d0e12] rounded-2xl border border-white/5 border-dashed">
          <p className="text-white/40 mb-2">No team members found.</p>
          <p className="text-sm text-white/20">Click "Add Employee" to start building your HR directory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeam.map((employee) => (
            <Link 
              href={`/team/${employee.id}`}
              key={employee.id}
              className="group p-5 bg-[#0d0e12] border border-white/5 rounded-2xl hover:border-violet-500/30 transition-all flex flex-col cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-lg font-bold text-violet-300 border border-violet-500/20">
                  {employee.full_name?.charAt(0) || "?"}
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                  employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  employee.status === 'Onboarding' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {employee.status || 'Active'}
                </span>
              </div>
              
              <div>
                <h2 className="font-bold text-lg leading-tight group-hover:text-violet-300 transition-colors">{employee.full_name}</h2>
                <div className="flex flex-col gap-1 mt-2 text-sm text-white/40">
                  <span className="flex items-center gap-2"><Briefcase size={12}/> {employee.role || "Unassigned"}</span>
                  <span className="flex items-center gap-2"><Building2 size={12}/> {employee.department || "General"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-5 mt-auto border-t border-white/5">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors text-xs font-medium" onClick={(e) => e.preventDefault()}>
                  <Mail size={14} /> Email
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors text-xs font-medium" onClick={(e) => e.preventDefault()}>
                  <Phone size={14} /> Call
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AddEmployeeModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onEmployeeAdded={fetchEmployees} 
      />
    </div>
  );
}