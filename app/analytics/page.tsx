"use client";

import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [proposalModal, setProposalModal] =
  useState(false);
  const [proposalHistory, setProposalHistory] =
  useState<any[]>([]);
  const [followupModal, setFollowupModal] =
  useState(false);
  const hotRadarLeads = leads
  .filter(
    (lead) =>
      lead.ai_score >= 80 &&
      lead.status !== "won"
  )
  .slice(0, 5);
  

const [followupText, setFollowupText] =
  useState("");

const [proposalText, setProposalText] =
  useState("");

 useEffect(() => {
  fetchLeads();
  fetchFollowups();
  fetchProposalHistory();
}, []);
async function fetchFollowups() {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  setFollowups(data || []);
}

async function fetchProposalHistory() {

  const { data, error } =
    await supabase
      .from("proposal_history")
      .select("*")
      .order("generated_at", {
        ascending: false,
      });

  if (error) {
    console.error(error);
    return;
  }

  setProposalHistory(data || []);
}
  async function fetchLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setLeads(data || []);
  }

  const totalLeads = leads.length;
  const totalProposals =
  proposalHistory.length;
  const wonProposals =
  proposalHistory.filter(
    (p) => p.status === "won"
  ).length;

const lostProposals =
  proposalHistory.filter(
    (p) => p.status === "lost"
  ).length;

const pendingProposals =
  proposalHistory.filter(
    (p) =>
      p.status === "generated" ||
      p.status === "pending"
  ).length;

const proposalConversionRate =
  totalProposals > 0
    ? Math.round(
        (wonProposals /
          totalProposals) *
          100
      )
    : 0;
 
const totalProposalValue =
  proposalHistory.reduce(
    (sum, proposal) =>
      sum +
      (proposal.proposal_value || 0),
    0
  );

const highestProposal =
  proposalHistory.length > 0
    ? Math.max(
        ...proposalHistory.map(
          (p) =>
            p.proposal_value || 0
        )
      )
    : 0;

const averageProposalValue =
  totalProposals > 0
    ? Math.round(
        totalProposalValue /
          totalProposals
      )
    : 0;

const wonLeads = leads.filter(
  (lead) =>
    lead.pipeline_stage === "won"
).length;

const lostLeads = leads.filter(
  (lead) => lead.status === "lost"
).length;
const activeLeads =
  totalLeads - wonLeads - lostLeads;

const conversionRate =
  totalLeads > 0
    ? (
        (wonLeads / totalLeads) *
        100
      ).toFixed(1)
    : "0";
    const overdueFollowups = followups.filter(
  (f) =>
    f.status === "pending" &&
    new Date(f.due_date) < new Date()
).length;

const completedFollowups = followups.filter(
  (f) => f.status === "completed"
).length;
const pendingFollowups = followups.filter(
  (f) => f.status === "pending"
).length;

const overdueCount = followups.filter(
  (f) =>
    f.status !== "completed" &&
    new Date(f.due_date) < new Date()
).length;
const completionRate =
  completedFollowups + pendingFollowups > 0
    ? (
        (completedFollowups /
          (completedFollowups + pendingFollowups)) *
        100
      ).toFixed(1)
    : "0";
    const todaysTasks = followups.filter((f) => {
  const today = new Date();

  return (
    f.status === "pending" &&
    new Date(f.due_date).toDateString() ===
      today.toDateString()
  );
});
const sourceCounts = leads.reduce((acc: any, lead) => {
  const source = lead.source || "Unknown";
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {});

const topOpportunity = [...leads]
  .filter((lead) => lead.ai_score)
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )[0];
  const opportunityValue =
  topOpportunity?.estimated_value ||
  50000;
  const funnelData = [
  {
    label: "Leads",
    value: totalLeads,
    color: "from-cyan-500 to-blue-500",
  },
  {
    label: "Contacted",
    value: leads.filter(
      (l) => l.status === "contacted"
    ).length,
    color: "from-violet-500 to-purple-500",
  },
  {
    label: "Qualified",
    value: leads.filter(
      (l) => l.status === "qualified"
    ).length,
    color: "from-yellow-500 to-orange-500",
  },
  {
  label: "Proposal",
  value: leads.filter(
    (l) => l.proposal_generated === true
  ).length,
},
  {
    label: "Won",
    value: wonLeads,
    color: "from-green-500 to-emerald-500",
  },
];
const recentActivity = [...leads]
  .sort(
    (a, b) =>
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime()
  )
  .slice(0, 5);
  
const recentLeads = [...leads]

  .sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  )
  .slice(0, 5);
const bestLeads = [...leads]
  .map((lead) => {

    let calculatedScore =
      lead.ai_score || 0;

    if (!lead.ai_score) {

      if (lead.status === "hot")
        calculatedScore += 40;

      if (lead.status === "warm")
        calculatedScore += 20;

      if (
        lead.pipeline_stage ===
        "contacted"
      )
        calculatedScore += 20;

      if (
        lead.pipeline_stage ===
        "qualified"
      )
        calculatedScore += 30;
    }

    return {
      ...lead,
      ai_score: calculatedScore,
    };
  })
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )
  .slice(0, 5);

const pipelineData = [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "won",
  "lost",
]
  .map((stage) => ({
    status: stage,
    count: leads.filter(
      (lead) => lead.pipeline_stage === stage
    ).length,
  }))
  .filter((item) => item.count > 0);
  const sourceChartData = Object.entries(
  sourceCounts
).map(([name, value]) => ({
  name,
  value,
}));
const topPipelineStage =
  pipelineData.length > 0
    ? [...pipelineData].sort(
        (a, b) => b.count - a.count
      )[0]
    : null;
const followupChartData = [
  {
    name: "Completed",
    value: completedFollowups,
  },
  {
    name: "Pending",
    value: pendingFollowups,
  },
  {
    name: "Overdue",
    value: overdueFollowups,
  },
];
const leadTrendData = [...leads]
  .sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  )
  .reduce((acc: any[], lead) => {
    const day = new Date(
      lead.created_at
    ).toLocaleDateString();

    const existing = acc.find(
      (item) => item.day === day
    );

    if (existing) {
      existing.leads += 1;
    } else {
      acc.push({
        day,
        leads: 1,
      });
    }

    return acc;
  }, []);
const hotLeads =
  leads.filter(
    (lead) => lead.status === "hot"
  ).length;

const warmLeads =
  leads.filter(
    (lead) => lead.status === "warm"
  ).length;

const coldLeads =
  leads.filter(
    (lead) =>
      lead.status === "cold"
  ).length;

