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
    <div
  className="grid gap-4 mt-4"
  style={{
    gridTemplateColumns:
      "repeat(5,minmax(0,1fr))",
  }}
>

  <div className="bg-zinc-900 p-5 rounded-xl border border-blue-800">
    <p className="text-zinc-400">
      Generated
    </p>

    <h2 className="text-3xl font-bold text-blue-500">
      {totalProposals}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-green-800">
    <p className="text-zinc-400">
      Won
    </p>

    <h2 className="text-3xl font-bold text-green-500">
      {wonProposals}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-red-800">
    <p className="text-zinc-400">
      Lost
    </p>

    <h2 className="text-3xl font-bold text-red-500">
      {lostProposals}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-yellow-800">
    <p className="text-zinc-400">
      Pending
    </p>

    <h2 className="text-3xl font-bold text-yellow-500">
      {pendingProposals}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-purple-800">
    <p className="text-zinc-400">
      Conversion Rate
    </p>

    <h2 className="text-3xl font-bold text-purple-500">
      {proposalConversionRate}%
    </h2>
  </div>

</div>

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
  (lead) => lead.status === "won"
).length;

const lostLeads = leads.filter(
  (lead) => lead.status === "lost"
).length;
const activeLeads =
  totalLeads - wonLeads - lostLeads;

