

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { Building2, Search, Plus, ArrowRight } from "lucide-react";
// 1. IMPORT YOUR MODAL
import AddCompanyModal from "@/components/add-company-modal"; 

export default function CompaniesListPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // 2. ADD THIS STATE

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select(`
        id, 
        name, 
        industry, 
        location,
        deals(value)
      `)
      .order("name");
    
    setCompanies(data || []);
    setLoading(false);
  }

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-white/40 mt-1">Manage your corporate accounts and entity relationships</p>
        </div>
        {/* 3. ADD ONCLICK HANDLER */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
        >
          <Plus size={16} /> Add Company
        </button>
      </div>

      {/* Search & Filter */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
        <input
          type="text"
          placeholder="Search companies or industries..."
          className="w-full bg-[#0d0e12] border border-white/10 py-3 pl-12 pr-4 rounded-xl outline-none focus:border-violet-500/50 transition-all text-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-white/30 text-center py-20">Loading database...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Link 
              href={`/companies/${company.id}`} 
              key={company.id}
              className="group p-6 bg-[#0d0e12] border border-white/5 rounded-2xl hover:border-violet-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-white/5 text-white/40">
                    <Building2 size={20} />
                  </div>
                  <h2 className="font-bold text-lg">{company.name}</h2>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">
                  {company.industry || "General"} • {company.location || "N/A"}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-emerald-400 font-bold text-sm">
                  ₹{(company.deals?.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0) || 0).toLocaleString()}
                </span>
                <ArrowRight className="text-white/20 group-hover:text-white transition-all" size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4. RENDER MODAL */}
      <AddCompanyModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCompanyCreated={fetchCompanies} 
      />
    </div>
  );
}