const analyzedLeads =
  leads.filter(
    (lead) =>
      lead.ai_score !== null
  );

const averageAiScore =
  analyzedLeads.length > 0
    ? Math.round(
        analyzedLeads.reduce(
          (sum, lead) =>
            sum + lead.ai_score,
          0
        ) / analyzedLeads.length
      )
    : 0;

const forecastRevenue = leads
  .filter(
    (lead) =>
      lead.pipeline_stage === "negotiation" ||
      lead.pipeline_stage === "won"
  )
  .reduce(
    (sum, lead) =>
      sum + (lead.deal_value || 0),
    0
  );
    const temperatureChartData = [
  {
    name: "Hot",
    value: hotLeads,
  },
  {
    name: "Warm",
    value: warmLeads,
  },
  {
    name: "Cold",
    value: coldLeads,
  },
];
const predictedClosures =
  Math.round(
    hotLeads * 0.8 +
    warmLeads * 0.4
  );

function getBusinessProposal(
  lead: any
) {
  const summary =
    lead.ai_summary?.toLowerCase() || "";

  let projectType =
    "Business Website";

  let scope = `
✓ Custom Website Design
✓ Mobile Responsive Design
✓ Contact Form
✓ WhatsApp Integration
✓ SEO Setup
`;

  if (summary.includes("restaurant")) {
    projectType =
      "Restaurant Website";

    scope = `
✓ Restaurant Website
✓ Menu Page
✓ Table Reservation
✓ WhatsApp Ordering
✓ Mobile Responsive
✓ SEO Setup
`;
  }

  if (summary.includes("ecommerce")) {
    projectType =
      "Ecommerce Website";

    scope = `
✓ Product Catalog
✓ Shopping Cart
✓ Checkout
✓ Payment Gateway
✓ Order Management
`;
  }

  return {
    projectType,
    scope,
  };
}

  const closingLeads = [...leads]
  .filter(
    (lead) => (lead.ai_score || 0) >= 70
  )
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )
  .slice(0, 3);

const weeklyRevenue =
  closingLeads.reduce(
    (sum, lead) =>
      sum +
      (lead.estimated_value || 50000),
    0
  );

const closeProbability =
  closingLeads.length > 0
    ? Math.round(
        closingLeads.reduce(
          (sum, lead) =>
            sum + (lead.ai_score || 0),
          0
        ) / closingLeads.length
      )
    : 0;
