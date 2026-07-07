"use client";

import { Sparkles, AlertCircle, TrendingUp, Users, Clock } from "lucide-react";

export interface AIInsight {
  id: string;
  type: "observation" | "alert" | "opportunity" | "action";
  title: string;
  description: string;
  icon?: any;
  metric?: string;
  trend?: number;
}

interface AIInsightsProps {
  insights: AIInsight[];
  loading?: boolean;
}

const iconMap = {
  observation: TrendingUp,
  alert: AlertCircle,
  opportunity: Users,
  action: Clock,
};

const colorMap = {
  observation: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    icon: "text-indigo-600",
  },
  alert: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: "text-red-600",
  },
  opportunity: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "text-emerald-600",
  },
  action: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-600",
  },
};

export function AIInsights({ insights, loading = false }: AIInsightsProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-purple-600 animate-pulse" />
          <h3 className="font-semibold text-slate-900">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-purple-600" />
        <h3 className="font-semibold text-slate-900">AI Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => {
          const colors = colorMap[insight.type];
          const IconComponent = iconMap[insight.type];

          return (
            <div
              key={insight.id}
              className={`${colors.bg} border ${colors.border} rounded-lg p-3 flex gap-3`}
            >
              <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                <IconComponent size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colors.text} mb-0.5`}>
                  {insight.title}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {insight.description}
                </p>
                {insight.metric && (
                  <p className={`text-xs font-semibold ${colors.text} mt-1`}>
                    {insight.metric}
                    {insight.trend && (
                      <span className="ml-1">
                        ({insight.trend > 0 ? "+" : ""}{insight.trend}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
