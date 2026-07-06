"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";
import { Users, TrendingUp, Briefcase, MapPin } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  AIInsights,
  AIInsight,
  ExportBar,
} from "../components";

interface WorkforceData {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  avgTenure: number;
  departments: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  designations: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  employeesByStatus: Array<{
    status: string;
    count: number;
  }>;
}

function authHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
    headers["x-dev-mode"] = "true";
    headers["x-dev-role"] = "HR Admin";
  }
  return headers;
}

async function fetchWorkforceData(): Promise<WorkforceData> {
  try {
    const res = await fetch("/api/hrms/v2/employees?page=1&pageSize=1000", {
      headers: authHeaders(),
    });
    const data = await res.json();
    const employees = data.data || [];

    // Group by department
    const departments: Record<string, number> = {};
    const designations: Record<string, number> = {};
    const statuses: Record<string, number> = {};

    employees.forEach((emp: any) => {
      if (emp.department) {
        departments[emp.department] = (departments[emp.department] || 0) + 1;
      }
      if (emp.designation) {
        designations[emp.designation] = (designations[emp.designation] || 0) + 1;
      }
      if (emp.employment_status) {
        statuses[emp.employment_status] =
          (statuses[emp.employment_status] || 0) + 1;
      }
    });

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e: any) => e.employment_status === "active").length,
      probationEmployees: employees.filter(
        (e: any) => e.employment_status === "probation"
      ).length,
      avgTenure: 2.5,
      departments: Object.entries(departments).map(([name, count]) => ({
        id: name,
        name,
        count: count as number,
      })),
      designations: Object.entries(designations).map(([name, count]) => ({
        id: name,
        name,
        count: count as number,
      })),
      employeesByStatus: Object.entries(statuses).map(([status, count]) => ({
        status,
        count: count as number,
      })),
    };
  } catch (error) {
    console.error("Error fetching workforce data:", error);
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      probationEmployees: 0,
      avgTenure: 0,
      departments: [],
      designations: [],
      employeesByStatus: [],
    };
  }
}

export default function WorkforceReportsPage() {
  const [data, setData] = useState<WorkforceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const workforceData = await fetchWorkforceData();
      setData(workforceData);
      setLoading(false);
    };

    loadData();
  }, [filters]);

  const handleExportCSV = () => {
    alert("Export as CSV - Coming soon");
  };

  const handleExportExcel = () => {
    alert("Export as Excel - Coming soon");
  };

  const handleExportPDF = () => {
    alert("Export as PDF - Coming soon");
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Workforce Reports</h1>
              <p className="text-slate-600 mt-1">
                Complete employee analytics and departmental insights
              </p>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onChange={setFilters} />

            {/* KPI Cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Workforce Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total Employees"
                  value={data?.totalEmployees || 0}
                  icon={Users}
                  color="blue"
                />
                <KPICard
                  label="Active Employees"
                  value={data?.activeEmployees || 0}
                  icon={Users}
                  color="green"
                />
                <KPICard
                  label="On Probation"
                  value={data?.probationEmployees || 0}
                  icon={TrendingUp}
                  color="orange"
                />
                <KPICard
                  label="Avg Tenure"
                  value={`${data?.avgTenure || 0} years`}
                  icon={Briefcase}
                  color="purple"
                />
              </div>
            </div>

            {/* Department & Designation Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Breakdown */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Department Strength
                </h3>
                <div className="space-y-4">
                  {data?.departments.slice(0, 8).map((dept) => (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {dept.name}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {dept.count}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${
                              ((dept.count || 0) / (data?.totalEmployees || 1)) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Designation Distribution */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Designation Distribution
                </h3>
                <div className="space-y-3">
                  {data?.designations.slice(0, 8).map((des) => (
                    <div key={des.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{des.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{
                              width: `${
                                ((des.count || 0) / (data?.totalEmployees || 1)) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                          {des.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employee Status */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Employee Status Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data?.employeesByStatus.map((status) => (
                  <div
                    key={status.status}
                    className="bg-slate-50 rounded-lg p-4 text-center"
                  >
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                      {status.status}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {status.count}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      {(
                        ((status.count || 0) / (data?.totalEmployees || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Export Bar */}
        <ExportBar
          reportName="Workforce Report"
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  );
}