const actionLeads = [...leads]
  .filter(
    (lead) =>
      lead.status === "hot" ||
      lead.status === "warm"
  )
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )
  .slice(0, 5);
  const topOpportunities = [...leads]
  .filter((lead) => lead.ai_score)
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )
  .slice(0, 10);

  const notifications = [

  ...leads
    .filter(
      (lead) => lead.status === "hot"
    )
    .slice(0, 3)
    .map((lead) => ({
      id: lead.id,
      icon: "🔥",
      text: `${lead.full_name} became a Hot Lead`,
    })),

  ...leads
    .filter(
      (lead) =>
        (lead.ai_score || 0) >= 90
    )
    .slice(0, 2)
    .map((lead) => ({
      id: `${lead.id}-ai`,
      icon: "🤖",
      text: `AI Score increased for ${lead.full_name}`,
    })),

];
const smartFollowups = leads
  .filter(
    (lead) => lead.ai_score
  )
  .sort(
    (a, b) =>
      (b.ai_score || 0) -
      (a.ai_score || 0)
  )
  .slice(0, 5)
  .map((lead) => ({
    ...lead,

    recommendation:
      lead.ai_score >= 90
        ? "Call Today"
        : lead.ai_score >= 70
        ? "Follow Up Tomorrow"
        : "Nurture This Week",
  }));

  const [lastUpdated] = useState(
  new Date().toLocaleString()
);

  return (
  <>
    <div
  className="min-h-screen p-6 space-y-6"
  style={{
    background:
      "radial-gradient(circle at top, rgba(139,92,246,0.15), transparent 35%), #050816",
  }}
>
   <div className="mb-8">

  <h1 className="
  text-5xl
  font-bold
  text-white
  tracking-tight
  ">
    Analytics Overview
  </h1>

  <p className="text-zinc-400 mt-2 text-lg">
    Real-time insights into your CRM performance
  </p>

</div>

  <div
  className="grid gap-4"
  style={{
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
  }}
>

      <div
  className="
  bg-white/[0.03]
  backdrop-blur-xl
  p-5
  rounded-3xl
  border
  border-white/10

  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  hover:-translate-y-1

  transition-all
  duration-300
"
>
        <p className="text-zinc-400">Total Leads</p>
        <h2 className="text-5xl font-bold text-white">
          {totalLeads}
        </h2>
      </div>

      <div
  className="
  bg-white/[0.03]
  backdrop-blur-xl
  p-5
  rounded-3xl
  border
  border-white/10

  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  hover:-translate-y-1

  transition-all
  duration-300
"
>
       <p className="text-zinc-400">
  Qualified / Hot Leads
</p>
        <h2 className="text-5xl font-bold text-white">
          {hotLeads}
        </h2>
      </div>
      <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-purple-800">
  <p className="text-zinc-400">
    Top Pipeline Stage
  </p>

  <h2 className="text-2xl font-bold text-purple-500 capitalize">
    {topPipelineStage?.status}
  </h2>

  <p className="text-zinc-400 mt-1">
    {topPipelineStage?.count} Leads
  </p>
</div>

      <div
  className="
  bg-white/[0.03]
  backdrop-blur-xl
  p-5
  rounded-3xl
  border
  border-white/10

  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  hover:-translate-y-1

  transition-all
  duration-300
"
>
       <p className="text-zinc-400">
  Warm Leads
</p>

<h2 className="text-5xl font-bold text-yellow-500">
  {warmLeads}
</h2>
      </div>

   <div
  className="
  bg-white/[0.03]
  backdrop-blur-xl
  p-5
  rounded-3xl
  border
  border-white/10

  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  hover:-translate-y-1

  transition-all
  duration-300
"
>
  <p className="text-zinc-400">
    Average AI Score
  </p>

  <h2 className="text-5xl font-bold text-blue-500">
    {averageAiScore}
  </h2>
</div>
<div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-green-800">
  <p className="text-zinc-400">
    Revenue Forecast
  </p>

  <h2 className="text-5xl font-bold text-green-500">
    ₹{forecastRevenue.toLocaleString()}
  </h2>
</div>
<div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-cyan-800">
  <p className="text-zinc-400">
    Predicted Closures
  </p>

  <h2 className="text-5xl font-bold text-cyan-500">
    {predictedClosures}
  </h2>
</div>

      <div
  className="
  bg-white/[0.03]
  backdrop-blur-xl
  p-5
  rounded-3xl
  border
  border-white/10

  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  hover:-translate-y-1

  transition-all
  duration-300
"
>
  <p className="text-zinc-400">
    Follow-up Completion
  </p>

  <h2 className="text-5xl font-bold text-purple-500">
    {completionRate}%
  </h2>
</div>
      

    </div>

    {/* PASTE THE NEW SECTION HERE */}

<div
  className="grid gap-4 mt-8"
  style={{
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
  }}
>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-red-800">
    <p className="text-zinc-400">
      Overdue Followups
    </p>

    <h2 className="text-5xl font-bold text-red-500">
      {overdueFollowups}
    </h2>
  </div>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-yellow-800">
    <p className="text-zinc-400">
      Pending Followups
    </p>

    <h2 className="text-5xl font-bold text-yellow-500">
      {pendingFollowups}
    </h2>
  </div>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-green-800">
    <p className="text-zinc-400">
      Completed Followups
    </p>

    <h2 className="text-5xl font-bold text-green-500">
      {completedFollowups}
    </h2>
  </div>
  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-cyan-800">
  <p className="text-zinc-400">
    Cold Leads
  </p>

  <h2 className="text-5xl font-bold text-cyan-500">
    {coldLeads}
  </h2>
</div>

</div>
<div
  className="
  mt-8
  rounded-[32px]
  border
  border-violet-500/20
  bg-gradient-to-br
  from-violet-500/5
  via-black/20
  bg-gradient-to-br
from-violet-500/10
via-indigo-500/5
to-cyan-500/5
  backdrop-blur-2xl
  p-8
  shadow-[0_0_80px_rgba(139,92,246,0.12)]
"
>
<div
  className="
  mb-8
  rounded-3xl
  border
  border-cyan-500/20
  bg-gradient-to-br
  from-cyan-500/5
  via-violet-500/5
  to-transparent
  backdrop-blur-xl
  p-8
  hover:border-cyan-500/40
  transition-all
  "
>

  <div className="flex items-center gap-3 mb-4">
    <span className="text-2xl">🧠</span>

    <h2 className="text-2xl font-bold text-white">
      AI Executive Summary
    </h2>
  </div>

  <div className="grid grid-cols-4 gap-4 mb-6">

    <div>
      <p className="text-zinc-500 text-sm">
        Total Leads
      </p>

      <p className="text-3xl font-bold text-white">
        {totalLeads}
      </p>
    </div>

    <div>
      <p className="text-zinc-500 text-sm">
        Pipeline Value
      </p>

      <p className="text-3xl font-bold text-green-400">
        ₹{opportunityValue.toLocaleString()}
      </p>
    </div>

    <div>
      <p className="text-zinc-500 text-sm">
        Conversion Rate
      </p>

      <p className="text-3xl font-bold text-cyan-400">
        {totalLeads
          ? Math.round(
              (wonLeads / totalLeads) * 100
            )
          : 0}
        %
      </p>
    </div>

    <div>
      <p className="text-zinc-500 text-sm">
        Best Lead
      </p>

      <p className="text-3xl font-bold text-violet-400">
        {topOpportunity?.full_name}
      </p>
    </div>

  </div>

  <div
    className="
    rounded-2xl
    bg-white/[0.03]
    border
    border-white/10
    p-4
    "
  >

    <p className="text-cyan-300 font-medium">
      🤖 AI Insight
    </p>

    <p className="text-zinc-300 mt-2">
      {topOpportunity?.full_name} is the highest
      probability opportunity in your pipeline.
      Follow up immediately to maximize revenue.
      No overdue opportunities detected.
    </p>

  </div>

</div>
  <h2 className="text-xl font-semibold text-white mb-4">
    🤖 AI Command Center
  </h2>
<div
  className="grid gap-4 mb-8"
  style={{
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
  }}
>

 <div
className="
bg-white/[0.04]
backdrop-blur-xl
rounded-2xl
p-4
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
transition-all
duration-300
"
>
    <p className="text-zinc-500 text-xs uppercase">
      Leads
    </p>
    <p className="text-2xl font-bold text-white">
      {totalLeads}
    </p>
  </div>

 <div
className="
bg-white/[0.04]
backdrop-blur-xl
rounded-2xl
p-4
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
transition-all
duration-300
"
>
    <p className="text-zinc-500 text-xs uppercase">
      Converted
    </p>
    <p className="text-2xl font-bold text-green-400">
      {wonLeads}
    </p>
  </div>

 <div
className="
bg-white/[0.04]
backdrop-blur-xl
rounded-2xl
p-4
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
transition-all
duration-300
"
>
    <p className="text-zinc-500 text-xs uppercase">
      Warm
    </p>
    <p className="text-2xl font-bold text-yellow-400">
      {warmLeads}
    </p>
  </div>

 <div
className="
bg-white/[0.04]
backdrop-blur-xl
rounded-2xl
p-4
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
transition-all
duration-300
"
>
    <p className="text-zinc-500 text-xs uppercase">
      Completed
    </p>
    <p className="text-2xl font-bold text-green-400">
      {completedFollowups}
    </p>
  </div>

 <div
className="
bg-white/[0.04]
backdrop-blur-xl
rounded-2xl
p-4
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
transition-all
duration-300
"
>
    <p className="text-zinc-500 text-xs uppercase">
      Overdue
    </p>
    <p className="text-2xl font-bold text-red-400">
      {overdueCount}
    </p>
  </div>

</div>

<div
  className="grid gap-5 mt-6"
  style={{
    gridTemplateColumns:
      "2fr 1fr 1fr",
  }}
>

  {/* LEFT BIG CARD */}
{topOpportunity && (
  <>
<div
  className="
  lg:col-span-6
  relative
  overflow-hidden
  rounded-3xl
  border
  border-violet-500/20
  bg-gradient-to-br
  from-violet-500/10
  via-indigo-500/5
  bg-gradient-to-br
from-violet-500/10
via-indigo-500/5
to-cyan-500/5
  backdrop-blur-xl
  p-8
  hover:border-violet-500/40
  hover:shadow-[0_0_80px_rgba(139,92,246,0.25)]
  transition-all
  duration-500
  "
>
  <div
  className="
  absolute
  top-0
  right-0
  w-72
  h-72
  bg-violet-500/10
  blur-3xl
  rounded-full
  "
></div>

    <div className="
inline-flex
items-center
px-4
py-2
rounded-full
bg-violet-500/10
border
border-violet-500/20
text-violet-300
text-xs
font-semibold
tracking-wider
mb-4
">
    ✨ AI INSIGHT
    </div>

  <h2 className="text-4xl font-bold text-white leading-tight max-w-2xl">
  {topOpportunity.full_name}
  <br />
  is your strongest opportunity today.
</h2>

   <p className="text-zinc-300 mt-4 text-lg max-w-2xl leading-relaxed">
      High chance to close.
Follow up now to maximize revenue.
    </p>
    <div className="flex gap-2 mt-4">

  <span
    className="
    px-3 py-1
    rounded-full
    bg-green-500/10
    border
    border-green-500/20
    text-green-400
    text-xs
    "
  >
    WON
  </span>

  <span
    className="
    px-3 py-1
    rounded-full
    bg-violet-500/10
    border
    border-violet-500/20
    text-violet-400
    text-xs
    "
  >
    AI {topOpportunity.ai_score}
  </span>

</div>

    <div className="flex gap-3 mt-8">

      <button
        onClick={() =>
          router.push(`/leads/${topOpportunity.id}`)
        }
        className="px-5 py-3 rounded-3xl bg-violet-600 hover:bg-violet-500 transition-all"
      >
        Open Lead
      </button>

      <button
        onClick={() =>
          window.open(
            `https://wa.me/${topOpportunity.phone}`,
            "_blank"
          )
        }
        className="px-5 py-3 rounded-3xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all"
      >
        WhatsApp
      </button>

    </div>

  </div>

  {/* SCORE */}

 <div
  className="
  lg:col-span-3
  rounded-3xl
  border
  border-violet-500/20
  bg-white/[0.03]
  backdrop-blur-xl
  p-6
  hover:-translate-y-1
  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  transition-all
  duration-300
  "
>

    <p className="text-zinc-400 text-sm">
      AI Score
    </p>

    <h2 className="text-5xl font-bold text-violet-400 mt-2">
      {topOpportunity.ai_score}
    </h2>

   <div className="space-y-2">

  <div className="text-green-400 text-sm">
    Excellent
  </div>

  <div className="text-green-400 text-xs">
    ↑ 12% this week
  </div>
  <div className="mt-6 flex items-end gap-1 h-12">

  <div className="w-2 h-3 bg-violet-500 rounded-full"></div>
  <div className="w-2 h-5 bg-violet-500 rounded-full"></div>
  <div className="w-2 h-4 bg-violet-500 rounded-full"></div>
  <div className="w-2 h-8 bg-violet-500 rounded-full"></div>
  <div className="w-2 h-7 bg-violet-500 rounded-full"></div>
  <div className="w-2 h-10 bg-violet-500 rounded-full"></div>

</div>

</div>

  </div>

  {/* REVENUE */}

 <div
  className="
  lg:col-span-3
  rounded-3xl
  border
  border-violet-500/20
  bg-white/[0.03]
  backdrop-blur-xl
  p-6
  hover:-translate-y-1
  hover:border-violet-500/30
  hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]
  transition-all
  duration-300
  "
>

    <p className="text-zinc-400 text-sm">
      Potential Revenue
    </p>

    <h2 className="text-4xl font-bold text-green-400 mt-2">
      ₹{opportunityValue.toLocaleString()}
    </h2>
<div className="space-y-2">

  <div className="text-green-400 text-sm">
    High Value
  </div>

  <div className="text-green-400 text-xs">
    ↑ Revenue Opportunity
  </div>
  <div className="mt-6 flex items-end gap-1 h-12">

  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
  <div className="w-2 h-3 bg-green-500 rounded-full"></div>
  <div className="w-2 h-4 bg-green-500 rounded-full"></div>
  <div className="w-2 h-6 bg-green-500 rounded-full"></div>
  <div className="w-2 h-8 bg-green-500 rounded-full"></div>
  <div className="w-2 h-10 bg-green-500 rounded-full"></div>

</div>

</div>
    

  </div>
  
  </>
)}
</div>