const conversionRate =
  totalLeads > 0
    ? ((wonLeads / totalLeads) * 100).toFixed(1)
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
  .filter(
    (lead) => lead.ai_score !== null
  )
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
  "hot",
  "negotiation",
  "won",
  "lost",
]
  .map((status) => ({
    status,
    count: leads.filter(
      (lead) => lead.status === status
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
      lead.status === "unresponsive"
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
    const estimatedHotValue = 50000;

const estimatedWarmValue = 25000;

const forecastRevenue =
  hotLeads * estimatedHotValue +
  warmLeads * estimatedWarmValue;
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
  console.log(proposalHistory);
  
  return (
  <>
    <div className="p-6">
    <h1 className="text-3xl font-bold text-white mb-4">
      Analytics Dashboard
    </h1>

  <div
  className="grid gap-4"
  style={{
    gridTemplateColumns:
      "repeat(7,minmax(0,1fr))",
  }}
>

      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
        <p className="text-zinc-400">Total Leads</p>
        <h2 className="text-3xl font-bold text-white">
          {totalLeads}
        </h2>
      </div>

      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
       <p className="text-zinc-400">
  Qualified / Hot Leads
</p>
        <h2 className="text-3xl font-bold text-white">
          {hotLeads}
        </h2>
      </div>
      <div className="bg-zinc-900 p-5 rounded-xl border border-purple-800">
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

      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
       <p className="text-zinc-400">
  Warm Leads
</p>

<h2 className="text-3xl font-bold text-yellow-500">
  {warmLeads}
</h2>
      </div>

   <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
  <p className="text-zinc-400">
    Average AI Score
  </p>

  <h2 className="text-3xl font-bold text-blue-500">
    {averageAiScore}
  </h2>
</div>
<div className="bg-zinc-900 p-5 rounded-xl border border-green-800">
  <p className="text-zinc-400">
    Revenue Forecast
  </p>

  <h2 className="text-3xl font-bold text-green-500">
    ₹{forecastRevenue.toLocaleString()}
  </h2>
</div>
<div className="bg-zinc-900 p-5 rounded-xl border border-cyan-800">
  <p className="text-zinc-400">
    Predicted Closures
  </p>

  <h2 className="text-3xl font-bold text-cyan-500">
    {predictedClosures}
  </h2>
</div>

      <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
  <p className="text-zinc-400">
    Follow-up Completion
  </p>

  <h2 className="text-3xl font-bold text-purple-500">
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

  <div className="bg-zinc-900 p-5 rounded-xl border border-red-800">
    <p className="text-zinc-400">
      Overdue Followups
    </p>

    <h2 className="text-3xl font-bold text-red-500">
      {overdueFollowups}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-yellow-800">
    <p className="text-zinc-400">
      Pending Followups
    </p>

    <h2 className="text-3xl font-bold text-yellow-500">
      {pendingFollowups}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-green-800">
    <p className="text-zinc-400">
      Completed Followups
    </p>

    <h2 className="text-3xl font-bold text-green-500">
      {completedFollowups}
    </h2>
  </div>
  <div className="bg-zinc-900 p-5 rounded-xl border border-cyan-800">
  <p className="text-zinc-400">
    Cold Leads
  </p>

  <h2 className="text-3xl font-bold text-cyan-500">
    {coldLeads}
  </h2>
</div>

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-purple-800">

  <h2 className="text-xl font-semibold text-white mb-4">
    🧠 AI Insight
  </h2>

  {topOpportunity && (
    <>
      <p className="text-white text-lg font-semibold">
        {topOpportunity.full_name}
      </p>

      <div className="flex items-center gap-3 mt-2">

  <p className="text-green-400">
    AI Score: {topOpportunity.ai_score}
  </p>

 <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
  🔥 HIGH PRIORITY
</span>

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">

  <h2 className="text-xl font-semibold text-white mb-4">
    📈 Recent Activity
  </h2>

  {recentActivity.map((lead) => (
 <div
  key={lead.id}
  className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800"
>
      <div>
        <p className="text-white">
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
  {new Date(
    lead.created_at
  ).toLocaleDateString()}
</span>
    </div>
  ))}
</div>

      <p className="text-zinc-300 mt-4">
        {topOpportunity.ai_next_action}
      </p>
<p className="text-zinc-500 mt-4 text-sm">
  {topOpportunity.ai_summary}
</p>
      <p className="text-yellow-400 mt-4">
        Potential Revenue:
        ₹{opportunityValue.toLocaleString()}
      </p>

 <div className="flex items-center gap-4 mt-4">

  <button
    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white"
    onClick={() =>
      router.push(
        `/leads/${topOpportunity.id}`
      )
    }
  >
    Open Lead
  </button>

 <button
 className="
bg-purple-600
hover:bg-purple-500
hover:scale-105
transition-all
duration-200
text-white
px-5
py-2
rounded-lg
font-semibold
shadow-lg
hover:shadow-purple-500/50
"
  onClick={() =>
    window.open(
      `https://wa.me/${topOpportunity.phone}`,
      "_blank"
    )
  }
>
  💬 WhatsApp
</button>

</div>
    </>
  )}

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-red-800">

  <h2 className="text-xl font-semibold text-white mb-6">
    🚨 Follow-Up Action Center
  </h2>

  {actionLeads.map((lead) => (

    <div
      key={lead.id}
      className="flex justify-between items-center py-4 border-b border-zinc-800"
    >

      <div>
        <p className="text-white font-medium">
          {lead.full_name}
        </p>

        <p className="text-zinc-400 text-sm">
          {lead.status === "hot"
            ? "🔥 High Priority"
            : "📞 Follow-up Required"}
        </p>
      </div>

 

  

    </div>

  ))}
</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-green-800">
  <h2 className="text-2xl font-semibold text-white mb-6">
    🏆 Top Opportunities
  </h2>

  {topOpportunities.map((lead) => (
    <div
      key={lead.id}
      className="flex justify-between items-center py-4 border-b border-zinc-800"
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

      <div className="flex items-center gap-6">
        <span className="text-green-400 font-bold">
          AI {lead.ai_score}
        </span>

        <span className="text-yellow-400">
          ₹{(
            lead.estimated_value || 50000
          ).toLocaleString()}
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
          WhatsApp
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
  🤖 AI Follow-Up
</button>
      </div>
    </div>

  ))}
</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-cyan-800">

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
      className="flex justify-between items-center py-3 border-b border-zinc-800"
    >

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

      <span className="text-green-400 font-semibold">
        ₹
        {(
          lead.estimated_value ||
          50000
        ).toLocaleString()}
      </span>

    </div>

  ))}

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-blue-800">

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
    border-zinc-800
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
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-yellow-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    🔔 Notification Center
  </h2>

  {notifications.length === 0 ? (

    <p className="text-zinc-400">
      No notifications
    </p>

  ) : (

    notifications.map((item) => (

      <div
        key={item.id}
        className="py-4 border-b border-zinc-800"
      >

        <p className="text-white">
          {item.icon} {item.text}
        </p>

      </div>

    ))

  )}

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-blue-800">

  <h2 className="text-2xl font-semibold text-white mb-6">
    📅 Smart Follow-Up Scheduler
  </h2>

  {smartFollowups.map((lead) => (

    <div
      key={lead.id}
      className="flex justify-between items-center py-4 border-b border-zinc-800"
    >

      <div>

        <p className="text-white font-semibold">
          {lead.full_name}
        </p>

        <p className="text-zinc-400 text-sm">
          AI Score: {lead.ai_score}
        </p>

      </div>

      <button
  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
    lead.ai_score >= 90
      ? "bg-red-600 text-white"
      : lead.ai_score >= 70
      ? "bg-yellow-600 text-white"
      : "bg-blue-600 text-white"
  }`}
  onClick={() =>
    window.open(
      `https://wa.me/${lead.phone}`,
      "_blank"
    )
  }
>
  {lead.recommendation}
</button>

    </div>

  ))}

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
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
        className="flex justify-between py-3 border-b border-zinc-800"
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
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
  <h2 className="text-xl font-semibold text-white mb-6">
    Pipeline Analytics
  </h2>

  <div style={{ width: "100%", height: 350 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pipelineData}>
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip />

        <Bar
          dataKey="count"
          fill="#a855f7"
          radius={[4, 4, 0, 0]}
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

  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
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
            outerRadius={120}
            label
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

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Follow-up Health */}

  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
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
            outerRadius={120}
            label
          >
            <Cell fill="#22c55e" />
            <Cell fill="#f59e0b" />
            <Cell fill="#ef4444" />
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
<div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 mt-6">
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
</div>

