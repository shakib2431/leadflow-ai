"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, X, Plus } from "lucide-react";
import HRMSHeaderWithFilters from "@/app/hrms/v2/components/hrms-header-with-filters";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";

type LeaveRequest = {
  id: string;
  employee_id: string;
  employee_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  note?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  employees?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    email?: string;
  };
};

type LeaveBalance = {
  leave_type: string;
  opening: number;
  accrued: number;
  used: number;
  closing: number;
};

export default function LeaveOperationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"requests" | "balance">("requests");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", type: "" });
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      ...(typeof window !== "undefined" && !window.location.hostname.includes("prod") && {
        "x-dev-mode": "true",
        "x-dev-role": "HR Admin",
      }),
    };
  }

  async function fetchLeaveData() {
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.all([
        fetch("/api/hrms/v2/leave/requests?status=pending&pageSize=100", { headers: authHeaders() }),
        fetch("/api/hrms/v2/leave/balance", { headers: authHeaders() }),
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        const normalizedRequests = ((reqData.data || []) as LeaveRequest[]).map((row) => {
          const fullName = `${row.employees?.first_name || ""} ${row.employees?.last_name || ""}`.trim();
          return {
            ...row,
            employee_name: row.employee_name || fullName || row.employees?.employee_code || row.employees?.email || `Employee ${String(row.employee_id || "").slice(0, 8)}`,
          };
        });
        setLeaveRequests(normalizedRequests);
      } else {
        setLeaveRequests([]);
      }
      if (balRes.ok) {
        const balData = await balRes.json();
        const balancePayload = balData.data;
        if (Array.isArray(balancePayload)) {
          setLeaveBalances(balancePayload as LeaveBalance[]);
        } else if (balancePayload && typeof balancePayload === 'object' && Array.isArray((balancePayload as any).balances)) {
          setLeaveBalances((balancePayload as any).balances as LeaveBalance[]);
        } else {
          setLeaveBalances([]);
        }
      } else {
        setLeaveBalances([]);
      }
    } catch (err: any) {
      setNotice({ type: "error", text: "Failed to load leave data" });
    } finally {
      setLoading(false);
    }
  }

  async function approveLeave(requestId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/leave/requests/${requestId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Leave approved" });
        fetchLeaveData();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to approve leave');
      }
    } catch (err) {
      setNotice({ type: "error", text: "Failed to approve leave" });
    }
  }

  async function rejectLeave(requestId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/leave/requests/${requestId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Leave rejected" });
        fetchLeaveData();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reject leave');
      }
    } catch (err) {
      setNotice({ type: "error", text: "Failed to reject leave" });
    }
  }

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const filteredRequests = leaveRequests.filter(
    (req) =>
      (!filter.status || req.status === filter.status) &&
      (!filter.type || req.leave_type === filter.type)
  );

  const statusColors = {
    pending: "text-amber-700 bg-amber-50 border-amber-200",
    approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rejected: "text-rose-700 bg-rose-50 border-rose-200",
  };

  const pendingCount = leaveRequests.filter((r) => r.status === "pending").length;

  return (
    <main className="hrms-enterprise min-h-screen bg-slate-50">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSHeaderWithFilters
          title="Leave Management"
          subtitle={`${pendingCount} pending leave requests requiring approval`}
          tabs={[
            { label: "Leave Requests", id: "requests", active: tab === "requests", onClick: () => setTab("requests") },
            { label: "Leave Balance", id: "balance", active: tab === "balance", onClick: () => setTab("balance") },
          ]}
          filters={[
            {
              id: "status",
              label: "Status",
              type: "select",
              options: [
                { label: "All", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ],
              value: filter.status,
              onChange: (val) => setFilter({ ...filter, status: val }),
            },
            {
              id: "type",
              label: "Leave Type",
              type: "select",
              options: [
                { label: "All Types", value: "" },
                { label: "Casual Leave", value: "casual" },
                { label: "Sick Leave", value: "sick" },
                { label: "Earned Leave", value: "earned" },
              ],
              value: filter.type,
              onChange: (val) => setFilter({ ...filter, type: val }),
            },
          ]}
        />

        {notice && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {notice.text}
          </div>
        )}

        {/* Leave Requests Tab */}
        {tab === "requests" && (
          <div className="p-6 space-y-4">
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Calendar className="mx-auto mb-2 text-slate-400" size={32} />
                <p className="text-slate-600">No leave requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900">{req.employee_name}</p>
                          <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[req.status]}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {req.leave_type} • {req.days_count} days
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                        </p>
                        {req.note && <p className="text-sm text-slate-600 mt-2">Reason: {req.note}</p>}
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => approveLeave(req.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button
                            onClick={() => rejectLeave(req.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-200"
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leave Balance Tab */}
        {tab === "balance" && (
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leaveBalances.map((balance) => (
                <div key={balance.leave_type} className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">{balance.leave_type}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Opening</span>
                      <span className="font-semibold text-slate-900">{balance.opening}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Accrued</span>
                      <span className="font-semibold text-emerald-600">+{balance.accrued}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Used</span>
                      <span className="font-semibold text-rose-600">-{balance.used}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between">
                      <span className="font-semibold text-slate-900">Closing</span>
                      <span className="font-bold text-indigo-600">{balance.closing}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