</div>
<div className="mt-8 bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-white/10">

  <h2 className="text-xl font-semibold text-white mb-4">
    📈 Recent Activity
  </h2>

{recentActivity.map((lead) => (

<div
  key={lead.id}
  className="
  flex
  items-center
  justify-between
  bg-white/[0.03]
  rounded-2xl
  p-4
  mb-3
  border
  border-white/10
  hover:border-violet-500/20
  hover:-translate-y-1
  transition-all
  "
>

  <div>

    <p className="text-white font-medium">
      {lead.full_name}
    </p>

    <p className="text-zinc-400 text-sm">
      {lead.status === "hot" && "🔥 Became Hot Lead"}
      {lead.status === "warm" && "📞 Follow-up Required"}
      {lead.status === "qualified" && "🎯 Lead Qualified"}
      {lead.status === "won" && "✅ Deal Closed"}
      {lead.status === "lost" && "❌ Opportunity Lost"}
    </p>

  </div>

  <span className="text-zinc-500 text-sm">
    {new Date(lead.created_at).toLocaleDateString()}
  </span>

</div>

))}
</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-red-800">

  <h2 className="text-xl font-semibold text-white mb-6">
    🚨 Follow-Up Action Center
  </h2>

  {actionLeads.map((lead) => (

   <div
key={lead.id}
className="
flex
justify-between
items-center
bg-gradient-to-r
from-red-500/5
to-transparent
rounded-2xl
p-5
mb-3
border
border-red-500/10
hover:border-red-500/30
hover:-translate-y-1
transition-all
"
>

   <div>

  <div className="flex items-center gap-2 mb-1">

    <span
      className="
      px-2
      py-1
      rounded-full
      bg-red-500/10
      text-red-400
      text-xs
      "
    >
      ACTION
    </span>

    <p className="text-white font-medium">
      {lead.full_name}
    </p>

  </div>

  <p className="text-zinc-400 text-sm">
    {lead.status === "hot"
      ? "🔥 High Priority"
      : "📞 Follow-up Required"}
  </p>

</div>

<div className="flex gap-2">

  <button
    onClick={() =>
      router.push(`/leads/${lead.id}`)
    }
    className="
    px-4
    py-2
    rounded-xl
    bg-violet-600
    hover:bg-violet-500
    text-sm
    transition-all
    "
  >
    Open
  </button>

  <button
    onClick={() =>
      window.open(
        `https://wa.me/${lead.phone}`,
        "_blank"
      )
    }
    className="
    px-4
    py-2
    rounded-xl
    border
    border-green-500/30
    text-green-400
    hover:bg-green-500/10
    text-sm
    transition-all
    "
  >
    WhatsApp
  </button>

</div>
    </div>

  ))}
