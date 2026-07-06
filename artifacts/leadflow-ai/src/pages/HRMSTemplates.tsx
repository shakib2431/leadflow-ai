

import { useEffect, useMemo, useState } from "react";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";
import { useHRMSRole } from "@/components/hrms/use-hrms-role";

type LetterType = "offer" | "appointment" | "contract";

type TemplateRow = {
  id: string;
  template_key: string;
  name: string;
  letter_type: LetterType;
  subject_template: string;
  body_template: string;
  version: number;
  is_active: boolean;
  updated_at?: string;
};

type EmployeeOption = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
};

const DEFAULT_SUBJECT = "{{employee_name}} - {{designation}}";
const DEFAULT_BODY = [
  "Dear {{employee_name}},",
  "",
  "We are pleased to offer you the role of {{designation}} in {{department}}.",
  "Your joining date is {{date_of_joining}} and work location is {{work_location}}.",
  "",
  "Regards,",
  "HR Team",
].join("\n");

export default function TemplatesPage() {
  const { role, loading: roleLoading } = useHRMSRole();
  const canEdit = role === "HR Admin" || role === "HR Executive";
  const canView = role === "HR Admin" || role === "HR Executive";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string>("");
  const [templateKey, setTemplateKey] = useState("offer_letter");
  const [name, setName] = useState("Offer Letter");
  const [letterType, setLetterType] = useState<LetterType>("offer");
  const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_SUBJECT);
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY);
  const [isActive, setIsActive] = useState(true);

  const [generateTemplateId, setGenerateTemplateId] = useState("");
  const [generateEmployeeId, setGenerateEmployeeId] = useState("");
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      `${t.template_key} ${t.name} ${t.letter_type} v${t.version}`.toLowerCase().includes(q)
    );
  }, [query, templates]);

  async function authHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      if (role) headers["x-dev-role"] = role;
    }

    return headers;
  }

  async function loadTemplates() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/hrms/v2/letter-templates", { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load templates");
      const rows = (body.data || []) as TemplateRow[];
      setTemplates(rows);
      if (!generateTemplateId && rows.length > 0) {
        setGenerateTemplateId(rows[0].id);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load templates" });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/hrms/v2/employees?page=1&pageSize=100&includeArchived=false", { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load employees");
      const rows = (body.data || []) as EmployeeOption[];
      setEmployees(rows);
      if (!generateEmployeeId && rows.length > 0) {
        setGenerateEmployeeId(rows[0].id);
      }
    } catch {
      setEmployees([]);
    }
  }

  useEffect(() => {
    if (roleLoading) return;
    if (!canView) {
      setLoading(false);
      return;
    }

    loadTemplates();
    loadEmployees();
  }, [roleLoading, canView]);

  function resetForm() {
    setFormMode("create");
    setEditingId("");
    setTemplateKey("offer_letter");
    setName("Offer Letter");
    setLetterType("offer");
    setSubjectTemplate(DEFAULT_SUBJECT);
    setBodyTemplate(DEFAULT_BODY);
    setIsActive(true);
  }

  function editTemplate(row: TemplateRow) {
    setFormMode("edit");
    setEditingId(row.id);
    setTemplateKey(row.template_key);
    setName(row.name);
    setLetterType(row.letter_type);
    setSubjectTemplate(row.subject_template);
    setBodyTemplate(row.body_template);
    setIsActive(row.is_active);
  }

  async function saveTemplate() {
    if (!canEdit) {
      setMessage({ type: "error", text: "Only HR Admin and HR Executive can create or update templates." });
      return;
    }

    if (!templateKey.trim() || !name.trim() || !subjectTemplate.trim() || !bodyTemplate.trim()) {
      setMessage({ type: "error", text: "Please fill template key, name, subject, and body." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const headers = await authHeaders();
      const payload = {
        template_key: templateKey.trim(),
        name: name.trim(),
        letter_type: letterType,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        is_active: isActive,
      };

      const endpoint = formMode === "create"
        ? "/api/hrms/v2/letter-templates"
        : `/api/hrms/v2/letter-templates/${editingId}`;
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save template");

      await loadTemplates();
      if (formMode === "create") {
        resetForm();
      }
      setMessage({ type: "success", text: formMode === "create" ? "Template created." : "Template updated." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save template" });
    } finally {
      setSaving(false);
    }
  }

  async function setActiveTemplate(row: TemplateRow) {
    if (!canEdit) {
      setMessage({ type: "error", text: "Only HR Admin and HR Executive can switch active versions." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/hrms/v2/letter-templates/${row.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ is_active: true }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to activate template");

      await loadTemplates();
      setMessage({ type: "success", text: `${row.template_key} v${row.version} is now active.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to activate template" });
    } finally {
      setSaving(false);
    }
  }

  async function generateSampleLetter() {
    if (!generateTemplateId || !generateEmployeeId) {
      setMessage({ type: "error", text: "Select both template and employee to generate." });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/hrms/v2/employees/${generateEmployeeId}/letters`, {
        method: "POST",
        headers,
        body: JSON.stringify({ template_id: generateTemplateId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to generate letter");

      setMessage({
        type: "success",
        text: "Letter generated successfully. Open the employee profile to preview/download from Documents Vault.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to generate letter" });
    } finally {
      setGenerating(false);
    }
  }

  if (!roleLoading && !canView) {
    return (
      <main className="hrms-enterprise min-h-screen p-8">
        <HRMSSidebarNav />
        <div className="hrms-main-with-nav">
          <HRMSTopHeader title="Letter Templates" subtitle="Access restricted to HR Admin and HR Executive roles." />
          <section className="hrms-dashboard-shell">
            <p className="text-sm text-slate-600">Use Employee Self-Service modules for your own profile actions.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="hrms-enterprise min-h-screen p-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <HRMSTopHeader
          title="Letter Templates"
          subtitle="Create, activate, and test employee letter templates with version control."
        />

        <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <article className="hrms-dashboard-shell space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">Template Registry</h2>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search template key, name, type"
                className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>

            {loading ? <p className="text-sm text-slate-500">Loading templates...</p> : null}

            {!loading && filtered.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No templates found.</p>
            ) : null}

            <div className="grid gap-2">
              {filtered.map((t) => (
                <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{t.template_key} v{t.version}</h3>
                      <p className="text-xs text-slate-600">{t.name} • {t.letter_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${t.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                      <button onClick={() => editTemplate(t)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">Edit</button>
                      {!t.is_active ? (
                        <button onClick={() => setActiveTemplate(t)} disabled={saving} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 disabled:opacity-50">
                          Set Active
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="hrms-dashboard-shell space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{formMode === "create" ? "Create Template" : "Edit Template"}</h2>
              {formMode === "edit" ? (
                <button onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">New</button>
              ) : null}
            </div>

            <div className="grid gap-2">
              <input value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} placeholder="template_key (e.g., offer_letter)" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" disabled={formMode === "edit"} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              <select value={letterType} onChange={(e) => setLetterType(e.target.value as LetterType)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="offer">offer</option>
                <option value="appointment">appointment</option>
                <option value="contract">contract</option>
              </select>
              <textarea value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} rows={3} placeholder="Subject template with tokens" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} rows={8} placeholder="Body template with tokens" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Set as active version
              </label>

              <button onClick={saveTemplate} disabled={saving || !canEdit} className="hrms-btn hrms-btn-primary px-4 py-2 text-sm disabled:opacity-50">
                {saving ? "Saving..." : formMode === "create" ? "Create Template" : "Save Changes"}
              </button>
              {!canEdit ? <p className="text-xs text-amber-700">Only HR Admin and HR Executive can save template changes.</p> : null}
            </div>
          </article>
        </section>

        <section className="hrms-dashboard-shell">
          <h2 className="text-xl font-semibold text-slate-900">Test Generate Letter</h2>
          <p className="mt-1 text-sm text-slate-600">This triggers the same employee-letter API used in onboarding and profile workflows.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <select value={generateTemplateId} onChange={(e) => setGenerateTemplateId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_key} v{t.version} {t.is_active ? "(active)" : ""}</option>
              ))}
            </select>
            <select value={generateEmployeeId} onChange={(e) => setGenerateEmployeeId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{`${e.first_name || ""} ${e.last_name || ""}`.trim() || e.email || e.id}</option>
              ))}
            </select>
            <button onClick={generateSampleLetter} disabled={generating || !generateTemplateId || !generateEmployeeId} className="hrms-btn hrms-btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {generating ? "Generating..." : "Generate Letter Now"}
            </button>
          </div>
        </section>

        {message ? (
          <section className={`rounded-xl border p-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {message.text}
          </section>
        ) : null}
      </div>
    </main>
  );
}
