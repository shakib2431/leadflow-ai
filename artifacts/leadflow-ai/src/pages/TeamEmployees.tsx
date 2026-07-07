

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSHeaderWithFilters from "@/components/hrms/hrms-header-with-filters";
import {
  Plus, Eye, Mail, Phone, Building2, Briefcase, Calendar, Grid3x3, List,
  UserPlus, Search, ChevronRight, Users, UserCheck, Archive, KeyRound,
} from "lucide-react";

type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  email?: string;
  phone?: string;
  status?: string;
  department_id?: string;
  designation_id?: string;
  business_entity_id?: string;
  joining_date?: string;
  created_at?: string;
  department?: { name: string };
  designation?: { name: string };
};

type MasterOption = { id: string; name: string };

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(first?: string, last?: string) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

async function readResponsePayload(res: Response) {
  const text = await res.text();
  if (!text) return { ok: true as const, data: null };

  try {
    return { ok: true as const, data: JSON.parse(text) };
  } catch {
    return { ok: false as const, raw: text };
  }
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string; emailSent: boolean } | null>(null);
  const [provisioningEmployeeId, setProvisioningEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [tab, setTab] = useState<"active" | "onboarding" | "archived">("active");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  const [departments, setDepartments] = useState<MasterOption[]>([]);
  const [designations, setDesignations] = useState<MasterOption[]>([]);
  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [desigMap, setDesigMap] = useState<Record<string, string>>({});

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      const { data } = await supabase.auth.getSession();
      const devEmail = String(data.session?.user?.email || "").trim().toLowerCase();
      const headers: Record<string, string> = {
        "x-dev-mode": "true",
        "x-dev-role": "HR Admin",
        "Content-Type": "application/json",
      };
      if (devEmail) headers["x-dev-email"] = devEmail;
      return headers;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function fetchMasterData() {
    try {
      const headers = await authHeader();
      const [deptRes, desigRes] = await Promise.all([
        fetch("/api/hrms/v2/departments", { headers }),
        fetch("/api/hrms/v2/designations", { headers }),
      ]);
      if (deptRes.ok) {
        const payload = await readResponsePayload(deptRes);
        if (!payload.ok) throw new Error("Departments response was not valid JSON");
        const depts = payload.data?.data || [];
        setDepartments(depts);
        setDeptMap(Object.fromEntries(depts.map((d: MasterOption) => [d.id, d.name])));
      }
      if (desigRes.ok) {
        const payload = await readResponsePayload(desigRes);
        if (!payload.ok) throw new Error("Designations response was not valid JSON");
        const desigs = payload.data?.data || [];
        setDesignations(desigs);
        setDesigMap(Object.fromEntries(desigs.map((d: MasterOption) => [d.id, d.name])));
      }
    } catch (err) {
      console.error("Failed to load filters", err);
    }
  }

  async function fetchEmployees() {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const sp = new URLSearchParams();
      sp.set("status", tab);
      if (search) sp.set("q", search);
      if (departmentFilter) sp.set("department_id", departmentFilter);
      if (designationFilter) sp.set("designation_id", designationFilter);

      const res = await fetch(`/api/hrms/v2/employees?${sp.toString()}`, { headers });
      const payload = await readResponsePayload(res);
      if (!payload.ok) {
        throw new Error("Employee list response was not valid JSON. Please refresh the dev server.");
      }
      const body = payload.data;
      if (!res.ok) throw new Error(body?.error || "Failed to load employees");
      setEmployees(body?.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  async function provisionEmployeeLogin(employee: Employee) {
    try {
      setProvisioningEmployeeId(employee.id);
      setNotice(null);

      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/employees/${employee.id}/login-credentials`, {
        method: "POST",
        headers,
      });

      const payload = await readResponsePayload(res);
      if (!payload.ok) throw new Error("Login credential response was not valid JSON");
      const body = payload.data;
      if (!res.ok) throw new Error(body.error || "Failed to create login credentials");

      const tempPassword = String(body?.data?.temporary_password || "");
      const emailSent = Boolean(body?.data?.email_sent);
      const employeeEmail = String(body?.data?.employee_email || employee.email || "");

      const deliveryNote = emailSent ? "Welcome email sent." : "Welcome email failed; share credentials manually.";
      const loginUrl = `${window.location.origin}/login`;
      const handoffMessage = [
        `Hi ${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Hi",
        "Your LeadFlow AI HRMS account is ready.",
        `Work email: ${employeeEmail}`,
        `Temporary password: ${tempPassword}`,
        `Login here: ${loginUrl}`,
        "You must change your password on first login.",
      ].join("\n");

      setNotice({
        type: "success",
        text: `Credentials generated for ${employeeEmail}. ${deliveryNote} Ready-to-send message copied to clipboard.`,
      });

      if (tempPassword && employeeEmail) {
        setCredentialModal({ email: employeeEmail, password: tempPassword, emailSent });
      }

      if (tempPassword) {
        await navigator.clipboard.writeText(handoffMessage);
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to provision login credentials" });
    } finally {
      setProvisioningEmployeeId(null);
    }
  }

  useEffect(() => { fetchMasterData(); }, []);
  useEffect(() => { fetchEmployees(); }, [tab, search, departmentFilter, designationFilter]);

  const tabs = [
    { id: "active", label: "Active", active: tab === "active", onClick: () => setTab("active") },
    { id: "onboarding", label: "Onboarding", active: tab === "onboarding", onClick: () => setTab("onboarding") },
    { id: "archived", label: "Archived", active: tab === "archived", onClick: () => setTab("archived") },
  ];

  const filters = [
    {
      id: "department",
      label: "Department",
      type: "select" as const,
      value: departmentFilter,
      onChange: (val: string) => setDepartmentFilter(val),
      options: [
        { value: "", label: "All departments" },
        ...departments.map((d) => ({ value: d.id, label: d.name })),
      ],
    },
    {
      id: "designation",
      label: "Designation",
      type: "select" as const,
      value: designationFilter,
      onChange: (val: string) => setDesignationFilter(val),
      options: [
        { value: "", label: "All designations" },
        ...designations.map((d) => ({ value: d.id, label: d.name })),
      ],
    },
  ];

  function statusConfig(status?: string) {
    const s = (status || "").toLowerCase();
    if (s === "archived") return { cls: "bg-rose-50 border-rose-200 text-rose-700", icon: Archive, label: "Archived" };
    if (s === "onboarding") return { cls: "bg-amber-50 border-amber-200 text-amber-700", icon: UserPlus, label: "Onboarding" };
    return { cls: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: UserCheck, label: "Active" };
  }

  const tabCounts = useMemo(() => ({
    active: tab === "active" ? employees.length : null,
    onboarding: tab === "onboarding" ? employees.length : null,
    archived: tab === "archived" ? employees.length : null,
  }), [employees.length, tab]);

  return (
    <main className="hrms-enterprise min-h-screen">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSHeaderWithFilters
          title="Employee Directory"
          subtitle={`${employees.length} ${tab} employee${employees.length !== 1 ? "s" : ""}`}
          tabs={tabs}
          filters={filters}
          onSearch={setSearch}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition"
              >
                {viewMode === "grid" ? <List size={14} /> : <Grid3x3 size={14} />}
                {viewMode === "grid" ? "List" : "Grid"}
              </button>
              <Link to="/team/onboarding" className="hrms-btn hrms-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
                <Plus className="h-4 w-4" /> Add Employee
              </Link>
            </div>
          }
        />

        <div className="hrms-dashboard-shell">
          {credentialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Login Credentials Ready</h3>
                  <button
                    onClick={() => setCredentialModal(null)}
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p><span className="font-semibold text-slate-700">Login Email:</span> <span className="text-slate-900">{credentialModal.email}</span></p>
                  <p><span className="font-semibold text-slate-700">Temporary Password:</span> <span className="font-mono text-slate-900">{credentialModal.password}</span></p>
                  <p className="text-xs text-slate-600">Login URL: {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</p>
                </div>
                <p className={`mt-3 text-xs ${credentialModal.emailSent ? "text-emerald-700" : "text-amber-700"}`}>
                  {credentialModal.emailSent ? "Welcome email sent to employee." : "Welcome email failed. Share these credentials manually."}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(`Email: ${credentialModal.email}\nPassword: ${credentialModal.password}`)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    Copy Credentials
                  </button>
                  <button
                    onClick={() => setCredentialModal(null)}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {notice && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.text}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`animate-pulse rounded-xl bg-slate-100 ${viewMode === "grid" ? "h-44" : "h-20"}`} />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
              <Users size={40} className="mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">No {tab} employees found</p>
              <p className="mt-1 text-sm text-slate-500">
                {tab === "active" ? "Activate candidates from the Onboarding queue to see them here." :
                 tab === "onboarding" ? "Hire candidates from Recruitment to start onboarding." :
                 "No archived employees at this time."}
              </p>
              {tab === "active" && (
                <Link to="/team/onboarding" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                  <UserPlus size={14} /> Go to Onboarding
                </Link>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => {
                const sc = statusConfig(emp.status);
                const deptName = emp.department?.name || deptMap[emp.department_id || ""] || "";
                const desigName = emp.designation?.name || desigMap[emp.designation_id || ""] || "";
                const avatarColor = getAvatarColor(emp.id);
                const initials = getInitials(emp.first_name, emp.last_name);
                return (
                  <Link
                    key={emp.id}
                    href={`/hrms/v2/employees/${emp.id}`}
                    className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition">
                              {emp.first_name} {emp.last_name}
                            </h3>
                            {emp.employee_code && (
                              <p className="text-xs text-slate-400">{emp.employee_code}</p>
                            )}
                          </div>
                          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {emp.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      )}
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      {desigName && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Briefcase size={12} className="text-slate-400" />
                          <span className="truncate">{desigName}</span>
                        </div>
                      )}
                      {deptName && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Building2 size={12} className="text-slate-400" />
                          <span className="truncate">{deptName}</span>
                        </div>
                      )}
                      {(emp.joining_date || emp.created_at) && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Joined {new Date(emp.joining_date || emp.created_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          provisionEmployeeLogin(emp);
                        }}
                        disabled={provisioningEmployeeId === emp.id || !emp.email}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <KeyRound size={11} />
                        {provisioningEmployeeId === emp.id ? "Creating..." : "Create Login"}
                      </button>
                      <span className="flex-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition">
                        View Full Profile
                      </span>
                      <ChevronRight size={13} className="text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 hidden lg:table-cell">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 hidden xl:table-cell">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const sc = statusConfig(emp.status);
                    const deptName = emp.department?.name || deptMap[emp.department_id || ""] || "—";
                    const desigName = emp.designation?.name || desigMap[emp.designation_id || ""] || "—";
                    const avatarColor = getAvatarColor(emp.id);
                    const initials = getInitials(emp.first_name, emp.last_name);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColor}`}>
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{deptName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">{desigName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden xl:table-cell">
                          {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => provisionEmployeeLogin(emp)}
                              disabled={provisioningEmployeeId === emp.id || !emp.email}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <KeyRound size={11} />
                              {provisioningEmployeeId === emp.id ? "Creating..." : "Create Login"}
                            </button>
                            <Link to={`/hrms/v2/employees/${emp.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition">
                              <Eye size={11} /> View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