</div>
<div className="mt-8 bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-green-800">
  <h2 className="text-2xl font-semibold text-white mb-6">
    🏆 Top Opportunities
  </h2>

  {topOpportunities.map((lead) => (
    <div
      key={lead.id}
      className="
flex
justify-between
items-center
bg-gradient-to-r
from-violet-500/5
to-transparent
rounded-2xl
p-5
mb-3
border
border-white/10
hover:border-violet-500/30
hover:-translate-y-1
transition-all
"
    >
      <div>
        <p className="text-white font-semibold">
          {lead.full_name}
        </p>

       <span
  className={`px-3 py-1 rounded-full text-xs font-semibold ${
    lead.status === "hot"
      ? "bg-red-500/20 text-red-400"
      : lead.status === "warm"
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-purple-500/20 text-purple-400"
  }`}
>
  {lead.status.toUpperCase()}
</span>
      </div>

      <div className="flex items-center gap-3">
       <span
  className="
  px-3
  py-1
  rounded-full
  bg-green-500/10
  text-green-400
  text-xs
  font-semibold
  "
>
  AI {lead.ai_score}
</span>

    <span
  className="
  px-3
  py-1
  rounded-full
  bg-yellow-500/10
  text-yellow-400
  text-xs
  font-semibold
  "
>
  ₹50,000
</span>

       <button
  className="
    bg-green-600
    hover:bg-green-500
    transition-all
    duration-200
    text-white
    px-4
    py-2
    rounded-lg
    font-semibold
  "
          onClick={() =>
            window.open(
              `https://wa.me/${lead.phone}`,
              "_blank"
            )
          }
        >
         💬 WhatsApp
        </button>
        <button
  className="
    bg-purple-600
    hover:bg-purple-500
    transition-all
    duration-200
    text-white
    px-4
    py-2
    rounded-lg
    font-semibold
  "
  onClick={async () => {
const proposalData =
  getBusinessProposal(lead);
const proposal = `
${proposalData.projectType.toUpperCase()} PROPOSAL

Prepared For:
${lead.full_name}

----------------------------------

PROJECT OVERVIEW

Thank you for your interest in our services.

Based on our discussion, we understand that you are looking for a professional business website that will help strengthen your online presence and generate more customer inquiries.

----------------------------------

SCOPE OF WORK

${proposalData.scope}

----------------------------------

PROJECT TIMELINE

Estimated Completion:

5 - 7 Business Days

----------------------------------

INVESTMENT

Project Cost:

₹${(
  lead.estimated_value || 50000
).toLocaleString()}

----------------------------------

NEXT STEPS

1. Project Discussion

2. Content Collection

3. Design Approval

4. Development

5. Launch

----------------------------------

Thank you for considering our services.

We look forward to working with you.

LeadFlow AI
`;
    setProposalText(proposal);
    console.log("MODAL OPEN TEST");
    setProposalModal(true);
try {

  const { data, error } = await supabase
    .from("proposal_history")
    .insert({
      lead_id: lead.id,
      proposal_text: proposal,
      proposal_type:
        proposalData.projectType,
      proposal_value:
        lead.estimated_value || 50000,
      status: "generated",
    });

  console.log(data);
  console.log(error);

} catch (err) {

  console.error(err);

}
  
  }}
>
  📄 Proposal
</button>
<button
  className="
    bg-blue-600
    hover:bg-blue-500
    text-white
    px-4
    py-2
    rounded-lg
    font-semibold
  "
  onClick={() => {

    const message = `
Hi ${lead.full_name},

I hope you're doing well.

I've prepared a proposal based on our discussion.

I'd be happy to walk you through the details and answer any questions.

Would you like to schedule a quick call this week?

Regards,
LeadFlow AI
`;

    setFollowupText(message);
    setFollowupModal(true);

  }}
>
  ✨ Follow-Up
</button>
      </div>
    </div>

  ))}
</div>
<div className="mt-8 bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-red-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    📈 Deals Closing This Week
  </h2>

  <div className="mb-6">
    <p className="text-zinc-400">
      Expected Revenue
    </p>

    <h3 className="text-4xl font-bold text-green-400">
      ₹{weeklyRevenue.toLocaleString()}
    </h3>

    <p className="text-cyan-400 mt-2">
      Close Probability: {closeProbability}%
    </p>
  </div>

  {closingLeads.map((lead, index) => (

    <div
      key={lead.id}
      className="flex justify-between items-center py-3 border-b border-white/10"
    >

<div className="flex justify-between items-center w-full">

  <div>

    <p className="text-white font-medium">

      {index === 0 && "🥇 "}
      {index === 1 && "🥈 "}
      {index === 2 && "🥉 "}

      {lead.full_name}

    </p>

    <p className="text-zinc-400 text-sm">
      AI Score: {lead.ai_score}
    </p>

  </div>

  <div className="text-right">

    <p className="text-green-400 font-bold text-xl">
      ₹{(lead.estimated_value || 50000).toLocaleString()}
    </p>

    <p className="text-cyan-400 text-sm">
      Closing Soon
    </p>

  </div>

</div>

    </div>

  ))}

</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-blue-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    📄 Proposal History
  </h2>

  {proposalHistory.slice(0, 10).map((proposal: any) => (

 <div
  key={proposal.id}
  onClick={() => {
    setProposalText(
      proposal.proposal_text
    );
    setProposalModal(true);
  }}
  className="
    flex
    justify-between
    items-center
    py-4
    border-b
    border-white/10
    cursor-pointer
    hover:bg-zinc-800/40
    transition-all
  "
>

     <div>
  <p className="text-white font-medium">
    {proposal.proposal_type}
  </p>

  <p className="text-zinc-400 text-sm">
    Prepared For: {topOpportunity?.full_name}
  </p>

  <p className="text-zinc-500 text-sm">
    {new Date(
      proposal.generated_at
    ).toLocaleString()}
  </p>
  <div className="flex gap-2">

  <button
    onClick={(e) => {
      e.stopPropagation();

      setProposalText(
        proposal.proposal_text
      );

      setProposalModal(true);
    }}
    className="text-cyan-400"
  >
    👁 View
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();

      navigator.clipboard.writeText(
        proposal.proposal_text
      );

      alert("Proposal copied");
    }}
    className="text-green-400"
  >
    📋 Copy
  </button>

</div>
</div>

  <div className="flex items-center gap-2">

  <span
    className={`capitalize px-2 py-1 rounded text-xs ${
      proposal.status === "won"
        ? "bg-green-600 text-white"
        : proposal.status === "lost"
        ? "bg-red-600 text-white"
        : "bg-cyan-600 text-white"
    }`}
  >
    {proposal.status}
  </span>

  {proposal.status === "generated" && (
    <>
      <button
        onClick={async (e) => {
          e.stopPropagation();

          await supabase
            .from("proposal_history")
            .update({
              status: "won",
            })
            .eq("id", proposal.id);

          fetchProposalHistory();
        }}
        className="bg-green-600 px-2 py-1 rounded text-xs text-white"
      >
        Won
      </button>

      <button
        onClick={async (e) => {
          e.stopPropagation();

          await supabase
            .from("proposal_history")
            .update({
              status: "lost",
            })
            .eq("id", proposal.id);

          fetchProposalHistory();
        }}
        className="bg-red-600 px-2 py-1 rounded text-xs text-white"
      >
        Lost
      </button>
    </>
  )}

</div>

    </div>

  ))}

