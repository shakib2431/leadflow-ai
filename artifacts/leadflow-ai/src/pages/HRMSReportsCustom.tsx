

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { ReportCategories } from "./components/report-categories";
import { CalendarClock, Filter, Layers, Trash2 } from "lucide-react";

type ReportModule = "workforce" | "recruitment" | "attendance" | "leave" | "payroll" | "compliance";

type CustomTemplate = {
  id: string;
  name: string;
  module: ReportModule;
  groupBy: string;
  columns: string[];
  dateStart: string;
  dateEnd: string;
  createdAt: string;
};

type ScheduleItem = {
  id: string;
  templateId: string;
  frequency: "weekly" | "monthly";
  recipients: string;
  active: boolean;
  createdAt: string;
};

const TEMPLATE_KEY = "hrms.customReports.templates.v1";
const SCHEDULE_KEY = "hrms.customReports.schedules.v1";

const MODULE_OPTIONS: Array<{ value: ReportModule; label: string }> = [
  { value: "workforce", label: "Workforce" },
  { value: "recruitment", label: "Recruitment" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "compliance", label: "Compliance & PF" },
];

const COLUMN_LIBRARY: Record<ReportModule, string[]> = {
  workforce: ["Employee Count", "Department", "Designation", "Location", "Employment Status"],
  recruitment: ["Open Roles", "Applicants", "Interview Funnel", "Offers Sent", "Offer Accepted"],
  attendance: ["Present Days", "Absent Days", "Late Markings", "Exceptions", "Correction Requests"],
  leave: ["Leave Balance", "Leave Requests", "Approval Time", "Leave Type Split", "Team Leave Calendar"],
  payroll: ["Gross Pay", "Net Pay", "Deductions", "PF", "TDS"],
  compliance: ["PF Filing Status", "TDS Filing Status", "Pending Filings", "Compliance Score", "Audit Flags"],
};

const MODULE_ROUTE: Record<ReportModule, string> = {
  workforce: "/hrms/v2/reports/workforce",
  recruitment: "/hrms/v2/reports/recruitment",
  attendance: "/hrms/v2/reports/attendance",
  leave: "/hrms/v2/reports/leave",
  payroll: "/hrms/v2/reports/payroll",
  compliance: "/hrms/v2/reports/compliance",
};

function safeRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export default function CustomReportsPage() {
  const [, navigate] = useLocation();
  const [templateName, setTemplateName] = useState("");
  const [moduleName, setModuleName] = useState<ReportModule>("workforce");
  const [groupBy, setGroupBy] = useState("department");
  const [columns, setColumns] = useState<string[]>(["Employee Count", "Department"]);
  const [dateStart, setDateStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().slice(0, 10));
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [recipients, setRecipients] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(safeRead<CustomTemplate>(TEMPLATE_KEY));
    setSchedules(safeRead<ScheduleItem>(SCHEDULE_KEY));
  }, []);

  const availableColumns = useMemo(() => COLUMN_LIBRARY[moduleName], [moduleName]);

  function toggleColumn(column: string) {
    setColumns((prev) =>
      prev.includes(column) ? prev.filter((item) => item !== column) : [...prev, column]
    );
  }

  function saveTemplate() {
    const name = templateName.trim();
    if (!name) {
      setNote("Template name is required.");
      return;
    }
    if (columns.length === 0) {
      setNote("Select at least one metric/column.");
      return;
    }

    const next: CustomTemplate = {
      id: `${Date.now()}`,
      name,
      module: moduleName,
      groupBy,
      columns,
      dateStart,
      dateEnd,
      createdAt: new Date().toISOString(),
    };

    const updated = [next, ...templates];
    setTemplates(updated);
    safeWrite(TEMPLATE_KEY, updated);
    setSelectedTemplateId(next.id);
    setTemplateName("");
    setNote("Template saved.");
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter((item) => item.id !== id);
    setTemplates(updated);
    safeWrite(TEMPLATE_KEY, updated);

    const schedulesUpdated = schedules.filter((item) => item.templateId !== id);
    setSchedules(schedulesUpdated);
    safeWrite(SCHEDULE_KEY, schedulesUpdated);

    if (selectedTemplateId === id) setSelectedTemplateId("");
    setNote("Template deleted.");
  }

  function createSchedule() {
    if (!selectedTemplateId) {
      setNote("Select a template to schedule.");
      return;
    }
    const cleanedRecipients = recipients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    if (!cleanedRecipients) {
      setNote("Add at least one recipient email.");
      return;
    }

    const next: ScheduleItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      templateId: selectedTemplateId,
      frequency,
      recipients: cleanedRecipients,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [next, ...schedules];
    setSchedules(updated);
    safeWrite(SCHEDULE_KEY, updated);
    setRecipients("");
    setNote("Schedule saved. Delivery execution will activate when HRMS Pro goes live.");
  }

  function toggleSchedule(id: string) {
    const updated = schedules.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    setSchedules(updated);
    safeWrite(SCHEDULE_KEY, updated);
  }

  function deleteSchedule(id: string) {
    const updated = schedules.filter((item) => item.id !== id);
    setSchedules(updated);
    safeWrite(SCHEDULE_KEY, updated);
  }

  function openTemplate(template: CustomTemplate) {
    const url = new URL(MODULE_ROUTE[template.module], window.location.origin);
    url.searchParams.set("template", template.name);
    url.searchParams.set("groupBy", template.groupBy);
    url.searchParams.set("from", template.dateStart);
    url.searchParams.set("to", template.dateEnd);
    url.searchParams.set("columns", template.columns.join("|"));
    navigate(`${url.pathname}${url.search}`);
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <HRMSSidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        <HRMSTopHeader title="" />

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Custom Reports</h1>
              <p className="text-slate-600 mt-1">
                Build reusable report templates and schedule them for delivery.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <ReportCategories showAll={true} />
            </div>

            {note && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                {note}
              </div>
            )}

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">Template Builder</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">Define module, metrics, grouping, and date window.</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-700">
                    Template Name
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Monthly Payroll Summary"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    Module
                    <select
                      value={moduleName}
                      onChange={(e) => {
                        const next = e.target.value as ReportModule;
                        setModuleName(next);
                        setColumns(COLUMN_LIBRARY[next].slice(0, 2));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {MODULE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-slate-700">
                    Group By
                    <input
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      placeholder="department / month / status"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm text-slate-700">
                      From
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      To
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Filter size={14} /> Metrics / Columns
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableColumns.map((column) => (
                      <label key={column} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={columns.includes(column)}
                          onChange={() => toggleColumn(column)}
                        />
                        <span>{column}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveTemplate}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Template
                </button>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-emerald-600" />
                  <h2 className="text-base font-semibold text-slate-900">Scheduled Delivery</h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Configure recurring emails now. Delivery execution activates in HRMS Pro at go-live.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm text-slate-700">
                    Template
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.module})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-slate-700">
                    Frequency
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>

                  <label className="text-sm text-slate-700 md:col-span-2">
                    Recipient Emails (comma separated)
                    <input
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="hr@company.com, finance@company.com"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <button
                  onClick={createSchedule}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Save Schedule
                </button>
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">Saved Templates</h3>
                <div className="mt-3 space-y-2">
                  {templates.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No templates saved yet.
                    </div>
                  )}
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                          <p className="text-xs text-slate-600">
                            {t.module} | group by {t.groupBy} | {t.dateStart} to {t.dateEnd}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openTemplate(t)}
                            className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => deleteTemplate(t.id)}
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            title="Delete template"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">Saved Schedules</h3>
                <div className="mt-3 space-y-2">
                  {schedules.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No schedules configured.
                    </div>
                  )}
                  {schedules.map((s) => {
                    const template = templates.find((t) => t.id === s.templateId);
                    return (
                      <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{template?.name || "Deleted template"}</p>
                            <p className="text-xs text-slate-600">{s.frequency} | {s.recipients}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSchedule(s.id)}
                              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                                s.active
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {s.active ? "Active" : "Paused"}
                            </button>
                            <button
                              onClick={() => deleteSchedule(s.id)}
                              className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              title="Delete schedule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
