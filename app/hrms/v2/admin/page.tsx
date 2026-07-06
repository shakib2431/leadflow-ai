"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/app/hrms/v2/components/logout-button";
import HRMSSidebarNav from "@/app/hrms/v2/components/hrms-sidebar-nav";
import HRMSTopHeader from "@/app/hrms/v2/components/hrms-top-header";
import HRMSUserMenu from "@/app/hrms/v2/components/hrms-user-menu";

type Row = {
  id: string;
  name?: string;
  code?: string;
  level?: string;
  role?: string;
  is_active?: boolean;
  business_entity_id?: string;
  user_id?: string;
  business_entities?: { name?: string };
};

type TemplateRow = {
  id: string;
  template_key: string;
  name: string;
  letter_type: 'offer' | 'appointment' | 'contract';
  subject_template: string;
  body_template: string;
  version: number;
  is_active: boolean;
};

type PreviewEmployee = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type LeaveRequestRow = {
  id: string;
  employee_id: string;
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  days_count?: number;
  status?: string;
  created_at?: string;
};

type AttendanceCorrectionRow = {
  id: string;
  employee_id: string;
  date: string;
  current_status?: string;
  requested_status?: string;
  reason?: string;
  status?: string;
  review_note?: string;
  created_at?: string;
  employees?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
  };
};

type AttendanceSourceMetricRow = {
  source_id: string;
  source_name: string;
  provider: 'manual' | 'biometric_csv' | 'biometric_api';
  status: 'active' | 'inactive';
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  failure_rate_percent: number;
  avg_latency_ms: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_synced_at?: string | null;
};

type AttendanceSyncLogRow = {
  id: string;
  source_id: string;
  sync_date: string;
  status: 'success' | 'failed';
  total_records: number;
  created_records: number;
  updated_records: number;
  error_message?: string | null;
  details?: Record<string, any>;
  created_at: string;
};

type AttendanceExceptionRow = {
  id: string;
  employee_id: string;
  date: string;
  exception_type: 'missing_attendance' | 'unplanned_absence' | 'pending_correction' | 'repeated_absence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  title: string;
  description?: string;
  resolution_note?: string | null;
  employees?: { first_name?: string; last_name?: string; employee_code?: string };
};

type PFSummary = {
  period_filter: { month: number | null; year: number | null };
  totals: { employee_contribution: number; employer_contribution: number; total_contribution: number };
  coverage: { active_employees: number; payroll_employees: number; pf_applicable_employees: number; pf_coverage_percent: number };
  byPeriod: Array<{ month: number; year: number; employee_contribution: number; employer_contribution: number; total_contribution: number }>;
};

type PFLedgerRow = {
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  pf_number: string | null;
  is_pf_applicable: boolean;
  period_month: number;
  period_year: number;
  run_status: string | null;
  pf_employee: number;
  pf_employer: number;
  pf_total: number;
};

type AdminSettings = {
  default_currency: string;
  timezone: string;
  attendance_cutoff_day: number;
  leave_auto_approval: boolean;
  payroll_approval_required: boolean;
};

type RolePermissionRow = {
  role: 'HR Admin' | 'HR Executive' | 'Employee';
  permission_key: string;
  is_allowed: boolean;
};

type AuditLogRow = {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  created_at: string;
  metadata?: Record<string, any>;
};

type BackupConfig = {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  storage_target: string;
  notes: string;
  last_backup_at?: string | null;
};

type BackupRun = {
  id: string;
  status: 'queued' | 'completed' | 'failed';
  snapshot_path?: string | null;
  created_at: string;
};

type Phase11Tab = 'settings' | 'permissions' | 'audit' | 'backup';

