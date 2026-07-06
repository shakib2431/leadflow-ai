"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart, Legend } from "recharts";
import { getRevenueKpis, getPipelineTrend, getTopOpportunities, getAiInsights } from "@/lib/revenue";
import PageShell from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import MetricCard from "@/components/metric-card";
import PanelCard from "@/components/panel-card";

interface RevenueKpis {
  totalPipeline: number;
  weightedForecast: number;
  closedRevenue: number;
  forecastGap: number;
}

interface PipelineTrendPoint {
  date: string;
  pipeline: number;
  forecast: number;
  closed: number;
  atRisk: number;
}

interface OpportunityRow {
  id: string;
  dealName: string;
  companyName: string;
  owner: string;
  value: number;
  probability: number;
  closeDate: string;
}

interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
}

interface FollowupSuggestion {
  id: string;
  description: string;
  buttonLabel: string;
  href: string;
}

interface AiInsights {
  executiveSummary: string;
  biggestRisk: string;
  actions: ActionSuggestion[];
  followups: FollowupSuggestion[];
}

function RevenueKpiCards({ data }: { data: RevenueKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Total Pipeline" value={`₹${data.totalPipeline.toLocaleString()}`} subtitle="Open opportunities across sales stages" />
      <MetricCard title="Weighted Forecast" value={`₹${data.weightedForecast.toLocaleString()}`} subtitle="Probability-weighted revenue estimate" />
      <MetricCard title="Closed Won" value={`₹${data.closedRevenue.toLocaleString()}`} subtitle="Revenue closed this period" />
      <MetricCard title="Forecast Gap" value={`₹${data.forecastGap.toLocaleString()}`} subtitle="Target vs forecast gap for leadership" />
    </div>
  );
}

function RevenueCharts({ trend }: { trend: PipelineTrendPoint[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] min-w-0">
      <PanelCard className="min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Pipeline Trend</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Last 30 Days</h2>
          </div>
          <span className="rounded-full bg-slate-900/60 px-3 py-1 text-sm font-medium text-slate-200">Forecast + Actual</span>
        </div>
        <div className="mt-6 h-[320px] min-h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color: '#fff',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                itemStyle={{ color: '#f8fafc', fontSize: 13 }}
                cursor={{ stroke: 'rgba(148,163,184,0.2)', strokeWidth: 1 }}
              />
              <Legend verticalAlign="bottom" height={32} wrapperStyle={{ bottom: -10 }} />
              <Area type="monotone" dataKey="pipeline" name="Pipeline" stroke="#2563EB" fill="#1d4ed8" fillOpacity={0.16} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      <PanelCard className="min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Revenue by Stage</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Opportunities Breakdown</h2>
          </div>
        </div>
        <div className="mt-6 h-[320px] min-h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color: '#fff',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                itemStyle={{ color: '#f8fafc', fontSize: 13 }}
                cursor={{ fill: 'rgba(255,255,255,0.06)' }}
              />
              <Legend verticalAlign="bottom" height={32} wrapperStyle={{ bottom: -10 }} />
              <Bar dataKey="closed" name="Closed" fill="#0EA5E9" />
              <Bar dataKey="atRisk" name="At Risk" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>
    </div>
  );
}