</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-yellow-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    🔔 Notification Center
  </h2>

{notifications.length === 0 ? (

  <div
    className="
    bg-white/[0.03]
    rounded-2xl
    p-5
    border
    border-white/10
    text-zinc-400
    "
  >
    No notifications
  </div>

) : (

  notifications.map((item, index) => (

    <div
      key={item.id}
      className="
      flex
      justify-between
      items-center
      bg-white/[0.03]
      rounded-2xl
      p-4
      mb-3
      border
      border-white/10
      hover:border-yellow-500/20
      hover:-translate-y-1
      transition-all
      "
    >

      <div>

        <div className="flex items-center gap-2 mb-2">

          <span
            className={`
            px-2
            py-1
            rounded-full
            text-xs
            font-semibold
            ${
              index === 0
                ? "bg-red-500/20 text-red-400"
                : index === 1
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-cyan-500/20 text-cyan-400"
            }
            `}
          >
            {index === 0
              ? "HIGH"
              : index === 1
              ? "MEDIUM"
              : "LOW"}
          </span>

          <span className="text-white">
            {item.icon}
          </span>

        </div>

        <p className="text-white">
          {item.text}
        </p>

      </div>

      <div className="text-right">

        <p className="text-zinc-500 text-sm">
          {index === 0
            ? "2 mins ago"
            : index === 1
            ? "15 mins ago"
            : "1 hour ago"}
        </p>

      </div>

    </div>

  ))

)}

</div>
<div className="mt-8 bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-cyan-500/20">

  <h2 className="text-2xl font-semibold text-white mb-8">
    📊 Conversion Funnel
  </h2>

  <div className="space-y-4">

    {funnelData.map((step, index) => (

      <div key={step.label}>

       <div
  className={`
  bg-gradient-to-r
  ${step.color}
  rounded-2xl
  p-5
  flex
  justify-between
  items-center
  shadow-lg
  hover:scale-[1.02]
  transition-all
  `}
style={{
  width:
    index === 0
      ? "100%"
      : index === 1
      ? "90%"
      : index === 2
      ? "80%"
      : "70%",
  margin: "0 auto",
}}
>

          <div>

            <p className="text-white/80 text-sm">
              Stage
            </p>

            <h3 className="text-white text-xl font-bold">
  {step.label}
</h3>

<p className="text-white/70 text-xs">
  {totalLeads > 0
    ? `${Math.round(
        (step.value / totalLeads) * 100
      )}%`
    : "0%"}
</p>

          </div>

          <div className="text-right">

            <p className="text-white/80 text-sm">
              Leads
            </p>

            <p className="text-3xl font-bold text-white">
              {step.value}
            </p>

          </div>

        </div>

        {index !== funnelData.length - 1 && (

          <div className="flex justify-center py-2">

            <div className="text-cyan-400 text-2xl">
              ↓
            </div>

          </div>

        )}

      </div>

    ))}

  </div>

</div>
<div className="mt-8 bg-white/[0.03] backdrop-blur-xl p-6 rounded-3xl border border-orange-500/20">

  <h2 className="text-2xl font-semibold text-white mb-6">
    🎯 AI Opportunity Radar
  </h2>

  {hotRadarLeads.length === 0 ? (

    <p className="text-zinc-400">
      No high-priority opportunities detected.
    </p>

  ) : (

    hotRadarLeads.map((lead) => (

      <div
        key={lead.id}
        className="
        flex
        justify-between
        items-center
        bg-gradient-to-r
        from-orange-500/5
        to-transparent
        rounded-2xl
        p-4
        mb-3
        border
        border-orange-500/10
        hover:border-orange-500/30
        transition-all
        "
      >

        <div>

         <div className="flex items-center gap-2">

  <span
    className="
    px-2
    py-1
    rounded-full
    bg-orange-500/20
    text-orange-400
    text-xs
    font-semibold
    "
  >
    HOT
  </span>

  <p className="text-white font-semibold">
    {lead.full_name}
  </p>

</div>

          <p className="text-orange-400 text-sm">
            AI Score {lead.ai_score}
          </p>

        </div>

    <button
  onClick={() =>
    router.push(`/leads/${lead.id}`)
  }
  className="
  px-5
  py-3
  rounded-2xl
  bg-gradient-to-r
  from-orange-500
  to-amber-500
  text-white
  font-semibold
  shadow-[0_0_25px_rgba(249,115,22,0.35)]
  hover:shadow-[0_0_40px_rgba(249,115,22,0.55)]
  hover:scale-105
  transition-all
  duration-300
  "
>
  🔥 Review Lead
</button>

      </div>

    ))

  )}

</div>
<div
className="
mt-8
rounded-3xl
border
border-violet-500/20
bg-gradient-to-r
from-violet-500/10
bg-gradient-to-br
from-violet-500/10
via-indigo-500/5
to-cyan-500/5
backdrop-blur-xl
p-8
"
>

  <div className="flex items-center gap-3 mb-6">
    <span className="text-3xl">🤖</span>

    <h2 className="text-3xl font-bold text-white">
      AI Executive Summary
    </h2>
  </div>

 <div
  className="grid gap-4"
  style={{
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
  }}
