"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import PageShell from "@/components/page-shell";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { 
  TrendingUp, Users, DollarSign, Target, 
  BrainCircuit, ArrowRight, Sparkles, Building2, User
} from "lucide-react";
import MetricCard from "@/components/metric-card";
import PanelCard from "@/components/panel-card";

// --- TYPES ---
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  status: string;
  lead_score: number;
  source: string;
  created_at: string;
}

interface Deal {
  id: string;
  contact_id: string | null;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  created_at: string;
  contacts?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
  };
}

const STAGE_ORDER = ['Lead In', 'Contact Made', 'Demo Scheduled', 'Proposal Sent', 'Won', 'Lost'];
const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [contactsRes, dealsRes] = await Promise.all([
        supabase.from("contacts").select("*").order("created_at", { ascending: false }),
        supabase.from("deals").select("*, contacts(first_name, last_name, company_name)").order("created_at", { ascending: false })
      ]);

      if (contactsRes.data) setContacts(contactsRes.data);
      if (dealsRes.data) setDeals(dealsRes.data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- AGGREGATIONS & METRICS (Memoized for performance) ---
  const metrics = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    const wonDeals = deals.filter(d => d.stage === 'Won');
    const totalPipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const weightedValue = activeDeals.reduce((sum, d) => sum + (Number(d.value) * (d.probability / 100)), 0);
    const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
    
    const hotContacts = contacts.filter(c => c.lead_score >= 80);
    const avgScore = contacts.length > 0 ? Math.round(contacts.reduce((sum, c) => sum + c.lead_score, 0) / contacts.length) : 0;

    const winRate = deals.filter(d => d.stage === 'Won' || d.stage === 'Lost').length > 0
      ? Math.round((wonDeals.length / deals.filter(d => d.stage === 'Won' || d.stage === 'Lost').length) * 100)
      : 0;

    return { activeDeals, wonDeals, totalPipelineValue, weightedValue, totalWonValue, hotContacts, avgScore, winRate };
  }, [contacts, deals]);

  // --- CHART DATA ---
  const pipelineData = useMemo(() => {
    return STAGE_ORDER.map(stage => ({
      stage,
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + Number(d.value), 0)
    })).filter(item => item.count > 0);
  }, [deals]);

  const sourceData = useMemo(() => {
    const counts = contacts.reduce((acc: any, c) => {
      const src = c.source || 'Unknown';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [contacts]);

  // Top active deals by Value x Probability
  const topOpportunities = useMemo(() => {
    return [...metrics.activeDeals]
      .sort((a, b) => (Number(b.value) * b.probability) - (Number(a.value) * a.probability))
      .slice(0, 5);
  }, [metrics.activeDeals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070a] p-8 text-white flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse opacity-50">
          <BrainCircuit size={40} className="mb-4 text-violet-500 animate-pulse" />
          <p className="text-sm font-mono tracking-widest uppercase">Aggregating Global Metrics...</p>
        </div>
      </div>
    );
  }
  return (
    <PageShell title="Command Center" subtitle="Real-time revenue intelligence and AI pipeline analytics.">
      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Pipeline"
          value={`₹${metrics.totalPipelineValue.toLocaleString('en-IN')}`}
          subtitle={`Across ${metrics.activeDeals.length} active opportunities`}
          icon={<DollarSign size={20} />}
        />
        <MetricCard
          title="Weighted Forecast"
          value={`₹${metrics.weightedValue.toLocaleString('en-IN')}`}
          subtitle="Adjusted for stage probability"
          icon={<Target size={20} />}
        />
        <MetricCard
          title="Total Revenue Won"
          value={`₹${metrics.totalWonValue.toLocaleString('en-IN')}`}
          subtitle={`Historical win rate: ${metrics.winRate}%`}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          title="Network Health"
          value={`${contacts.length} Contacts`}
          subtitle={`${metrics.hotContacts.length} Hot Leads (Avg Score: ${metrics.avgScore})`}
          icon={<Users size={20} />}
        />
      </div>

      {/* BIG AI EXECUTIVE SUMMARY */}
      <div className="rounded-[32px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-[#0d0e12] to-cyan-500/5 p-8 relative overflow-hidden shadow-2xl shadow-violet-500/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Sparkles className="text-violet-400" size={28} />
          <h2 className="text-2xl font-bold text-white">AI Executive Analysis</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          <div className="lg:col-span-2 space-y-6">
            <p className="text-lg text-white/80 leading-relaxed font-light">
              Your pipeline is currently holding <strong className="text-white">₹{metrics.totalPipelineValue.toLocaleString('en-IN')}</strong> in active opportunities. 
              Based on historical closing patterns and current deal probabilities, we forecast a weighted revenue of <strong className="text-violet-400">₹{metrics.weightedValue.toLocaleString('en-IN')}</strong>. 
              You currently have <strong className="text-amber-400">{metrics.hotContacts.length} highly-engaged contacts</strong> that require immediate follow-up.
            </p>
            
            <div className="flex gap-4">
            <button 
  onClick={() => router.push('/pipeline')}
  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center gap-2"
>
  View Pipeline <ArrowRight size={16} />
</button>
              <button 
                onClick={() => router.push('/contacts')}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all"
              >
                Nurture Hot Leads
              </button>
            </div>
          </div>

          {/* Top Deal Highlight */}
          {topOpportunities[0] && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                <Target size={12} /> Highest Value Opportunity
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{topOpportunities[0].title}</h3>
              <p className="text-sm text-white/40 mb-4 flex items-center gap-2">
                <Building2 size={14} /> {topOpportunities[0].contacts?.company_name || 'Direct Consumer'}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/40 mb-1">Potential Value</p>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">₹{Number(topOpportunities[0].value).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 mb-1">Probability</p>
                  <p className="text-xl font-bold text-white">{topOpportunities[0].probability}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PIPELINE FUNNEL */}
        <div className="bg-[#0d0e12] rounded-3xl border border-white/5 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Pipeline Velocity</h2>
          <div className="h-[350px] w-full">
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="stage" stroke="#ffffff" strokeOpacity={0.4} tick={{ fill: '#ffffff', opacity: 0.4, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff" strokeOpacity={0.4} tick={{ fill: '#ffffff', opacity: 0.4, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
  contentStyle={{ backgroundColor: '#0d0e12', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Pipeline Value'] as any}
/>
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 text-sm">No pipeline data available.</div>
            )}
          </div>
        </div>

        {/* LEAD SOURCES */}
        <div className="bg-[#0d0e12] rounded-3xl border border-white/5 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Lead Generation Sources</h2>
          <div className="h-[350px] w-full relative">
            {sourceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={120} paddingAngle={5} stroke="none">
                      {sourceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0e12', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20px] text-center pointer-events-none">
                  <p className="text-3xl font-bold text-white">{contacts.length}</p>
                  <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Total</p>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 text-sm">No contact source data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* TOP OPPORTUNITIES LIST */}
      <div className="bg-[#0d0e12] rounded-3xl border border-white/5 p-8 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Target Opportunities</h2>
          <button onClick={() => router.push('/pipeline')} className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            View All Deals
          </button>
        </div>

        <div className="space-y-3">
          {topOpportunities.length === 0 ? (
            <p className="text-white/40 text-sm py-4 text-center border border-dashed border-white/10 rounded-2xl">No active opportunities in pipeline.</p>
          ) : (
            topOpportunities.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-violet-500/30 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold border border-violet-500/20">
                    {deal.probability}%
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{deal.title}</h3>
                    <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                      <User size={12}/> {deal.contacts?.first_name} {deal.contacts?.last_name}
                      <span className="text-white/20">•</span>
                      <span className="text-amber-400">{deal.stage}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-400 font-mono">₹{Number(deal.value).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Expected: {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}