

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { Briefcase, Users, TrendingUp, Clock } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  ExportBar,
} from "./components";

type CandidateStage = "Applied" | "Interviewing" | "Offered" | "Hired";

type CandidateRow = {
  id: string;
  stage?: CandidateStage | string | null;
  created_at?: string | null;
  source?: string | null;
  candidate_source?: string | null;
  channel?: string | null;
  referral_source?: string | null;
  role_applied?: string | null;
};

type RecruitmentData = {
  totalApplied: number;
  interviewed: number;
  offered: number;
  accepted: number;
  avgTimeToHire: number;
  conversionRate: number;
  activeOpenRoles: number;
  candidates: Array<{ stage: string; count: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  avgAppliedDays: number;
  avgInterviewDays: number;
  offerAcceptanceRate: number;
};

const KNOWN_STAGES: CandidateStage[] = ["Applied", "Interviewing", "Offered", "Hired"];

function normalizeStage(input?: string | null): CandidateStage {
  const value = String(input || "").trim().toLowerCase();
  if (value === "interviewing") return "Interviewing";
  if (value === "offered") return "Offered";
  if (value === "hired") return "Hired";
  return "Applied";
}

function parseColumns(searchValue: string | null): Set<string> {
  const raw = String(searchValue || "").trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split("|")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function hasColumn(selected: Set<string>, ...aliases: string[]) {
  if (selected.size === 0) return true;
  return aliases.some((alias) => selected.has(alias.toLowerCase()));
}

function toDateOnlyString(input: Date) {
  return input.toISOString().split("T")[0];
}

function parseDate(input?: string | null) {
  const value = String(input || "").trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function daysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

async function fetchRecruitmentData(from?: string | null, to?: string | null): Promise<RecruitmentData> {
  const { data, error } = await supabase.from("candidates").select("*");
  if (error) throw error;

  const rows = (data || []) as CandidateRow[];
  const fromDate = parseDate(from) || null;
  const toDate = parseDate(to) || null;
  const now = new Date();

  const filtered = rows.filter((row) => {
    const createdAt = parseDate(row.created_at);
    if (!createdAt) return true;
    if (fromDate && createdAt < fromDate) return false;
    if (toDate) {
      const toInclusive = new Date(toDate);
      toInclusive.setHours(23, 59, 59, 999);
      if (createdAt > toInclusive) return false;
    }
    return true;
  });

  const stageCounts: Record<CandidateStage, number> = {
    Applied: 0,
    Interviewing: 0,
    Offered: 0,
    Hired: 0,
  };

  const sourceCounts = new Map<string, number>();
  const appliedAges: number[] = [];
  const interviewAges: number[] = [];

  for (const row of filtered) {
    const stage = normalizeStage(row.stage);
    stageCounts[stage] += 1;

    const source =
      String(row.source || row.candidate_source || row.channel || row.referral_source || "Unspecified").trim() ||
      "Unspecified";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

    const createdAt = parseDate(row.created_at);
    if (createdAt) {
      const age = daysBetween(createdAt, now);
      if (stage === "Applied") appliedAges.push(age);
      if (stage === "Interviewing") interviewAges.push(age);
    }
  }

  const total = KNOWN_STAGES.reduce((sum, stage) => sum + stageCounts[stage], 0);
  const offered = stageCounts.Offered;
  const accepted = stageCounts.Hired;
  const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const offerAcceptanceRate = offered + accepted > 0 ? Math.round((accepted / (offered + accepted)) * 100) : 0;
  const activeOpenRoles = stageCounts.Applied + stageCounts.Interviewing;

  const avgAppliedDays = appliedAges.length > 0 ? Math.round(appliedAges.reduce((a, b) => a + b, 0) / appliedAges.length) : 0;
  const avgInterviewDays = interviewAges.length > 0 ? Math.round(interviewAges.reduce((a, b) => a + b, 0) / interviewAges.length) : 0;
  const avgTimeToHire = avgAppliedDays + avgInterviewDays;

  const sourceBreakdown = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalApplied: total,
    interviewed: stageCounts.Interviewing,
    offered,
    accepted,
    avgTimeToHire,
    conversionRate,
    activeOpenRoles,
    candidates: KNOWN_STAGES.map((stage) => ({ stage, count: stageCounts[stage] })),
    sourceBreakdown,
    avgAppliedDays,
    avgInterviewDays,
    offerAcceptanceRate,
  };
}

export default function RecruitmentReportsPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const templateName = searchParams.get("template") || "Recruitment Analytics";
  const selectedColumns = useMemo(() => parseColumns(searchParams.get("columns")), [searchParams]);

  const initialFrom = searchParams.get("from") || toDateOnlyString(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  const initialTo = searchParams.get("to") || toDateOnlyString(new Date());

  const [data, setData] = useState<RecruitmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: initialFrom,
      end: initialTo,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const recruitmentData = await fetchRecruitmentData(filters?.dateRange?.start, filters?.dateRange?.end);
        if (!cancelled) setData(recruitmentData);
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(err?.message || "Failed to load recruitment analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [filters?.dateRange?.start, filters?.dateRange?.end]);

  const handleExportCSV = () => alert("Export CSV - Coming soon");
  const handleExportExcel = () => alert("Export Excel - Coming soon");
  const handleExportPDF = () => alert("Export PDF - Coming soon");

  const showOpenRoles = hasColumn(selectedColumns, "open roles", "active offers");
  const showApplicants = hasColumn(selectedColumns, "applicants", "total applications");
  const showInterviewFunnel = hasColumn(selectedColumns, "interview funnel", "funnel");

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader title="" />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{templateName}</h1>
              <p className="text-slate-600 mt-1">Hiring pipeline, conversion rates, and recruitment metrics</p>
            </div>

            <ReportFilters filters={filters} onChange={setFilters} />

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recruitment Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {showApplicants && (
                  <KPICard
                    label="Total Applications"
                    value={loading ? "..." : data?.totalApplied || 0}
                    icon={Users}
                    color="blue"
                  />
                )}
                {showOpenRoles && (
                  <KPICard
                    label="Open Roles"
                    value={loading ? "..." : data?.activeOpenRoles || 0}
                    icon={Briefcase}
                    color="purple"
                  />
                )}
                <KPICard
                  label="Conversion Rate"
                  value={loading ? "..." : `${data?.conversionRate || 0}%`}
                  icon={TrendingUp}
                  color="green"
                />
                <KPICard
                  label="Avg Time to Hire"
                  value={loading ? "..." : `${data?.avgTimeToHire || 0} days`}
                  icon={Clock}
                  color="slate"
                />
              </div>
            </div>

            {showInterviewFunnel && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Hiring Funnel</h3>
                <div className="space-y-4">
                  {(data?.candidates || []).map((stage, idx) => {
                    const total = data?.totalApplied || 1;
                    const percentage = Math.round(((stage.count || 0) / total) * 100);
                    const width = Math.max(10, 100 - idx * 20);

                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{stage.stage}</span>
                          <span className="text-sm font-bold text-slate-900">
                            {stage.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all flex items-center justify-center"
                            style={{ width: `${width}%` }}
                          >
                            <span className="text-xs font-semibold text-white">{stage.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!loading && (data?.candidates || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                      No candidates found in selected period.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Candidate Sources</h3>
                <div className="space-y-3">
                  {(data?.sourceBreakdown || []).map((item) => {
                    const max = Math.max(1, data?.sourceBreakdown?.[0]?.count || 1);
                    return (
                      <div key={item.source} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{item.source}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600"
                              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!loading && (data?.sourceBreakdown || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500">
                      No source data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_12px_30px_rgba(16,24,40,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Stage Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <span className="text-sm font-medium text-indigo-900">Avg Days in Applied</span>
                    <span className="text-lg font-bold text-indigo-700 tabular-nums">{loading ? "..." : `${data?.avgAppliedDays || 0} days`}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">Avg Days in Interview</span>
                    <span className="text-lg font-bold text-purple-700 tabular-nums">{loading ? "..." : `${data?.avgInterviewDays || 0} days`}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-medium text-emerald-900">Offer Acceptance Rate</span>
                    <span className="text-lg font-bold text-emerald-700 tabular-nums">{loading ? "..." : `${data?.offerAcceptanceRate || 0}%`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ExportBar
          reportName="Recruitment Report"
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  );
}