>

    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-zinc-400 text-sm">
        Leads Captured
      </p>

      <p className="text-3xl font-bold text-white">
        {totalLeads}
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-zinc-400 text-sm">
        High Priority
      </p>

      <p className="text-3xl font-bold text-red-400">
        {hotLeads}
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-zinc-400 text-sm">
        Revenue Potential
      </p>

      <p className="text-3xl font-bold text-green-400">
        ₹{weeklyRevenue.toLocaleString()}
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-zinc-400 text-sm">
        Conversion Rate
      </p>

      <p className="text-3xl font-bold text-cyan-400">
        {closeProbability}%
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-4">
      <p className="text-zinc-400 text-sm">
        Best Lead
      </p>

      <p className="text-2xl font-bold text-violet-400">
        {topOpportunity?.full_name}
      </p>
    </div>

  </div>

</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-blue-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    📅 Smart Follow-Up Scheduler
  </h2>

{smartFollowups.map((lead, index) => (

  <div
    key={lead.id}
    className="
    flex
    justify-between
    items-center
    bg-white/[0.03]
    backdrop-blur-xl
    rounded-2xl
    p-5
    mb-3
    border
    border-white/10
    hover:border-blue-500/30
    hover:-translate-y-1
    transition-all
    "
  >
     <div>

  <div className="flex items-center gap-2 mb-1">

    <span
      className={`
      px-2
      py-1
      rounded-full
      text-xs
      font-semibold
      ${
        index === 0
          ? "bg-red-500/20 text-red-400"
          : index === 1
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-cyan-500/20 text-cyan-400"
      }
      `}
    >
      {index === 0
        ? "TODAY"
        : index === 1
        ? "TOMORROW"
        : "THIS WEEK"}
    </span>

    <p className="text-white font-semibold">
      {lead.full_name}
    </p>

  </div>

  <p className="text-zinc-400 text-sm">
    AI Score: {lead.ai_score}
  </p>
<p className="text-cyan-400 text-xs mt-1">
  Recommended by AI based on engagement activity
</p>
</div>

<button
  onClick={() =>
    window.open(
      `https://wa.me/${lead.phone}`,
      "_blank"
    )
  }
  className="
  px-6
  py-3
  rounded-2xl
  bg-gradient-to-r
  from-violet-600
  to-purple-500
  text-white
  font-semibold
  shadow-[0_0_25px_rgba(139,92,246,0.35)]
  hover:shadow-[0_0_40px_rgba(139,92,246,0.55)]
  hover:scale-105
  transition-all
  duration-300
  "
>
  ✨ {lead.recommendation}
</button>

    </div>

  ))}

</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
  <h2 className="text-xl font-semibold text-white mb-4">
    Today's Tasks
  </h2>

  {todaysTasks.length === 0 ? (
   <p className="text-zinc-400">
  🎉 No follow-ups due today
</p>
  ) : (
    todaysTasks.map((task) => (
      <div
        key={task.id}
        className="flex justify-between py-3 border-b border-white/10"
      >
        <span className="text-white">
          {task.title}
        </span>

        <span className="text-yellow-500">
          Pending
        </span>
      </div>
    ))
  )}
