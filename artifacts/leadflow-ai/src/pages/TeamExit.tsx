

import { useEffect, useState } from "react";
import { LogOut, Calendar, FileText, Check, Clock } from "lucide-react";
import HRMSHeaderWithFilters from "@/components/hrms/hrms-header-with-filters";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";

type ExitEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation: string;
  last_working_day: string | null;
  resignation_date: string | null;
  exit_status: "initiated" | "approved" | "completed";
  separation_stage: "pending" | "assets_returned" | "knowledge_transfer" | "completed";
  clearance_status: "pending" | "in_progress" | "completed";
  final_settlement_status: "pending" | "calculated" | "processed";
};

type ExitChecklist = {
  id: string;
  category: "it" | "finance" | "hr" | "operations";
  task: string;
  status: "pending" | "completed";
  assigned_to: string;
  due_date: string;
};

export default function ExitManagementPage() {
  const [exitEmployees, setExitEmployees] = useState<ExitEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<ExitEmployee | null>(null);
  const [checklist, setChecklist] = useState<ExitChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "clearance" | "settlement">("active");
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

  async function fetchExitData() {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/v2/exit-management", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExitEmployees(data.data || []);
      }
    } catch (err) {
      setNotice({ type: "error", text: "Failed to load exit data" });
    } finally {
      setLoading(false);
    }
  }

  async function approveExit(employeeId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/exit-management/${employeeId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ exit_status: "approved" }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Exit approved" });
        fetchExitData();
      }
    } catch (err) {
      setNotice({ type: "error", text: "Failed to approve exit" });
    }
  }

  async function completeExitTask(taskId: string) {
    try {
      const res = await fetch(`/api/hrms/v2/exit-tasks/${taskId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Task completed" });
        const updatedChecklist = checklist.map((c) =>
          c.id === taskId ? { ...c, status: "completed" as const } : c
        );
        setChecklist(updatedChecklist);
      }
    } catch (err) {
      setNotice({ type: "error", text: "Failed to complete task" });
    }
  }

  useEffect(() => {
    fetchExitData();
  }, []);

  const statusColors = {
    initiated: "text-blue-700 bg-blue-50 border-blue-200",
    approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
    completed: "text-slate-700 bg-slate-50 border-slate-200",
    pending: "text-amber-700 bg-amber-50 border-amber-200",
  };

  return (
    <main className="hrms-enterprise min-h-screen bg-slate-50">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSHeaderWithFilters
          title="Exit Management"
          subtitle="Manage employee separations, clearance, and final settlements"
          tabs={[
            { label: "Active Separations", id: "active", active: tab === "active", onClick: () => setTab("active") },
            { label: "Clearance", id: "clearance", active: tab === "clearance", onClick: () => setTab("clearance") },
            { label: "Settlement", id: "settlement", active: tab === "settlement", onClick: () => setTab("settlement") },
          ]}
        />

        {notice && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {notice.text}
          </div>
        )}

        {/* Active Separations */}
        {tab === "active" && (
          <div className="p-6 space-y-4">
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : exitEmployees.filter((e) => e.exit_status !== "completed").length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <LogOut className="mx-auto mb-2 text-slate-400" size={32} />
                <p className="text-slate-600">No active exits</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exitEmployees
                  .filter((e) => e.exit_status !== "completed")
                  .map((emp) => (
                    <div key={emp.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[emp.exit_status]}`}>
                              {emp.exit_status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{emp.designation}</p>
                          {emp.last_working_day && (
                            <p className="text-xs text-slate-500 mt-1">
                              Last working day: {new Date(emp.last_working_day).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {emp.exit_status === "initiated" && (
                          <button
                            onClick={() => approveExit(emp.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
                          >
                            <Check size={16} /> Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Clearance Tab */}
        {tab === "clearance" && (
          <div className="p-6">
            <div className="space-y-4">
              {selectedEmployee ? (
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h3>
                      <p className="text-sm text-slate-600">{selectedEmployee.designation}</p>
                    </div>
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    {checklist.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          onChange={() => completeExitTask(task.id)}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{task.task}</p>
                          <p className="text-xs text-slate-500">
                            {task.category} • Assigned to {task.assigned_to}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium border rounded ${statusColors[task.status]}`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                  <FileText className="mx-auto mb-2 text-slate-400" size={32} />
                  <p className="text-slate-600">Select an employee to view clearance checklist</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settlement Tab */}
        {tab === "settlement" && (
          <div className="p-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Final Settlement Calculator</h3>
              <p className="text-slate-600">Full & Final settlement details will be calculated based on:</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Gratuity (if applicable)</li>
                <li>• Leave encashment</li>
                <li>• Pending bonus/incentives</li>
                <li>• Salary due</li>
                <li>• Pending reimbursements</li>
                <li>• Dues recovery (if any)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
