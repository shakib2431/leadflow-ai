"use client";

import {
  BarChart3,
  Users,
  Briefcase,
  Clock,
  DollarSign,
  Shield,
  FileText,
  LogOut,
  Zap,
  Settings,
} from "lucide-react";
import { Link } from "wouter";
import { useLocation } from "wouter";

interface ReportCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  href: string;
  description: string;
  badge?: string;
}

const reportCategories: ReportCategory[] = [
  {
    id: "executive",
    name: "Executive Dashboard",
    icon: BarChart3,
    href: "/hrms/v2/reports",
    description: "KPIs, trends, and key insights",
  },
  {
    id: "workforce",
    name: "Workforce",
    icon: Users,
    href: "/hrms/v2/reports/workforce",
    description: "Employee data and analytics",
  },
  {
    id: "recruitment",
    name: "Recruitment",
    icon: Briefcase,
    href: "/hrms/v2/reports/recruitment",
    description: "Hiring pipeline and funnel",
  },
  {
    id: "attendance",
    name: "Attendance",
    icon: Clock,
    href: "/hrms/v2/reports/attendance",
    description: "Attendance and compliance",
  },
  {
    id: "leave",
    name: "Leave",
    icon: FileText,
    href: "/hrms/v2/reports/leave",
    description: "Leave tracking and balances",
  },
  {
    id: "payroll",
    name: "Payroll",
    icon: DollarSign,
    href: "/hrms/v2/reports/payroll",
    description: "Salary and compensation",
  },
  {
    id: "compliance",
    name: "Compliance & PF",
    icon: Shield,
    href: "/hrms/v2/reports/compliance",
    description: "Regulatory and compliance",
  },
  {
    id: "custom",
    name: "Custom Reports",
    icon: Zap,
    href: "/hrms/v2/reports/custom",
    description: "Build your own reports",
    badge: "Pro",
  },
];

interface ReportCategoriesProps {
  orientation?: "vertical" | "horizontal";
  showAll?: boolean;
}

export function ReportCategories({
  orientation = "vertical",
  showAll = true,
}: ReportCategoriesProps) {
  const [pathname] = useLocation();

  function isCategoryActive(href: string) {
    if (href === "/hrms/v2/reports") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const visibleCategories = showAll ? reportCategories : reportCategories.slice(0, 4);

  if (orientation === "horizontal") {
    return (
      <div className="flex overflow-x-auto gap-4 pb-4">
        {visibleCategories.map((category) => {
          const Icon = category.icon;
          const isActive = isCategoryActive(category.href);

          return (
            <Link
              key={category.id}
              href={category.href}
              className={`flex-shrink-0 p-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-100 border border-blue-300 text-blue-700"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {visibleCategories.map((category) => {
        const Icon = category.icon;
        const isActive = isCategoryActive(category.href);

        return (
          <Link
            key={category.id}
            href={category.href}
            className={`p-4 rounded-lg border transition ${
              isActive
                ? "bg-blue-50 border-blue-300 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <Icon
                size={20}
                className={isActive ? "text-blue-600" : "text-slate-600"}
              />
              {category.badge && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {category.badge}
                </span>
              )}
            </div>
            <p
              className={`font-semibold ${
                isActive ? "text-blue-700" : "text-slate-900"
              }`}
            >
              {category.name}
            </p>
            <p className="text-xs text-slate-600 mt-1">{category.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