</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
  <h2 className="text-xl font-semibold text-white mb-6">
    Pipeline Analytics
  </h2>

  <div style={{ width: "100%", height: 350 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pipelineData}>
        <CartesianGrid
 stroke="#27272a"
  strokeDasharray="3 3"
  vertical={false}
/>
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip
  contentStyle={{
    backgroundColor: "#09090b",
    border: "1px solid #8b5cf6",
    borderRadius: "12px",
    color: "#fff",
  }}
  labelStyle={{
    color: "#fff",
  }}
/>

<Bar
  dataKey="count"
  fill="#8b5cf6"
  radius={[20,20,0,0]}
/>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
<div
  className="grid gap-6 mt-8"
  style={{
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
  }}
>

  {/* Lead Sources */}

  <div className="bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
    <h2 className="text-xl font-semibold text-white mb-6">
      Lead Sources Chart
    </h2>

    <div style={{ width: "100%", height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
         <Pie
  data={sourceChartData}
  dataKey="value"
  nameKey="name"
  innerRadius={70}
  outerRadius={120}
  paddingAngle={5}
  stroke="none"
>
            {sourceChartData.map((_, index) => (
              <Cell
                key={index}
                fill={
                  [
                    "#a855f7",
                    "#3b82f6",
                    "#22c55e",
                    "#f59e0b",
                  ][index % 4]
                }
              />
            ))}
          </Pie>

         <text
  x="50%"
  y="48%"
  textAnchor="middle"
  dominantBaseline="middle"
  fill="#ffffff"
  fontSize="26"
  fontWeight="bold"
>
  {totalLeads}
</text>

<text
  x="50%"
  y="58%"
  textAnchor="middle"
  dominantBaseline="middle"
  fill="#71717a"
  fontSize="12"
>
  Total Leads
</text>

<Tooltip
  contentStyle={{
    backgroundColor: "#09090b",
    border: "1px solid #8b5cf6",
    borderRadius: "12px",
    color: "#fff",
  }}
/>

<Legend
  wrapperStyle={{
    color: "#fff",
    paddingTop: 20,
  }}
/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Follow-up Health */}

  <div className="bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
    <h2 className="text-xl font-semibold text-white mb-6">
      Follow-up Health
    </h2>

    <div style={{ width: "100%", height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
  data={followupChartData}
  dataKey="value"
  nameKey="name"
  innerRadius={70}
  outerRadius={120}
  paddingAngle={5}
  stroke="none"
>
            <Cell fill="#22c55e" />
            <Cell fill="#f59e0b" />
            <Cell fill="#ef4444" />
          </Pie>

          <text
  x="50%"
  y="48%"
  textAnchor="middle"
  dominantBaseline="middle"
  fill="#ffffff"
  fontSize="24"
  fontWeight="bold"
>
  {completedFollowups}
</text>

<text
  x="50%"
  y="58%"
  textAnchor="middle"
  dominantBaseline="middle"
  fill="#71717a"
  fontSize="12"
>
  Completed
</text>

<Tooltip
  contentStyle={{
    backgroundColor: "#09090b",
    border: "1px solid #22c55e",
    borderRadius: "12px",
    color: "#fff",
  }}
/>

<Legend
  wrapperStyle={{
    color: "#fff",
    paddingTop: 20,
  }}
/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
{/* <div className="bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10 mt-6">
  <h2 className="text-xl font-semibold text-white mb-6">
    AI Lead Temperature
  </h2>

  <div style={{ width: "100%", height: 350 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={temperatureChartData}
          dataKey="value"
          nameKey="name"
          outerRadius={120}
          label
        >
          <Cell fill="#ef4444" />
          <Cell fill="#f59e0b" />
          <Cell fill="#06b6d4" />
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div> */}

</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
  <h2 className="text-xl font-semibold text-white mb-6">
    Lead Growth Trend
  </h2>

  <div style={{ width: "100%", height: 350 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
  data={leadTrendData}
  margin={{
    top: 20,
    right: 20,
    left: 0,
    bottom: 0,
  }}
> 
      <XAxis
  dataKey="day"
  stroke="#71717a"
  tick={{ fill: "#71717a" }}
  axisLine={false}
  tickLine={false}
/>
      <YAxis
  stroke="#71717a"
  tick={{ fill: "#71717a" }}
  axisLine={false}
  tickLine={false}
/>
      <Tooltip
  contentStyle={{
    backgroundColor: "#09090b",
    border: "1px solid #8b5cf6",
    borderRadius: "12px",
    color: "#fff",
  }}
/>

        <Line
          type="monotone"
          dataKey="leads"
          stroke="#a855f7"
          strokeWidth={3}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
  <h2 className="text-xl font-semibold text-white mb-6">
    Recent Leads
  </h2>

  {recentLeads.map((lead) => (
    <div
      key={lead.id}
      className="
flex
justify-between
items-center
bg-white/[0.03]
backdrop-blur-xl
rounded-2xl
p-4
mb-3
border
border-white/10
hover:border-violet-500/20
transition-all
"
    >
      <div>
        <p className="text-white font-medium">
          {lead.name || lead.full_name}
        </p>

        <p className="text-zinc-400 text-sm">
          {lead.source}
        </p>
      </div>

      <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-sm capitalize">
        {lead.status}
      </span>
    </div>
  ))}
</div>
<div className="mt-8 bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl border border-white/10">
  <h2 className="text-xl font-semibold text-white mb-6">
    Best Leads To Call Today
  </h2>

  {bestLeads.map((lead) => (
    <div
      key={lead.id}
      className="
flex
justify-between
items-center
bg-white/[0.03]
backdrop-blur-xl
rounded-2xl
p-4
mb-3
border
border-white/10
hover:border-violet-500/20
transition-all
"
    >
      <div>
        <p className="text-white font-medium">
          {lead.full_name}
        </p>

        <p className="text-zinc-400 text-sm">
          AI Score: {lead.ai_score}
        </p>
        
      </div>

<button
  className={`
    px-3 py-1 rounded-full text-white text-sm
    cursor-pointer hover:opacity-80
    ${
      lead.ai_score >= 90
        ? "bg-green-600"
        : lead.ai_score >= 70
        ? "bg-yellow-600"
        : "bg-blue-600"
    }
  `}
 onClick={() =>
  window.open(
    `https://wa.me/${lead.phone}`,
    "_blank"
  )
}
>
  {lead.ai_score >= 90
    ? "🔥 Call Now"
    : lead.ai_score >= 70
    ? "📞 Follow Up"
    : "✉️ Nurture"}
</button>
    </div>
  ))}
</div>
 </div>
 <div
  className="grid gap-4 mt-6"
  style={{
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
  }}
>
{/* 
  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-purple-800">
    <p className="text-zinc-400">
      Proposals Generated
    </p>

    <h2 className="text-5xl font-bold text-purple-500">
      {totalProposals}
    </h2>
  </div>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-green-800">
    <p className="text-zinc-400">
      Proposal Value
    </p>

    <h2 className="text-5xl font-bold text-green-500">
      ₹{totalProposalValue.toLocaleString()}
    </h2>
  </div>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-yellow-800">
    <p className="text-zinc-400">
      Highest Proposal
    </p>

    <h2 className="text-5xl font-bold text-yellow-500">
      ₹{highestProposal.toLocaleString()}
    </h2>
  </div>

  <div className="bg-white/[0.03]
backdrop-blur-xl p-5 rounded-3xl border border-cyan-800">
    <p className="text-zinc-400">
      Avg Proposal Value
    </p>

    <h2 className="text-5xl font-bold text-cyan-500">
      ₹{averageProposalValue.toLocaleString()}
    </h2>
  </div> */}

</div>

{proposalModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6 overflow-y-auto">

    <div className="bg-white/[0.03]
backdrop-blur-xl p-8rounded-3xl w-[800px] max-w-[90vw] border border-purple-700">
      

      <h2 className="text-2xl text-white mb-4">
        AI Proposal
      </h2>

   <div
  className="
    bg-zinc-800
    rounded-lg
    p-6
    h-[450px]
    overflow-y-auto
    whitespace-pre-wrap
    text-white
    leading-7
  "
>
  {proposalText}
</div>
    <div className="flex justify-end gap-3 mt-4">

  <button
    onClick={() => {
      navigator.clipboard.writeText(
        proposalText
      );
      alert("Proposal copied!");
    }}
    className="bg-green-600 text-white px-4 py-2 rounded-lg"
  >
    📋 Copy
  </button>
  
<button
  onClick={() => {

    const encodedProposal =
      encodeURIComponent(
        proposalText
      );

    window.open(
      `https://wa.me/?text=${encodedProposal}`,
      "_blank"
    );

  }}
  className="bg-green-600 text-white px-4 py-2 rounded-lg"
>
  💬 WhatsApp
</button>
<button
  onClick={() => {

    const doc = new jsPDF();

    doc.setFontSize(14);

    const lines =
      doc.splitTextToSize(
        proposalText,
        180
      );

    doc.text(
      lines,
      10,
      20
    );

    doc.save(
      "proposal.pdf"
    );

  }}
  className="bg-cyan-600 text-white px-4 py-2 rounded-lg"
>
  📥 PDF
</button>
  <button
    onClick={() =>
      setProposalModal(false)
    }
    className="bg-red-600 text-white px-4 py-2 rounded-lg"
  >
    Close
  </button>

</div>

    </div>

  </div>
)}
{followupModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

    <div className="bg-white/[0.03]
backdrop-blur-xl p-6 rounded-3xl w-[700px] max-h-[80vh] overflow-auto">

      <h2 className="text-2xl font-bold text-white mb-4">
        🤖 AI Follow-Up
      </h2>

      <div className="bg-zinc-800 p-4 rounded-lg text-white whitespace-pre-wrap">
        {followupText}
      </div>

      <div className="flex justify-end gap-3 mt-4">

        <button
          onClick={() => {
            navigator.clipboard.writeText(
              followupText
            );
            alert("Follow-up copied!");
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          📋 Copy
        </button>

        <button
          onClick={() =>
            setFollowupModal(false)
          }
          className="bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Close
        </button>

      </div>

    </div>

  </div>
)}
</>
);
}