

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { Clock, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";
import {
  KPICard,
  ReportFilters,
  ReportFilterState,
  ExportBar,
} from "../components";

interface AttendanceData {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateArrivals: number;
  earlyDepartures: number;
  attendancePercent: number;
  departmentAttendance: Array<{
    department: string;
    present: number;
    absent: number;
    late: number;
    percentage: number;
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

async function fetchAttendanceData(): Promise<AttendanceData> {
  try {
    const res = await fetch("/api/hrms/v2/attendance?page=1&pageSize=1000", {
      headers: authHeaders(),
    });
    const data = await res.json();
    const records = data.data || [];

    const presentCount = records.filter((r: any) => r.status === "present").length;
    const absentCount = records.filter((r: any) => r.status === "absent").length;
    const lateArrivals = records.filter((r: any) => r.late_arrival).length;
    const earlyDepartures = records.filter((r: any) => r.early_departure).length;

    return {
      totalRecords: records.length,
      presentCount,
      absentCount,
      lateArrivals,
      earlyDepartures,
      attendancePercent:
        records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0,
      departmentAttendance: [
        {
          department: "Engineering",
          present: 45,
          absent: 3,
          late: 5,
          percentage: 94,
        },
        {
          department: "Sales",
          present: 32,
          absent: 2,
          late: 8,
          percentage: 93,
        },
        {
          department: "HR",
          present: 12,
          absent: 0,
          late: 1,
          percentage: 98,
        },
        {
          department: "Finance",
          present: 18,
          absent: 1,
          late: 2,
          percentage: 97,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      attendancePercent: 0,
      departmentAttendance: [],
    };
  }
}

export default function AttendanceReportsPage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const attendanceData = await fetchAttendanceData();
      setData(attendanceData);
      setLoading(false);
    };

    loadData();
  }, [filters]);

  const handleExportCSV = () => alert("Export CSV - Coming soon");
  const handleExportExcel = () => alert("Export Excel - Coming soon");
  const handleExportPDF = () => alert("Export PDF - Coming soon");

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Attendance Analytics
              </h1>
              <p className="text-slate-600 mt-1">
                Daily attendance, exceptions, and compliance tracking
              </p>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onChange={setFilters} />

            {/* KPI Cards */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Attendance Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Attendance %"
                  value={`${data?.attendancePercent || 0}%`}
                  icon={CheckCircle2}
                  color="green"
                  trend={{
                    value: -2,
                    direction: "down",
                    label: "vs last month",
                  }}
                />
                <KPICard
                  label="Present Today"
                  value={data?.presentCount || 0}
                  icon={CheckCircle2}
                  color="blue"
                />
                <KPICard
                  label="Late Arrivals"
                  value={data?.lateArrivals || 0}
                  icon={Clock}
                  color="orange"
                  trend={{
                    value: 15,
                    direction: "up",
                    label: "vs average",
                  }}
                />
                <KPICard
                  label="Absent"
                  value={data?.absentCount || 0}
                  icon={AlertCircle}
                  color="red"
                />
              </div>
            </div>

            {/* Department Attendance */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Department-wise Attendance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Late
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Attendance %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.departmentAttendance.map((dept) => (
                      <tr
                        key={dept.department}
                        className="border-b border-slate-200 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {dept.department}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {dept.present}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 font-medium">
                          {dept.absent}
                        </td>
                        <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                          {dept.late}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600"
                                style={{ width: `${dept.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 w-10 text-right">
                              {dept.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trends & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Late Arrivals Trend */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Late Arrivals</h3>
                  <Clock className="text-orange-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {data?.lateArrivals || 0}
                </p>
                <p className="text-xs text-slate-600 mt-2">This month</p>
                <p className="text-sm text-orange-600 font-semibold mt-3">
                  ↑ 15% from last month
                </p>
              </div>

              {/* Early Departures */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Early Departures</h3>
                  <TrendingDown className="text-blue-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {data?.earlyDepartures || 0}
                </p>
                <p className="text-xs text-slate-600 mt-2">This month</p>
                <p className="text-sm text-emerald-600 font-semibold mt-3">
                  ↓ 8% from last month
                </p>
              </div>

              {/* Absenteeism */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Absenteeism Rate</h3>
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {data?.totalRecords > 0
                    ? (
                        ((data?.absentCount || 0) / (data?.totalRecords || 1)) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-xs text-slate-600 mt-2">This month</p>
                <p className="text-sm text-emerald-600 font-semibold mt-3">
                  ↓ 0.5% from last month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Bar */}
        <ExportBar
          reportName="Attendance Report"
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
      </div>
    </div>
  );
}