</div>
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
  <h2 className="text-xl font-semibold text-white mb-6">
    Lead Growth Trend
  </h2>

  <div style={{ width: "100%", height: 350 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={leadTrendData}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />

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
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
  <h2 className="text-xl font-semibold text-white mb-6">
    Recent Leads
  </h2>

  {recentLeads.map((lead) => (
    <div
      key={lead.id}
      className="flex justify-between items-center py-4 border-b border-zinc-800"
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
<div className="mt-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
  <h2 className="text-xl font-semibold text-white mb-6">
    Best Leads To Call Today
  </h2>

  {bestLeads.map((lead) => (
    <div
      key={lead.id}
      className="flex justify-between items-center py-4 border-b border-zinc-800"
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

  <div className="bg-zinc-900 p-5 rounded-xl border border-purple-800">
    <p className="text-zinc-400">
      Proposals Generated
    </p>

    <h2 className="text-3xl font-bold text-purple-500">
      {totalProposals}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-green-800">
    <p className="text-zinc-400">
      Proposal Value
    </p>

    <h2 className="text-3xl font-bold text-green-500">
      ₹{totalProposalValue.toLocaleString()}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-yellow-800">
    <p className="text-zinc-400">
      Highest Proposal
    </p>

    <h2 className="text-3xl font-bold text-yellow-500">
      ₹{highestProposal.toLocaleString()}
    </h2>
  </div>

  <div className="bg-zinc-900 p-5 rounded-xl border border-cyan-800">
    <p className="text-zinc-400">
      Avg Proposal Value
    </p>

    <h2 className="text-3xl font-bold text-cyan-500">
      ₹{averageProposalValue.toLocaleString()}
    </h2>
  </div>

</div>

{proposalModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6 overflow-y-auto">

    <div className="bg-zinc-900 p-8 rounded-xl w-[800px] max-w-[90vw] border border-purple-700">
      

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
    onClick={() => {

      const encodedMessage =
        encodeURIComponent(
          followupText
        );

      window.open(
        `https://wa.me/?text=${encodedMessage}`,
        "_blank"
      );

    }}
    className="bg-cyan-600 text-white px-4 py-2 rounded-lg"
  >
    💬 WhatsApp
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

    <div className="bg-zinc-900 p-6 rounded-xl w-[700px] max-h-[80vh] overflow-auto">

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