function TopOpportunitiesTable({ opportunities }: { opportunities: OpportunityRow[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-5 shadow-xl shadow-black/20 min-w-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">Top Opportunities</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Highest Value Deals</h2>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <div className="overflow-auto min-w-0">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-4 py-3 font-medium text-white/60">Deal</th>
                <th className="px-4 py-3 font-medium text-white/60">Company</th>
                <th className="px-4 py-3 font-medium text-white/60">Owner</th>
                <th className="px-4 py-3 font-medium text-white/60">Value</th>
                <th className="px-4 py-3 font-medium text-white/60">Probability</th>
                <th className="px-4 py-3 font-medium text-white/60">Close Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-[#02030a]">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-4 text-white">{opportunity.dealName}</td>
                  <td className="px-4 py-4 text-white/80">{opportunity.companyName}</td>
                  <td className="px-4 py-4 text-white/80">{opportunity.owner}</td>
                  <td className="px-4 py-4 text-white">₹{opportunity.value.toLocaleString()}</td>
                  <td className="px-4 py-4 text-white/80">{opportunity.probability}%</td>
                  <td className="px-4 py-4 text-white/60">{opportunity.closeDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AiActionCenter({
  insights,
  onActionClick,
  onFollowupClick,
}: {
  insights: AiInsights;
  onActionClick: (id: string) => void;
  onFollowupClick: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-5 shadow-xl shadow-black/20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">AI Action Center</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Revenue Intelligence Recommendations</h2>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-slate-950/80 p-5 border border-white/10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Executive Summary</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">{insights.executiveSummary}</p>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-5 border border-white/10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Top Risk</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">{insights.biggestRisk}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-950/80 p-5 border border-white/10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Immediate Actions</p>
          <div className="mt-3 space-y-4 text-sm text-slate-200">
            {insights.actions.map((action) => (
              <div key={action.id} className="rounded-3xl border border-white/10 bg-[#0b1220] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{action.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{action.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onActionClick(action.id)}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    {action.buttonLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-5 border border-white/10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Follow-Up Triggers</p>
          <div className="mt-3 space-y-4 text-sm text-slate-200">
            {insights.followups.map((trigger) => (
              <div key={trigger.id} className="rounded-3xl border border-white/10 bg-[#0b1220] p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-slate-300">{trigger.description}</p>
                  <button
                    type="button"
                    onClick={() => onFollowupClick(trigger.id)}
                    className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    {trigger.buttonLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function RevenuePage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<RevenueKpis | null>(null);
  const [trend, setTrend] = useState<PipelineTrendPoint[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const handleActionClick = (id: string) => {
    const selected = insights?.actions.find((action) => action.id === id);
    if (selected?.href) {
      router.push(selected.href);
      return;
    }
    router.push("/pipeline");
    console.warn("Missing action href for", id);
  };

  const handleFollowupClick = (id: string) => {
    const selected = insights?.followups.find((trigger) => trigger.id === id);
    if (selected?.href) {
      router.push(selected.href);
      return;
    }
    router.push("/pipeline");
    console.warn("Missing follow-up href for", id);
  };

  useEffect(() => {
    let mounted = true;

    async function loadRevenueData() {
      if (!mounted) return;
      setLoading(true);
      const [kpiData, trendData, opportunityData, insightsData] = await Promise.all([
        getRevenueKpis(),
        getPipelineTrend(),
        getTopOpportunities(),
        getAiInsights(),
      ]);
      if (!mounted) return;
      setKpis(kpiData);
      setTrend(trendData);
      setOpportunities(opportunityData);
      setInsights(insightsData);
      setLoading(false);
    }

    loadRevenueData();

    const channel = supabase
      .channel("revenue-deals-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        loadRevenueData();
      });

    channel.subscribe();

    return () => {
      mounted = false;
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  if (loading || !kpis || !insights) {
    return (
      <div className="min-h-screen bg-[#07070a] px-4 py-6 sm:px-6 lg:px-8 text-white">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-xl shadow-black/40">Loading Revenue Intelligence...</div>
      </div>
    );
  }

  return (
    <PageShell title="Revenue Intelligence Center" subtitle="Monitor forecasts, pipeline velocity, top opportunities, and AI-backed risk guidance in one central view.">
      <RevenueKpiCards data={kpis} />
      <RevenueCharts trend={trend} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <TopOpportunitiesTable opportunities={opportunities} />
        <AiActionCenter
          insights={insights}
          onActionClick={handleActionClick}
          onFollowupClick={handleFollowupClick}
        />
      </div>
    </PageShell>
  );
}
