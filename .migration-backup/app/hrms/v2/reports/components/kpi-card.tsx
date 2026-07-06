"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label: string;
  };
  color?: "blue" | "green" | "emerald" | "orange" | "red" | "purple" | "slate";
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    dot: "bg-blue-500",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  orange: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-600",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-600",
    dot: "bg-red-500",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "text-purple-600",
    dot: "bg-purple-500",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: "text-slate-600",
    dot: "bg-slate-500",
  },
};

export function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  color = "blue",
  onClick,
}: KPICardProps) {
  const colors = colorClasses[color] || colorClasses.blue;
  const trendIcon = trend?.direction === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend?.direction === "up" ? "text-emerald-600" : "text-red-600";

  return (
    <div
      onClick={onClick}
      className={`${colors.bg} border ${colors.border} rounded-lg p-5 cursor-pointer transition hover:shadow-md ${
        onClick ? "hover:border-blue-400" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-600 mb-2 break-words">{label}</p>
          <p className="text-3xl font-bold text-slate-900 break-words">{value}</p>

          {trend && (
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {trend.direction !== "neutral" && (
                <>
                  {trend.direction === "up" ? (
                    <TrendingUp size={16} className={trendColor} />
                  ) : (
                    <TrendingDown size={16} className={trendColor} />
                  )}
                  <span className={`text-xs font-semibold ${trendColor} break-words`}>
                    {Math.abs(trend.value)}% {trend.label}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`${colors.icon} opacity-20 flex-shrink-0`}>
          <Icon size={40} />
        </div>
      </div>
    </div>
  );
}