export default function HRMSAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [role, setRole] = useState<string>("");

  const [entities, setEntities] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [designations, setDesignations] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [previewEmployees, setPreviewEmployees] = useState<PreviewEmployee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRow[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrectionRow[]>([]);
  const [attendanceSourceMetrics, setAttendanceSourceMetrics] = useState<AttendanceSourceMetricRow[]>([]);
  const [failedSyncLogs, setFailedSyncLogs] = useState<AttendanceSyncLogRow[]>([]);
  const [attendanceExceptions, setAttendanceExceptions] = useState<AttendanceExceptionRow[]>([]);
  const [exceptionSummary, setExceptionSummary] = useState<any>(null);
  const [pfSummary, setPfSummary] = useState<PFSummary | null>(null);
  const [pfLedger, setPfLedger] = useState<PFLedgerRow[]>([]);
  const [pfMonth, setPfMonth] = useState<number>(new Date().getMonth() + 1);
  const [pfYear, setPfYear] = useState<number>(new Date().getFullYear());
  const [pfEmployeeFilter, setPfEmployeeFilter] = useState<string>('');
  const [updatingPFEmployeeId, setUpdatingPFEmployeeId] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionRow[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupRuns, setBackupRuns] = useState<BackupRun[]>([]);
  const [loadingPhase11, setLoadingPhase11] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [phase11Tab, setPhase11Tab] = useState<Phase11Tab>('settings');
  const [detectingExceptions, setDetectingExceptions] = useState(false);
  const [exceptionResolutionNote, setExceptionResolutionNote] = useState<Record<string, string>>({});
  const [updatingExceptionId, setUpdatingExceptionId] = useState<string | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [downloadingArtifactLogId, setDownloadingArtifactLogId] = useState<string | null>(null);
  const [correctionReviewNote, setCorrectionReviewNote] = useState<Record<string, string>>({});

  const [entityName, setEntityName] = useState("");
  const [entityCode, setEntityCode] = useState("");

  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentEntityId, setDepartmentEntityId] = useState("");

  const [designationName, setDesignationName] = useState("");
  const [designationLevel, setDesignationLevel] = useState("");
  const [designationEntityId, setDesignationEntityId] = useState("");

  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState("Employee");

  const [templateName, setTemplateName] = useState('');
  const [templateKey, setTemplateKey] = useState('offer_letter');
  const [templateType, setTemplateType] = useState<'offer' | 'appointment' | 'contract'>('offer');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState('');
  const [previewEmployeeId, setPreviewEmployeeId] = useState('');
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string } | null>(null);

  const isAdmin = role === "HR Admin" || role === "HR Executive";

  const entityOptions = useMemo(() => entities.map((e) => ({ id: e.id, label: e.name || e.id })), [entities]);

  const filteredEntities = useMemo(
    () => entities.filter((e) => `${e.name || ""} ${e.code || ""}`.toLowerCase().includes(search.toLowerCase())),
    [entities, search]
  );

  const filteredDepartments = useMemo(
    () => departments.filter((d) => `${d.name || ""} ${d.code || ""} ${d.business_entities?.name || ""}`.toLowerCase().includes(search.toLowerCase())),
    [departments, search]
  );

  const filteredDesignations = useMemo(
    () => designations.filter((d) => `${d.name || ""} ${d.level || ""} ${d.business_entities?.name || ""}`.toLowerCase().includes(search.toLowerCase())),
    [designations, search]
  );

  const filteredRoles = useMemo(
    () => roles.filter((r) => `${r.user_id || ""} ${r.role || ""}`.toLowerCase().includes(search.toLowerCase())),
    [roles, search]
  );

  const filteredTemplates = useMemo(
    () => templates.filter((t) => `${t.template_key} ${t.name} ${t.letter_type}`.toLowerCase().includes(search.toLowerCase())),
    [templates, search]
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadPFData();
  }, [isAdmin, pfMonth, pfYear, pfEmployeeFilter]);

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return {
        'x-dev-mode': 'true',
        'Content-Type': 'application/json',
      };
    }

    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
      const refreshResult = await supabase.auth.refreshSession();
      token = refreshResult.data.session?.access_token;
    }

    if (!token) throw new Error("No active session. Please login again.");
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async function apiGet(path: string) {
    const headers = await authHeader();
    const res = await fetch(path, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Request failed");
    return body.data || [];
  }

  async function apiPost(path: string, payload: any) {
    const headers = await authHeader();
    const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Request failed");
    return body.data;
  }

  async function apiPut(path: string, payload: any) {
    const headers = await authHeader();
    const res = await fetch(path, { method: "PUT", headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Request failed");
    return body.data;
  }

  async function apiPatch(path: string, payload: any) {
    const headers = await authHeader();
    const res = await fetch(path, { method: 'PATCH', headers, body: JSON.stringify(payload) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function apiDelete(path: string) {
    const headers = await authHeader();
    const res = await fetch(path, { method: "DELETE", headers });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Request failed");
    return body;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const me = await apiGet("/api/hrms/v2/user-roles/me");
      setRole(me.role || "");

      if (!(me.role === 'HR Admin' || me.role === 'HR Executive')) {
        setLoading(false);
        return;
      }

      const [be, dept, desig, roleRows, templateRows, employeeRows, leaveRows, correctionRows, sourceMetrics, failedLogs, exceptionsPayload] = await Promise.all([
        apiGet("/api/hrms/v2/business-entities"),
        apiGet("/api/hrms/v2/departments"),
        apiGet("/api/hrms/v2/designations"),
        apiGet("/api/hrms/v2/user-roles"),
        apiGet("/api/hrms/v2/letter-templates"),
        apiGet("/api/hrms/v2/employees?page=1&pageSize=200&includeArchived=true"),
        apiGet("/api/hrms/v2/leave/requests?status=pending&page=1&pageSize=100"),
        apiGet("/api/hrms/v2/attendance/corrections?status=pending&page=1&pageSize=100"),
        apiGet("/api/hrms/v2/attendance/sources/metrics"),
        apiGet("/api/hrms/v2/attendance/sync-logs?status=failed&limit=20"),
        fetch('/api/hrms/v2/attendance/exceptions?status=open&page=1&pageSize=50', { headers: await authHeader() })
          .then(async (res) => {
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Failed to load attendance exceptions');
            return body;
          })
      ]);

      setEntities(be);
      setDepartments(dept);
      setDesignations(desig);
      setRoles(roleRows);
      setTemplates(templateRows || []);
      setPreviewEmployees(employeeRows || []);
      setLeaveRequests(leaveRows || []);
      setAttendanceCorrections(correctionRows || []);
      setAttendanceSourceMetrics(sourceMetrics || []);
      setFailedSyncLogs(failedLogs || []);
      setAttendanceExceptions((exceptionsPayload?.data || []) as AttendanceExceptionRow[]);
      setExceptionSummary(exceptionsPayload?.summary || null);
      await loadPhase11Data();

      if (!departmentEntityId && be[0]?.id) setDepartmentEntityId(be[0].id);
      if (!designationEntityId && be[0]?.id) setDesignationEntityId(be[0].id);
      if (!previewEmployeeId && employeeRows?.[0]?.id) setPreviewEmployeeId(employeeRows[0].id);
      if (!previewTemplateId && templateRows?.[0]?.id) setPreviewTemplateId(templateRows[0].id);
    } catch (err: any) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function loadPhase11Data() {
    setLoadingPhase11(true);
    try {
      const [settingsData, rolePermPayload, auditPayload, backupPayload] = await Promise.all([
        apiGet('/api/hrms/v2/admin/settings'),
        fetch('/api/hrms/v2/admin/role-permissions', { headers: await authHeader() }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Failed to fetch role permissions');
          return body;
        }),
        fetch('/api/hrms/v2/admin/audit-logs?page=1&pageSize=20', { headers: await authHeader() }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Failed to fetch audit logs');
          return body;
        }),
        fetch('/api/hrms/v2/admin/backup-config', { headers: await authHeader() }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Failed to fetch backup config');
          return body;
        }),
      ]);

      setAdminSettings(settingsData as AdminSettings);
      setRolePermissions((rolePermPayload?.data || []) as RolePermissionRow[]);
      setPermissionKeys((rolePermPayload?.permission_keys || []) as string[]);
      setAuditLogs((auditPayload?.data || []) as AuditLogRow[]);
      setBackupConfig((backupPayload?.data?.config || null) as BackupConfig | null);
      setBackupRuns((backupPayload?.data?.runs || []) as BackupRun[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load Phase 11 data');
    } finally {
      setLoadingPhase11(false);
    }
  }

  async function saveAdminSettings() {
    if (!adminSettings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPut('/api/hrms/v2/admin/settings', adminSettings);
      setSuccess('Admin settings updated.');
      await loadPhase11Data();
    } catch (err: any) {
      setError(err.message || 'Failed to update admin settings');
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(roleName: 'HR Admin' | 'HR Executive' | 'Employee', key: string) {
    setRolePermissions((prev) => {
      const index = prev.findIndex((row) => row.role === roleName && row.permission_key === key);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], is_allowed: !next[index].is_allowed };
        return next;
      }
      return [...prev, { role: roleName, permission_key: key, is_allowed: true }];
    });
  }

  async function saveRolePermissions() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/hrms/v2/admin/role-permissions', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rows: rolePermissions }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save role permissions');
      setRolePermissions((body.data || []) as RolePermissionRow[]);
      setPermissionKeys((body.permission_keys || []) as string[]);
      setSuccess('Role permissions updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  }

  async function saveBackupConfig() {
    if (!backupConfig) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiPut('/api/hrms/v2/admin/backup-config', backupConfig);
      setBackupConfig(data as BackupConfig);
      setSuccess('Backup configuration updated.');
      await loadPhase11Data();
    } catch (err: any) {
      setError(err.message || 'Failed to update backup config');
    } finally {
      setSaving(false);
    }
  }

  async function runBackupNow() {
    setRunningBackup(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/api/hrms/v2/admin/backup-config', {});
      setSuccess('Backup run triggered.');
      await loadPhase11Data();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger backup');
    } finally {
      setRunningBackup(false);
    }
  }

  async function loadPFData() {
    try {
      const summary = await apiGet(`/api/hrms/v2/pf/summary?month=${pfMonth}&year=${pfYear}`);
      const ledgerPath = `/api/hrms/v2/pf/ledger?month=${pfMonth}&year=${pfYear}&page=1&pageSize=50${pfEmployeeFilter ? `&employee_id=${encodeURIComponent(pfEmployeeFilter)}` : ''}`;
      const headers = await authHeader();
      const ledgerRes = await fetch(ledgerPath, { headers });
      const ledgerBody = await ledgerRes.json();
      if (!ledgerRes.ok) throw new Error(ledgerBody.error || 'Failed to fetch PF ledger');

      setPfSummary(summary as PFSummary);
      setPfLedger((ledgerBody.data || []) as PFLedgerRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load PF data');
    }
  }

  async function togglePFApplicability(row: PFLedgerRow) {
    setUpdatingPFEmployeeId(row.employee_id);
    setError(null);
    setSuccess(null);
    try {
      await apiPut(`/api/hrms/v2/pf/registrations/${row.employee_id}`, {
        is_pf_applicable: !row.is_pf_applicable,
      });
      setSuccess(`PF applicability updated for ${row.employee_name}.`);
      await loadPFData();
    } catch (err: any) {
      setError(err.message || 'Failed to update PF applicability');
    } finally {
      setUpdatingPFEmployeeId(null);
    }
  }

  async function downloadPFReturnCSV() {
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/pf/returns/export?month=${pfMonth}&year=${pfYear}`, { headers });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to export PF return CSV');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pf-return-${pfYear}-${String(pfMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess('PF return CSV exported.');
    } catch (err: any) {
      setError(err.message || 'Failed to export PF return CSV');
    }
  }

  async function submitTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingTemplateId) {
        await apiPut(`/api/hrms/v2/letter-templates/${editingTemplateId}`, {
          name: templateName,
          subject_template: templateSubject,
          body_template: templateBody,
        });
        setSuccess('Template updated.');
      } else {
        const matchingVersions = templates
          .filter((t) => t.template_key === templateKey)
          .map((t) => Number(t.version) || 0);
        const nextVersion = Math.max(0, ...matchingVersions) + 1;

        await apiPost('/api/hrms/v2/letter-templates', {
          template_key: templateKey,
          name: templateName,
          letter_type: templateType,
          subject_template: templateSubject,
          body_template: templateBody,
          version: nextVersion,
          is_active: true,
        });

        setSuccess(`Template version ${nextVersion} created and activated.`);
      }

      resetTemplateForm();
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateKey('offer_letter');
    setTemplateType('offer');
    setTemplateSubject('');
    setTemplateBody('');
  }

  function startEditTemplate(template: TemplateRow) {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateKey(template.template_key);
    setTemplateType(template.letter_type);
    setTemplateSubject(template.subject_template);
    setTemplateBody(template.body_template);
  }

  function startNewVersion(template: TemplateRow) {
    setEditingTemplateId(null);
    setTemplateName(`${template.name} v${template.version + 1}`);
    setTemplateKey(template.template_key);
    setTemplateType(template.letter_type);
    setTemplateSubject(template.subject_template);
    setTemplateBody(template.body_template);
  }

  async function activateTemplate(template: TemplateRow) {
    if (!isAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiPut(`/api/hrms/v2/letter-templates/${template.id}`, { is_active: true });
      setSuccess(`Template ${template.name} activated.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to activate template');
    } finally {
      setSaving(false);
    }
  }

  async function runTemplatePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!previewTemplateId || !previewEmployeeId) return;

    setSaving(true);
    setError(null);

    try {
      const data = await apiPost('/api/hrms/v2/letter-templates/preview', {
        template_id: previewTemplateId,
        employee_id: previewEmployeeId,
      });
      setPreviewResult({ subject: data.subject, body: data.body });
    } catch (err: any) {
      setError(err.message || 'Failed to preview template');
      setPreviewResult(null);
    } finally {
      setSaving(false);
    }
  }

  async function submitEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/hrms/v2/business-entities", { name: entityName, code: entityCode || null });
      setEntityName("");
      setEntityCode("");
      setSuccess("Business entity created.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Failed to create business entity");
    } finally {
      setSaving(false);
    }
  }

  async function submitDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/hrms/v2/departments", {
        name: departmentName,
        code: departmentCode || null,
        business_entity_id: departmentEntityId
      });
      setDepartmentName("");
      setDepartmentCode("");
      setSuccess("Department created.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  }

  async function submitDesignation(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/hrms/v2/designations", {
        name: designationName,
        level: designationLevel || null,
        business_entity_id: designationEntityId
      });
      setDesignationName("");
      setDesignationLevel("");
      setSuccess("Designation created.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Failed to create designation");
    } finally {
      setSaving(false);
    }
  }

  async function submitRole(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/hrms/v2/user-roles", { user_id: roleUserId, role: roleValue });
      setRoleUserId("");
      setSuccess("User role updated.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pathPrefix: string, row: Row) {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPut(`${pathPrefix}/${row.id}`, { is_active: !(row.is_active ?? true) });
      setSuccess("Status updated.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  async function remove(pathPrefix: string, id: string) {
    if (!isAdmin) return;
    const ok = window.confirm("Are you sure you want to delete this record?");
    if (!ok) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiDelete(`${pathPrefix}/${id}`);
      setSuccess("Record deleted.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(userId: string) {
    if (!isAdmin) return;
    const ok = window.confirm("Remove this role assignment?");
    if (!ok) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiDelete(`/api/hrms/v2/user-roles/${userId}`);
      setSuccess("Role removed.");
      await loadAll();
    } catch (err: any) {
      setError(err.message || "Role removal failed");
    } finally {
      setSaving(false);
    }
  }

  async function reviewLeave(id: string, nextStatus: 'approved' | 'rejected') {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiPatch(`/api/hrms/v2/leave/requests/${id}`, { status: nextStatus });
      setSuccess(`Leave request ${nextStatus}.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message || `Failed to mark leave request as ${nextStatus}`);
    } finally {
      setSaving(false);
    }
  }

  async function reviewCorrection(id: string, action: 'approve' | 'reject') {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiPut(`/api/hrms/v2/attendance/corrections/${id}`, {
        action,
        review_note: correctionReviewNote[id] || null,
      });
      setSuccess(`Attendance correction ${action}d.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} attendance correction`);
    } finally {
      setSaving(false);
    }
  }

  async function retryFailedSyncLog(logId: string) {
    if (!isAdmin) return;
    setRetryingLogId(logId);
    setError(null);
    setSuccess(null);

    try {
      await apiPost(`/api/hrms/v2/attendance/sync-logs/${logId}/retry`, {});
      setSuccess('Sync retry completed.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to retry sync log');
    } finally {
      setRetryingLogId(null);
    }
  }

  async function downloadSyncArtifactFromLog(log: AttendanceSyncLogRow) {
    const artifactId = String(log.details?.artifact_id || '').trim();
    if (!artifactId) {
      setError('No artifact available for this log.');
      return;
    }

    setDownloadingArtifactLogId(log.id);
    setError(null);
    setSuccess(null);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/hrms/v2/attendance/sync-artifacts/${artifactId}`, { headers });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to download artifact');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `attendance-sync-artifact-${artifactId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess('Artifact downloaded.');
    } catch (err: any) {
      setError(err.message || 'Failed to download artifact');
    } finally {
      setDownloadingArtifactLogId(null);
    }
  }

  async function runExceptionDetection() {
    if (!isAdmin) return;
    setDetectingExceptions(true);
    setError(null);
    setSuccess(null);

    try {
      await apiPost('/api/hrms/v2/attendance/exceptions', { date: new Date().toLocaleDateString('en-CA') });
      setSuccess('Attendance exception detection completed.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to run exception detection');
    } finally {
      setDetectingExceptions(false);
    }
  }

  async function updateExceptionStatus(id: string, status: 'in_review' | 'resolved' | 'dismissed') {
    if (!isAdmin) return;
    setUpdatingExceptionId(id);
    setError(null);
    setSuccess(null);

    try {
      await fetch(`/api/hrms/v2/attendance/exceptions/${id}`, {
        method: 'PATCH',
        headers: await authHeader(),
        body: JSON.stringify({
          status,
          resolution_note: exceptionResolutionNote[id] || null,
        }),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to update exception');
      });

      setSuccess(`Exception marked as ${status}.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to update exception status');
    } finally {
      setUpdatingExceptionId(null);
    }
  }

  return (
    <div className="hrms-enterprise min-h-screen p-6 md:p-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
      <HRMSTopHeader
        title="Organization Setup"
        subtitle="Configure structure, permissions, compliance, templates, and operational controls."
        actions={
          <>
            <Link href="/hrms/v2/reports" className="hrms-btn hrms-btn-primary px-4 py-2 text-sm">Reporting Center</Link>
            <Link href="/hrms/v2" className="hrms-btn hrms-btn-secondary px-4 py-2 text-sm">Back to Employees</Link>
            <HRMSUserMenu />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities/departments/designations/users" className="md:col-span-2 p-3 rounded-xl bg-white border border-slate-200" />
        <div className="p-3 rounded-xl bg-white border border-slate-200 text-sm">
          Role: <span className="text-cyan-300 font-semibold">{role || "Unknown"}</span>
          {!isAdmin && <p className="text-slate-500 text-xs mt-1">Read-only mode (HR Admin required for write actions)</p>}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">{success}</div>}

      {loading ? (
        <div className="p-6 rounded-xl border border-slate-200 bg-white text-slate-500">Loading organization data...</div>
      ) : !isAdmin ? (
        <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100">
          <p className="font-semibold">Access restricted</p>
          <p className="text-sm mt-1 text-amber-200/90">
            HRMS Admin is available only to HR Admin and HR Executive roles.
          </p>
          <div className="mt-4">
            <Link href="/team/attendance" className="inline-block px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">
              Go to Time & PTO
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="p-5 rounded-2xl border border-slate-200 bg-white">
            <details open className="hrms-admin-accordion">
              <summary>Business Entities</summary>
            <div className="hrms-admin-accordion-body">
            <form onSubmit={submitEntity} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Entity name" className="md:col-span-2 p-2 rounded bg-white border border-slate-200" required />
              <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} placeholder="Code (optional)" className="p-2 rounded bg-white border border-slate-200" />
              <button disabled={saving || !isAdmin} className="md:col-span-3 p-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Create Entity</button>
            </form>
            {filteredEntities.length === 0 ? <p className="text-sm text-slate-500">No entities found.</p> : (
              <ul className="space-y-2 text-sm">
                {filteredEntities.map((e) => (
                  <li key={e.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 items-center">
                    <span>{e.name} <span className="text-slate-500">({e.code || "no-code"})</span></span>
                    <div className="flex gap-2">
                      <button disabled={!isAdmin || saving} onClick={() => toggleActive('/api/hrms/v2/business-entities', e)} className="px-2 py-1 rounded bg-white/10 text-xs">{e.is_active === false ? 'Activate' : 'Deactivate'}</button>
                      <button disabled={!isAdmin || saving} onClick={() => remove('/api/hrms/v2/business-entities', e.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-200 text-xs">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white">
            <details open className="hrms-admin-accordion">
              <summary>Departments</summary>
            <div className="hrms-admin-accordion-body">
            <form onSubmit={submitDepartment} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <select value={departmentEntityId} onChange={(e) => setDepartmentEntityId(e.target.value)} className="p-2 rounded bg-white border border-slate-200" required>
                {entityOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Department name" className="p-2 rounded bg-white border border-slate-200" required />
              <input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} placeholder="Code (optional)" className="p-2 rounded bg-white border border-slate-200 md:col-span-2" />
              <button disabled={saving || !isAdmin} className="md:col-span-2 p-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Create Department</button>
            </form>
            {filteredDepartments.length === 0 ? <p className="text-sm text-slate-500">No departments found.</p> : (
              <ul className="space-y-2 text-sm">
                {filteredDepartments.map((d) => (
                  <li key={d.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 items-center">
                    <span>{d.name} <span className="text-slate-500">- {d.business_entities?.name || "Unknown entity"}</span></span>
                    <div className="flex gap-2">
                      <button disabled={!isAdmin || saving} onClick={() => toggleActive('/api/hrms/v2/departments', d)} className="px-2 py-1 rounded bg-white/10 text-xs">{d.is_active === false ? 'Activate' : 'Deactivate'}</button>
                      <button disabled={!isAdmin || saving} onClick={() => remove('/api/hrms/v2/departments', d.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-200 text-xs">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white">
            <details open className="hrms-admin-accordion">
              <summary>Designations</summary>
            <div className="hrms-admin-accordion-body">
            <form onSubmit={submitDesignation} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <select value={designationEntityId} onChange={(e) => setDesignationEntityId(e.target.value)} className="p-2 rounded bg-white border border-slate-200" required>
                {entityOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <input value={designationName} onChange={(e) => setDesignationName(e.target.value)} placeholder="Designation name" className="p-2 rounded bg-white border border-slate-200" required />
              <input value={designationLevel} onChange={(e) => setDesignationLevel(e.target.value)} placeholder="Level (optional)" className="p-2 rounded bg-white border border-slate-200 md:col-span-2" />
              <button disabled={saving || !isAdmin} className="md:col-span-2 p-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Create Designation</button>
            </form>
            {filteredDesignations.length === 0 ? <p className="text-sm text-slate-500">No designations found.</p> : (
              <ul className="space-y-2 text-sm">
                {filteredDesignations.map((d) => (
                  <li key={d.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 items-center">
                    <span>{d.name} <span className="text-slate-500">({d.level || "-"}) • {d.business_entities?.name || "Unknown entity"}</span></span>
                    <div className="flex gap-2">
                      <button disabled={!isAdmin || saving} onClick={() => toggleActive('/api/hrms/v2/designations', d)} className="px-2 py-1 rounded bg-white/10 text-xs">{d.is_active === false ? 'Activate' : 'Deactivate'}</button>
                      <button disabled={!isAdmin || saving} onClick={() => remove('/api/hrms/v2/designations', d.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-200 text-xs">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white">
            <details open className="hrms-admin-accordion">
              <summary>User Roles</summary>
            <div className="hrms-admin-accordion-body">
            <form onSubmit={submitRole} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <input value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)} placeholder="Supabase User ID" className="p-2 rounded bg-white border border-slate-200" required />
              <select value={roleValue} onChange={(e) => setRoleValue(e.target.value)} className="p-2 rounded bg-white border border-slate-200">
                <option>HR Admin</option>
                <option>HR Executive</option>
                <option>Employee</option>
              </select>
              <button disabled={saving || !isAdmin} className="md:col-span-2 p-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Assign Role</button>
            </form>
            {filteredRoles.length === 0 ? <p className="text-sm text-slate-500">No user roles found.</p> : (
              <ul className="space-y-2 text-sm">
                {filteredRoles.map((r) => (
                  <li key={r.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 items-center">
                    <span><span className="font-mono text-xs">{r.user_id}</span> <span className="text-cyan-300">{r.role}</span></span>
                    <button disabled={!isAdmin || saving} onClick={() => removeRole(String(r.user_id))} className="px-2 py-1 rounded bg-red-500/20 text-red-200 text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>Pending Leave Approvals</summary>
            <div className="hrms-admin-accordion-body">
            {leaveRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No pending leave requests.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {leaveRequests.map((leave) => (
                  <li key={leave.id} className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{leave.leave_type || 'leave'} | {leave.start_date} - {leave.end_date}</p>
                      <p className="text-slate-500 text-xs">Employee: {leave.employee_id} | Days: {leave.days_count || 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={saving}
                        onClick={() => reviewLeave(leave.id, 'approved')}
                        className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-200 text-xs disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => reviewLeave(leave.id, 'rejected')}
                        className="px-3 py-1 rounded bg-rose-500/20 text-rose-200 text-xs disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>PF Management (Phase 9)</summary>
            <div className="hrms-admin-accordion-body">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={pfMonth}
                  onChange={(e) => setPfMonth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                  className="w-20 rounded border border-slate-200 bg-white p-1.5 text-xs"
                />
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={pfYear}
                  onChange={(e) => setPfYear(Math.max(2000, Math.min(2100, Number(e.target.value) || new Date().getFullYear())))}
                  className="w-24 rounded border border-slate-200 bg-white p-1.5 text-xs"
                />
                <button
                  onClick={downloadPFReturnCSV}
                  className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white"
                >
                  Export PF Return CSV
                </button>
              </div>
            </div>

            {pfSummary ? (
              <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Employee PF: ₹ {pfSummary.totals.employee_contribution.toLocaleString('en-IN')}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Employer PF: ₹ {pfSummary.totals.employer_contribution.toLocaleString('en-IN')}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Total PF: ₹ {pfSummary.totals.total_contribution.toLocaleString('en-IN')}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Coverage: {pfSummary.coverage.pf_coverage_percent.toFixed(2)}%</div>
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-500">No PF summary available yet.</p>
            )}

            <div className="mb-2">
              <input
                value={pfEmployeeFilter}
                onChange={(e) => setPfEmployeeFilter(e.target.value)}
                placeholder="Filter by employee ID"
                className="w-full rounded border border-slate-200 bg-white p-2 text-xs"
              />
            </div>

            {pfLedger.length === 0 ? (
              <p className="text-sm text-slate-500">No PF ledger rows found for selected period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-medium">Employee</th>
                      <th className="py-2 text-left font-medium">PF Number</th>
                      <th className="py-2 text-left font-medium">Run</th>
                      <th className="py-2 text-left font-medium">Employee PF</th>
                      <th className="py-2 text-left font-medium">Employer PF</th>
                      <th className="py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pfLedger.map((row) => (
                      <tr key={`${row.employee_id}-${row.period_year}-${row.period_month}`} className="border-b border-slate-200">
                        <td className="py-2 text-slate-900">
                          <div className="font-medium">{row.employee_name}</div>
                          <div className="text-xs text-slate-500">{row.employee_code || row.employee_id}</div>
                        </td>
                        <td className="py-2 text-slate-700">{row.pf_number || '-'}</td>
                        <td className="py-2 text-slate-700">{String(row.period_month).padStart(2, '0')}/{row.period_year} ({row.run_status || '-'})</td>
                        <td className="py-2 text-slate-700">₹ {row.pf_employee.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-slate-700">₹ {row.pf_employer.toLocaleString('en-IN')}</td>
                        <td className="py-2">
                          <button
                            disabled={updatingPFEmployeeId === row.employee_id}
                            onClick={() => togglePFApplicability(row)}
                            className={`rounded px-2.5 py-1 text-xs ${row.is_pf_applicable ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'} disabled:opacity-50`}
                          >
                            {updatingPFEmployeeId === row.employee_id ? 'Updating...' : row.is_pf_applicable ? 'Mark Not Applicable' : 'Mark Applicable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
            <summary>Admin Console Hardening (Phase 11)</summary>
            <div className="hrms-admin-accordion-body">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={loadPhase11Data} disabled={loadingPhase11} className="rounded bg-white/10 px-3 py-1 text-xs disabled:opacity-50">
                {loadingPhase11 ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {([
                { key: 'settings', label: 'Settings' },
                { key: 'permissions', label: 'Permissions' },
                { key: 'audit', label: 'Audit Logs' },
                { key: 'backup', label: 'Backup' },
              ] as Array<{ key: Phase11Tab; label: string }>).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPhase11Tab(tab.key)}
                  className={`rounded px-3 py-1.5 text-xs border ${phase11Tab === tab.key ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {phase11Tab === 'settings' && (
                <>
                  <h3 className="text-sm font-semibold mb-2">System Settings</h3>
                  {adminSettings ? (
                    <div className="space-y-2 text-xs max-w-2xl">
                      <input value={adminSettings.default_currency} onChange={(e) => setAdminSettings({ ...adminSettings, default_currency: e.target.value })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Default currency" />
                      <input value={adminSettings.timezone} onChange={(e) => setAdminSettings({ ...adminSettings, timezone: e.target.value })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Timezone" />
                      <input type="number" min={1} max={31} value={adminSettings.attendance_cutoff_day} onChange={(e) => setAdminSettings({ ...adminSettings, attendance_cutoff_day: Number(e.target.value) || 1 })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Attendance cutoff day" />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={adminSettings.leave_auto_approval} onChange={(e) => setAdminSettings({ ...adminSettings, leave_auto_approval: e.target.checked })} />
                        Leave auto approval
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={adminSettings.payroll_approval_required} onChange={(e) => setAdminSettings({ ...adminSettings, payroll_approval_required: e.target.checked })} />
                        Payroll approval required
                      </label>
                      <button onClick={saveAdminSettings} disabled={saving} className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Save Settings</button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Settings unavailable.</p>
                  )}
                </>
              )}

              {phase11Tab === 'permissions' && (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Role Permissions Matrix</h3>
                    <button onClick={saveRolePermissions} disabled={saving} className="rounded bg-cyan-600 px-3 py-1 text-xs text-white disabled:opacity-50">Save Matrix</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-1 text-left">Permission</th>
                          <th className="py-1 text-left">HR Admin</th>
                          <th className="py-1 text-left">HR Executive</th>
                          <th className="py-1 text-left">Employee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissionKeys.map((key) => {
                          const byRole = (roleName: 'HR Admin' | 'HR Executive' | 'Employee') =>
                            rolePermissions.find((row) => row.role === roleName && row.permission_key === key)?.is_allowed || false;
                          return (
                            <tr key={key} className="border-t border-slate-200">
                              <td className="py-1 pr-2">{key}</td>
                              <td className="py-1"><input type="checkbox" checked={byRole('HR Admin')} onChange={() => togglePermission('HR Admin', key)} /></td>
                              <td className="py-1"><input type="checkbox" checked={byRole('HR Executive')} onChange={() => togglePermission('HR Executive', key)} /></td>
                              <td className="py-1"><input type="checkbox" checked={byRole('Employee')} onChange={() => togglePermission('Employee', key)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {phase11Tab === 'audit' && (
                <>
                  <h3 className="text-sm font-semibold mb-2">Audit Log Viewer</h3>
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500">No audit logs available.</p>
                  ) : (
                    <ul className="space-y-2 max-h-[420px] overflow-auto text-xs">
                      {auditLogs.map((row, idx) => (
                        <li key={`${row.created_at}-${idx}`} className="rounded border border-slate-200 bg-slate-50 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{row.action}</span>
                            <span className="text-slate-500">{new Date(row.created_at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-slate-600">{row.entity_type}{row.entity_id ? ` / ${row.entity_id}` : ''}</div>
                          <div className="mt-1 text-slate-500">{row.actor_email || '-'} ({row.actor_role || '-'})</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {phase11Tab === 'backup' && (
                <>
                  <h3 className="text-sm font-semibold mb-2">Backup Configuration</h3>
                  {backupConfig ? (
                    <div className="space-y-2 text-xs max-w-2xl">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={backupConfig.enabled} onChange={(e) => setBackupConfig({ ...backupConfig, enabled: e.target.checked })} />
                        Enable backups
                      </label>
                      <select value={backupConfig.frequency} onChange={(e) => setBackupConfig({ ...backupConfig, frequency: e.target.value as BackupConfig['frequency'] })} className="w-full rounded border border-slate-200 bg-white p-2">
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                        <option value="monthly">monthly</option>
                      </select>
                      <input type="number" min={7} max={3650} value={backupConfig.retention_days} onChange={(e) => setBackupConfig({ ...backupConfig, retention_days: Number(e.target.value) || 30 })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Retention days" />
                      <input value={backupConfig.storage_target} onChange={(e) => setBackupConfig({ ...backupConfig, storage_target: e.target.value })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Storage target" />
                      <textarea value={backupConfig.notes || ''} onChange={(e) => setBackupConfig({ ...backupConfig, notes: e.target.value })} className="w-full rounded border border-slate-200 bg-white p-2" placeholder="Notes" />
                      <div className="flex gap-2">
                        <button onClick={saveBackupConfig} disabled={saving} className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Save Backup Config</button>
                        <button onClick={runBackupNow} disabled={runningBackup} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">{runningBackup ? 'Running...' : 'Run Backup Now'}</button>
                      </div>
                      <p className="text-[11px] text-slate-500">Last backup: {backupConfig.last_backup_at ? new Date(backupConfig.last_backup_at).toLocaleString() : '-'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Backup config unavailable.</p>
                  )}

                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <h4 className="text-xs font-semibold mb-1">Recent Backup Runs</h4>
                    {backupRuns.length === 0 ? (
                      <p className="text-xs text-slate-500">No backup runs recorded yet.</p>
                    ) : (
                      <ul className="space-y-1 text-xs max-w-2xl">
                        {backupRuns.slice(0, 8).map((run) => (
                          <li key={run.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 p-1.5">
                            <span>{run.status}</span>
                            <span className="text-slate-500">{new Date(run.created_at).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>Pending Attendance Corrections</summary>
            <div className="hrms-admin-accordion-body">
            {attendanceCorrections.length === 0 ? (
              <p className="text-sm text-slate-500">No pending attendance corrections.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {attendanceCorrections.map((row) => (
                  <li key={row.id} className="p-3 rounded bg-slate-50 border border-slate-200">
                    <p className="font-medium text-slate-900">
                      {row.employees?.first_name || ''} {row.employees?.last_name || ''} ({row.employees?.employee_code || row.employee_id})
                    </p>
                    <p className="text-slate-600 text-xs mt-1">Date: {row.date} | Current: {row.current_status || '-'} | Requested: {row.requested_status || '-'}</p>
                    <p className="text-slate-700 text-xs mt-1">Reason: {row.reason || '-'}</p>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        value={correctionReviewNote[row.id] || ''}
                        onChange={(e) => setCorrectionReviewNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder="Review note (required for reject)"
                        className="md:flex-1 p-2 rounded bg-white border border-slate-200"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={saving}
                          onClick={() => reviewCorrection(row.id, 'approve')}
                          className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-200 text-xs disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={saving}
                          onClick={() => reviewCorrection(row.id, 'reject')}
                          className="px-3 py-1 rounded bg-rose-500/20 text-rose-200 text-xs disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>Attendance Source Health (Phase 6)</summary>
            <div className="hrms-admin-accordion-body">
            {attendanceSourceMetrics.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance source metrics available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-medium">Source</th>
                      <th className="py-2 text-left font-medium">Provider</th>
                      <th className="py-2 text-left font-medium">Syncs</th>
                      <th className="py-2 text-left font-medium">Failure Rate</th>
                      <th className="py-2 text-left font-medium">Avg Latency</th>
                      <th className="py-2 text-left font-medium">Last Success</th>
                      <th className="py-2 text-left font-medium">Last Failure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSourceMetrics.map((row) => (
                      <tr key={row.source_id} className="border-b border-slate-200">
                        <td className="py-2 text-slate-900">
                          <div className="font-medium">{row.source_name}</div>
                          <div className="text-xs text-slate-500">{row.source_id}</div>
                        </td>
                        <td className="py-2 text-slate-700">{row.provider}</td>
                        <td className="py-2 text-slate-700">{row.total_syncs} (ok {row.successful_syncs} / fail {row.failed_syncs})</td>
                        <td className={`py-2 ${row.failure_rate_percent > 20 ? 'text-rose-300' : 'text-emerald-300'}`}>{row.failure_rate_percent.toFixed(2)}%</td>
                        <td className="py-2 text-slate-700">{row.avg_latency_ms} ms</td>
                        <td className="py-2 text-slate-700">{row.last_success_at ? new Date(row.last_success_at).toLocaleString() : '-'}</td>
                        <td className="py-2 text-slate-700">{row.last_failure_at ? new Date(row.last_failure_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>Failed Attendance Sync Logs</summary>
            <div className="hrms-admin-accordion-body">
            {failedSyncLogs.length === 0 ? (
              <p className="text-sm text-slate-500">No failed sync logs.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {failedSyncLogs.map((log) => (
                  <li key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-900">{log.sync_date} | Source {log.source_id}</p>
                    <p className="mt-1 text-xs text-rose-300">{log.error_message || 'Sync failed'}</p>
                    <p className="mt-1 text-xs text-slate-500">Rows: {log.total_records} | Created: {log.created_records} | Updated: {log.updated_records}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        disabled={Boolean(retryingLogId) || saving}
                        onClick={() => retryFailedSyncLog(log.id)}
                        className="rounded bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200 disabled:opacity-50"
                      >
                        {retryingLogId === log.id ? 'Retrying...' : 'Retry Sync'}
                      </button>
                      <button
                        disabled={Boolean(downloadingArtifactLogId) || !log.details?.artifact_id}
                        onClick={() => downloadSyncArtifactFromLog(log)}
                        className="rounded bg-cyan-500/20 px-3 py-1 text-xs text-cyan-200 disabled:opacity-50"
                      >
                        {downloadingArtifactLogId === log.id ? 'Downloading...' : 'Download Artifact'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
            <summary>Attendance Exceptions Queue (Phase 7)</summary>
            <div className="hrms-admin-accordion-body">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <button
                disabled={detectingExceptions || saving}
                onClick={runExceptionDetection}
                className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                {detectingExceptions ? 'Detecting...' : 'Run Detection'}
              </button>
            </div>

            {exceptionSummary && (
              <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Total Open: {Number(exceptionSummary.total || 0)}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">High/Critical: {Number(exceptionSummary.bySeverity?.high || 0) + Number(exceptionSummary.bySeverity?.critical || 0)}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Missing Attendance: {Number(exceptionSummary.byType?.missing_attendance || 0)}</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">Unplanned Absence: {Number(exceptionSummary.byType?.unplanned_absence || 0)}</div>
              </div>
            )}

            {attendanceExceptions.length === 0 ? (
              <p className="text-sm text-slate-500">No open attendance exceptions.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {attendanceExceptions.map((row) => (
                  <li key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-900">{row.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {row.employees?.first_name || ''} {row.employees?.last_name || ''} ({row.employees?.employee_code || row.employee_id}) | {row.date} | {row.exception_type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Severity: {row.severity} | Status: {row.status}</p>
                    {row.description && <p className="mt-1 text-xs text-slate-700">{row.description}</p>}
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        value={exceptionResolutionNote[row.id] || ''}
                        onChange={(e) => setExceptionResolutionNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder="Resolution note (required for resolved/dismissed)"
                        className="md:flex-1 rounded bg-white p-2 text-xs border border-slate-200"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={Boolean(updatingExceptionId) || saving}
                          onClick={() => updateExceptionStatus(row.id, 'in_review')}
                          className="rounded bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200 disabled:opacity-50"
                        >
                          {updatingExceptionId === row.id ? 'Updating...' : 'In Review'}
                        </button>
                        <button
                          disabled={Boolean(updatingExceptionId) || saving}
                          onClick={() => updateExceptionStatus(row.id, 'resolved')}
                          className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={Boolean(updatingExceptionId) || saving}
                          onClick={() => updateExceptionStatus(row.id, 'dismissed')}
                          className="rounded bg-rose-500/20 px-2.5 py-1 text-xs text-rose-200 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>

          <section className="p-5 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
            <details open className="hrms-admin-accordion">
              <summary>Offer & Appointment Templates</summary>
            <div className="hrms-admin-accordion-body">

            <form onSubmit={submitTemplate} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" className="p-2 rounded bg-white border border-slate-200" required />
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value as 'offer' | 'appointment' | 'contract')} className="p-2 rounded bg-white border border-slate-200">
                <option value="offer">Offer</option>
                <option value="appointment">Appointment</option>
                <option value="contract">Contract</option>
              </select>

              <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="p-2 rounded bg-white border border-slate-200 md:col-span-2" disabled={Boolean(editingTemplateId)}>
                <option value="offer_letter">offer_letter</option>
                <option value="appointment_letter">appointment_letter</option>
                <option value="contract_letter">contract_letter</option>
              </select>

              <textarea value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} placeholder="Subject template" className="p-2 rounded bg-white border border-slate-200 md:col-span-2 min-h-[60px]" required />
              <textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} placeholder="Body template (use tokens like {{employee_name}})" className="p-2 rounded bg-white border border-slate-200 md:col-span-2 min-h-[140px]" required />

              <div className="md:col-span-2 flex gap-2">
                <button disabled={saving || !isAdmin} className="p-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">
                  {editingTemplateId ? 'Update Template' : 'Create New Version'}
                </button>
                <button type="button" onClick={resetTemplateForm} className="p-2 rounded bg-white/10">Reset</button>
              </div>
            </form>

            <form onSubmit={runTemplatePreview} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <select value={previewTemplateId} onChange={(e) => setPreviewTemplateId(e.target.value)} className="p-2 rounded bg-white border border-slate-200" required>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{`${t.template_key} v${t.version} ${t.is_active ? '(active)' : ''}`}</option>
                ))}
              </select>
              <select value={previewEmployeeId} onChange={(e) => setPreviewEmployeeId(e.target.value)} className="p-2 rounded bg-white border border-slate-200" required>
                {previewEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || emp.id}</option>
                ))}
              </select>
              <button disabled={saving} className="p-2 rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50">Preview Merge</button>
            </form>

            {previewResult && (
              <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm">
                <p className="font-semibold text-cyan-200">Preview Subject</p>
                <p className="text-slate-900 mb-2">{previewResult.subject}</p>
                <p className="font-semibold text-cyan-200">Preview Body</p>
                <pre className="whitespace-pre-wrap text-slate-800 text-xs">{previewResult.body}</pre>
              </div>
            )}

            {filteredTemplates.length === 0 ? <p className="text-sm text-slate-500">No templates found.</p> : (
              <ul className="space-y-2 text-sm">
                {filteredTemplates.map((t) => (
                  <li key={t.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 items-center">
                    <span>
                      <span className="font-semibold">{t.template_key}</span> v{t.version} - {t.name}
                      <span className={`ml-2 text-xs ${t.is_active ? 'text-emerald-300' : 'text-slate-500'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                    <div className="flex gap-2">
                      <button disabled={!isAdmin || saving} onClick={() => startEditTemplate(t)} className="px-2 py-1 rounded bg-white/10 text-xs">Edit</button>
                      <button disabled={!isAdmin || saving} onClick={() => startNewVersion(t)} className="px-2 py-1 rounded bg-violet-500/20 text-violet-200 text-xs">New Version</button>
                      <button disabled={!isAdmin || saving || t.is_active} onClick={() => activateTemplate(t)} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-200 text-xs">Activate</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
            </details>
          </section>
        </div>
      )}
      </div>
    </div>
  );
}

