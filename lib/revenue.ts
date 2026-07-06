import { supabase } from "@/lib/supabase";

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
  stage: string;
  contactId: string | null;
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

export async function getRevenueKpis(): Promise<RevenueKpis> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, value, stage, probability, expected_close_date")
    .order("value", { ascending: false });

  if (error || !data) {
    console.error("Revenue KPI fetch error:", error);
    return {
      totalPipeline: 0,
      weightedForecast: 0,
      closedRevenue: 0,
      forecastGap: 0,
    };
  }

  const activeDeals = data.filter((deal) => deal.stage !== "Won" && deal.stage !== "Lost");
  const wonDeals = data.filter((deal) => deal.stage === "Won");

  const totalPipeline = activeDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const weightedForecast = activeDeals.reduce(
    (sum, deal) => sum + Number(deal.value || 0) * (Number(deal.probability || 0) / 100),
    0
  );
  const closedRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const goalTarget = Math.max(totalPipeline, closedRevenue, 0) * 1.2;
  const forecastGap = Math.max(0, goalTarget - weightedForecast);

  return {
    totalPipeline,
    weightedForecast,
    closedRevenue,
    forecastGap,
  };
}

export async function getPipelineTrend(): Promise<PipelineTrendPoint[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, value, stage, probability, expected_close_date, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Pipeline trend fetch error:", error);
    return [];
  }

  const trendMap: Record<string, PipelineTrendPoint> = {};
  const now = new Date();

  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - daysAgo);
    const key = date.toISOString().slice(0, 10);
    trendMap[key] = {
      date: key,
      pipeline: 0,
      forecast: 0,
      closed: 0,
      atRisk: 0,
    };
  }

  data.forEach((deal) => {
    const dateKey = deal.expected_close_date
      ? deal.expected_close_date.slice(0, 10)
      : deal.created_at?.slice(0, 10);

    if (!dateKey || !trendMap[dateKey]) return;

    const dealValue = Number(deal.value || 0);
    const probability = Number(deal.probability || 0);
    const isWon = deal.stage === "Won";
    const isAtRisk = deal.stage === "At Risk" || deal.stage === "Stalled" || deal.stage === "Delayed";

    trendMap[dateKey].pipeline += dealValue;
    trendMap[dateKey].forecast += dealValue * (probability / 100);
    trendMap[dateKey].closed += isWon ? dealValue : 0;
    trendMap[dateKey].atRisk += isAtRisk ? dealValue : 0;
  });

  return Object.values(trendMap);
}

export async function getTopOpportunities(): Promise<OpportunityRow[]> {
  const query = supabase
    .from("deals")
    .select(`*, contacts(first_name, last_name, company_name)`)
    .neq("stage", "Lost")
    .order("value", { ascending: false })
    .limit(10);

  const { data, error } = await query;
  if (error) {
    console.error("Top opportunities fetch error:", error, {
      sql: query.toString?.(),
      data,
    });
    return [];
  }

  const opportunities = (data || [])
    .map((deal) => ({
      id: deal.id,
      dealName: deal.title || "Unnamed Deal",
      companyName: deal.contacts?.company_name || "Unknown Company",
      owner: deal.owner || `${deal.contacts?.first_name || "Sales"} ${deal.contacts?.last_name || "Team"}`,
      value: Number(deal.value || 0),
      probability: Number(deal.probability || 0),
      closeDate: deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : "TBD",
      stage: deal.stage || "Unknown",
      contactId: deal.contact_id || null,
    }))
    .sort((a, b) => b.value * b.probability - a.value * a.probability)
    .slice(0, 5);

  return opportunities;
}

export async function getAiInsights(): Promise<AiInsights> {
  const opportunities = await getTopOpportunities();

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const lowProbabilityDeals = opportunities.filter((opp) => opp.probability < 50);
  const delayedDeals = opportunities.filter((opp) => {
    if (!opp.closeDate || opp.closeDate === "TBD") return false;
    const closeDate = new Date(opp.closeDate);
    const now = new Date();
    const diff = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 14 && diff >= 0;
  });
  const atRiskDeals = opportunities.filter((opp) => opp.stage === "At Risk" || opp.stage === "Stalled" || opp.stage === "Delayed");

  const executiveSummary = opportunities.length
    ? `Pipeline health is driven by ${opportunities.length} active high-value deals totaling ₹${totalValue.toLocaleString()}. Focus on improving close probability for lower-confidence opportunities and confirm timing for deals closing soon.`
    : "No active opportunities available to analyze. Add pipeline deals to surface AI-backed recommendations.";

  const biggestRisk = opportunities.length
    ? atRiskDeals.length
      ? `The greatest risk lies in ${atRiskDeals.length} at-risk deal${atRiskDeals.length > 1 ? "s" : ""} such as ${atRiskDeals.map((opp) => opp.dealName).join(", ")}. Review these to prevent slippage.`
      : lowProbabilityDeals.length
      ? `The greatest risk is the low-probability pipeline: ${lowProbabilityDeals.length} deal${lowProbabilityDeals.length > 1 ? "s" : ""} below 50% probability. Prioritize support and qualification.`
      : `Pipeline risk is moderate. Continue tracking the top ${Math.min(3, opportunities.length)} deals and verify the close schedule for the highest-value opportunities.`
    : "No pipeline risk data available.";

  const buildDealHref = (opportunity: OpportunityRow) => {
    if (opportunity.contactId) {
      return `/leads/${opportunity.contactId}`;
    }
    return `/pipeline?dealId=${opportunity.id}`;
  };

  const topActions = opportunities.slice(0, 3).map((opportunity) => ({
    id: `action-${opportunity.id}`,
    title: opportunity.dealName,
    description: `Review ${opportunity.dealName} at ${opportunity.companyName} with ${opportunity.owner} and update probability for the expected close date ${opportunity.closeDate}.`,
    buttonLabel: "Review deal",
    href: buildDealHref(opportunity),
  }));

  const riskActions = delayedDeals.slice(0, 2).map((opportunity) => ({
    id: `delay-${opportunity.id}`,
    title: opportunity.dealName,
    description: `Confirm timing and remove blockers for ${opportunity.dealName}, which is scheduled to close soon.`,
    buttonLabel: "Confirm timing",
    href: buildDealHref(opportunity),
  }));

  const actions = [...topActions, ...riskActions].slice(0, 4);

  const followups = opportunities.slice(0, 4).map((opportunity) => ({
    id: `followup-${opportunity.id}`,
    description: `Send a personalized status update for ${opportunity.dealName} due ${opportunity.closeDate}.`,
    buttonLabel: "Create follow-up",
    href: opportunity.contactId ? `/leads/${opportunity.contactId}` : `/pipeline?dealId=${opportunity.id}`,
  }));

  if (actions.length && followups.length) {
    return {
      executiveSummary,
      biggestRisk,
      actions,
      followups,
    };
  }

  return {
    executiveSummary: opportunities.length
      ? executiveSummary
      : "No active opportunities available yet. Visit Pipeline to add high-value deals and surface AI-backed recommendations.",
    biggestRisk,
    actions: actions.length
      ? actions
      : [
          {
            id: "action-create-deal",
            title: "Add pipeline deals",
            description: "Create or import your first active sales opportunity so AI can produce revenue actions.",
            buttonLabel: "Open pipeline",
            href: "/pipeline",
          },
        ],
    followups: followups.length
      ? followups
      : [
          {
            id: "followup-open-pipeline",
            description: "No follow-ups available until active opportunities are present. Add a deal and revisit AI follow-up guidance.",
            buttonLabel: "Open pipeline",
            href: "/pipeline",
          },
        ],
  };
}
