

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { useParams } from "wouter";
import { Building2, DollarSign, Users, Clock, ArrowLeft, Mail } from "lucide-react";
import ContactEnrichmentPanel from "../../../components/crm/contact-enrichment-panel";

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyData() {
      if (!id) return;
      
      console.log("Attempting to fetch ID:", id);

      // We separate the query to catch exactly where it fails
      const { data, error } = await supabase
  .from("companies")
  .select(`
    id, 
    name, 
    industry, 
    location,
    leads(id, full_name, email), 
    deals(id, title, value, status)
  `)
  .eq("id", id)
  .maybeSingle();
      
      if (error) {
        console.error("FULL SUPABASE ERROR:", error);
        alert("Database Error: Check Console (F12)");
      } else {
        console.log("Data returned from Supabase:", data);
        setCompany(data);
      }
      setLoading(false);
    }
    fetchCompanyData();
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center text-white/40">Loading...</div>;
  
  if (!company) return (
    <div className="p-10 text-white">
      <h2 className="text-xl font-bold">Company not found.</h2>
      <p className="text-white/40 mt-2">ID: {id}</p>
      <p className="text-white/40 text-sm mt-4">Tip: Check your Supabase console for any RLS policy errors.</p>
      <Link to="/companies" className="block mt-6 text-violet-400 hover:underline">← Back to Database</Link>
    </div>
  );

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <Link to="/companies" className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Database
      </Link>
      
      <header className="mb-10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-xl">
            <Building2 className="text-white/40" size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-white/40 mt-1 uppercase tracking-widest text-[10px] font-bold">
              {company.industry || "General"} • {company.location || "N/A"}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Widget */}
        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest mb-3">
            <DollarSign size={14} /> Total Pipeline Value
          </div>
          <p className="text-4xl font-bold text-emerald-400 tracking-tighter">
            ₹{(company.deals?.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0) || 0).toLocaleString()}
          </p>
        </div>

       {/* Contact Directory (Now referencing leads table) */}
        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 lg:col-span-2 shadow-xl">
          <h3 className="flex items-center gap-2 font-bold mb-6 text-sm uppercase tracking-widest text-white/40">
            <Users size={16} /> Contact Directory
          </h3>
          <div className="space-y-3">
            {company.leads?.length === 0 ? (
              <p className="text-white/20 italic text-sm p-4 text-center">No leads assigned.</p>
            ) : (
              company.leads?.map((lead: any) => (
                <div key={lead.id} className="flex justify-between items-center p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.05] transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
                      {lead.full_name?.charAt(0) || "?"}
                    </div>
                    <span className="font-medium">{lead.full_name}</span>
                  </div>
                  <span className="text-white/40 text-sm font-mono flex items-center gap-2">
                    <Mail size={12}/>{lead.email}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>  
      </div>
    </div>
  );
}