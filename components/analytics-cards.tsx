"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Flame,
  Target,
  Calendar,
} from "lucide-react";

import {
  fetchDashboardStats,
  DashboardStats,
} from "@/lib/dashboard";

export default function AnalyticsCards() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    hotLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchDashboardStats();

        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const cards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Users,
      color:
        "from-violet-500/20 to-violet-500/5",
    },
    {
      title: "Hot Leads",
      value: stats.hotLeads,
      icon: Flame,
      color:
        "from-orange-500/20 to-orange-500/5",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: Target,
      color:
        "from-emerald-500/20 to-emerald-500/5",
    },
    {
      title: "Converted",
      value: stats.convertedLeads,
      icon: Calendar,
      color:
        "from-cyan-500/20 to-cyan-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className={`rounded-2xl border border-white/[0.06] p-6 bg-gradient-to-br ${card.color}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-white/[0.05]">
                <Icon
                  size={20}
                  className="text-white"
                />
              </div>

              <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                Live
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse h-8 w-24 bg-white/10 rounded" />
            ) : (
              <h3 className="text-4xl font-bold text-white">
                {card.value}
              </h3>
            )}

            <p className="text-white/40 text-sm mt-2">
              {card.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}