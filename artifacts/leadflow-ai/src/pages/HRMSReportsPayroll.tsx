

import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { DollarSign, TrendingUp, Users, PieChart } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  ExportBar,
} from "./components";
import { useState } from "react";

export default function PayrollReportsPage() {
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  });

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader title="" />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Payroll Analytics</h1>
              <p className="text-slate-600 mt-1">
                Salary, deductions, allowances, and payroll cost analysis
              </p>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onChange={setFilters} />

            {/* KPI Cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Payroll Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total Payroll"
                  value="₹45.5L"
                  icon={DollarSign}
                  color="blue"
                  trend={{
                    value: 5,
                    direction: "up",
                    label: "vs last month",
                  }}
                />
                <KPICard
                  label="Gross Salary"
                  value="₹42.3L"
                  icon={DollarSign}
                  color="green"
                />
                <KPICard
                  label="Net Salary"
                  value="₹35.8L"
                  icon={DollarSign}
                  color="purple"
                />
                <KPICard
                  label="Per Employee"
                  value="₹89,400"
                  icon={Users}
                  color="slate"
                />
              </div>
            </div>

            {/* Payroll Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Salary Components */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Salary Components
                </h3>
                <div className="space-y-4">
                  {[
                    { name: "Basic Salary", value: 25000, percentage: 59 },
                    { name: "HRA", value: 8000, percentage: 19 },
                    { name: "Medical", value: 3000, percentage: 7 },
                    { name: "Travel", value: 5000, percentage: 12 },
                    { name: "Other Allowance", value: 1200, percentage: 3 },
                  ].map((comp) => (
                    <div key={comp.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {comp.name}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          ₹{comp.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${comp.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Deductions Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { name: "Income Tax", value: 4200, percentage: 50 },
                    { name: "PF", value: 3100, percentage: 37 },
                    { name: "Professional Tax", value: 500, percentage: 6 },
                    { name: "Employee Insurance", value: 700, percentage: 7 },
                  ].map((ded) => (
                    <div key={ded.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {ded.name}
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          ₹{ded.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full"
                          style={{ width: `${ded.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Department Cost */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Department-wise Payroll Cost
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Headcount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Gross Salary
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Deductions
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Net Salary
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        dept: "Engineering",
                        headcount: 45,
                        gross: 1890000,
                        deductions: 378000,
                        net: 1512000,
                      },
                      {
                        dept: "Sales",
                        headcount: 32,
                        gross: 1024000,
                        deductions: 204800,
                        net: 819200,
                      },
                      {
                        dept: "Finance",
                        headcount: 18,
                        gross: 810000,
                        deductions: 162000,
                        net: 648000,
                      },
                      {
                        dept: "HR",
                        headcount: 12,
                        gross: 540000,
                        deductions: 108000,
                        net: 432000,
                      },
                    ].map((row) => (
                      <tr
                        key={row.dept}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {row.dept}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {row.headcount}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          ₹{(row.gross / 100000).toFixed(1)}L
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600">
                          ₹{(row.deductions / 100000).toFixed(1)}L
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                          ₹{(row.net / 100000).toFixed(1)}L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Export Bar */}
        <ExportBar
          reportName="Payroll Report"
          onExportCSV={() => alert("Export CSV - Coming soon")}
          onExportExcel={() => alert("Export Excel - Coming soon")}
          onExportPDF={() => alert("Export PDF - Coming soon")}
        />
      </div>
    </div>
  );
}
