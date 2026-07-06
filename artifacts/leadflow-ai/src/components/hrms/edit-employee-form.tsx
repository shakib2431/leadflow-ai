

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

type MasterOption = { id: string; name: string; business_entity_id?: string | null };
type ManagerOption = { id: string; name: string };

export default function EditEmployeeForm({ employee, onClose, mapped, options }: { employee: any, onClose: () => void, mapped?: any, options?: { entities: MasterOption[]; departments: MasterOption[]; designations: MasterOption[]; managers: ManagerOption[] } }) {
  const bank = employee.bank_details || {};
  const entities = options?.entities || [];
  const departments = options?.departments || [];
  const designations = options?.designations || [];
  const managers = options?.managers || [];

  const initial = {
    first_name: (mapped?.first_name ?? employee.first_name) || '',
    last_name: (mapped?.last_name ?? employee.last_name) || '',
    email: (mapped?.email ?? employee.email) || '',
    mobile: employee.mobile || '',
    phone: (mapped?.phone ?? employee.phone) || '',
    date_of_birth: employee.date_of_birth || '',
    gender: employee.gender || '',
    address: employee.address || '',
    department: (mapped?.department ?? employee.department) || '',
    designation: employee.designation || '',
    business_entity_id: employee.business_entity_id || '',
    department_id: employee.department_id || '',
    designation_id: employee.designation_id || '',
    business_entity: employee.business_entity || '',
    joining_date: employee.joining_date || employee.date_of_joining || '',
    employment_status: employee.employment_status || employee.status || '',
    reporting_manager_id: employee.reporting_manager_id || '',
    current_title: (mapped?.current_title ?? mapped?.title ?? employee.current_title) || '',
    pf_number: employee.pf_number || '',
    aadhaar: employee.aadhaar || employee.aadhaar_number_masked || '',
    pan: employee.pan || employee.pan_number || '',
    bank_account: bank.account_number || employee.bank_account_number || '',
    bank_ifsc: bank.ifsc || employee.bank_ifsc || '',
    salary: employee.salary ?? '',
    tax_regime: employee.tax_regime || 'NEW',
    declared_80c: employee.declared_80c ?? 0,
    declared_80d: employee.declared_80d ?? 0,
  };

  const [form, setForm] = useState(initial);

  // Update form if mapped changes while modal open
  React.useEffect(() => {
    if (mapped) setForm({
      first_name: (mapped.first_name ?? employee.first_name) || '',
      last_name: (mapped.last_name ?? employee.last_name) || '',
      email: (mapped.email ?? employee.email) || '',
      mobile: employee.mobile || '',
      phone: (mapped.phone ?? employee.phone) || '',
      date_of_birth: employee.date_of_birth || '',
      gender: employee.gender || '',
      address: employee.address || '',
      department: (mapped.department ?? employee.department) || '',
      designation: employee.designation || '',
      business_entity_id: employee.business_entity_id || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      business_entity: employee.business_entity || '',
      joining_date: employee.joining_date || employee.date_of_joining || '',
      employment_status: employee.employment_status || employee.status || '',
      reporting_manager_id: employee.reporting_manager_id || '',
      current_title: (mapped.current_title ?? mapped.title ?? employee.current_title) || '',
      pf_number: employee.pf_number || '',
      aadhaar: employee.aadhaar || employee.aadhaar_number_masked || '',
      pan: employee.pan || employee.pan_number || '',
      bank_account: bank.account_number || employee.bank_account_number || '',
      bank_ifsc: bank.ifsc || employee.bank_ifsc || '',
      salary: employee.salary ?? '',
      tax_regime: employee.tax_regime || 'NEW',
      declared_80c: employee.declared_80c ?? 0,
      declared_80d: employee.declared_80d ?? 0,
    });
  }, [mapped]);
  const [saving, setSaving] = useState(false);

  const filteredDepartments = form.business_entity_id
    ? departments.filter((d) => !d.business_entity_id || d.business_entity_id === form.business_entity_id)
    : departments;
  const filteredDesignations = form.business_entity_id
    ? designations.filter((d) => !d.business_entity_id || d.business_entity_id === form.business_entity_id)
    : designations;

  function getEntityName(id: string) {
    const found = entities.find((e) => e.id === id);
    return found?.name || null;
  }

  async function authHeader(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('prod')) {
      return {
        'x-dev-mode': 'true',
        'x-dev-role': 'HR Admin',
      };
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('No active session');

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await authHeader();

      const payload: any = { ...form };
      if (payload.salary === '') delete payload.salary;
      delete payload.current_title;
      delete payload.department;
      delete payload.business_entity;
      delete payload.designation;
      ['date_of_birth', 'joining_date', 'date_of_joining'].forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });
      ['business_entity_id', 'department_id', 'designation_id', 'reporting_manager_id'].forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });
      payload.status = payload.employment_status || payload.status;
      payload.bank_details = {
        account_number: payload.bank_account || null,
        ifsc: payload.bank_ifsc || null,
      };

      delete payload.bank_account;
      delete payload.bank_ifsc;

      const res = await fetch(`/api/hrms/v2/employees/${employee.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Update failed');

      onEmployeeUpdated();

      onClose();
    } catch (err: any) {
      alert('Save failed: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-h-[calc(90vh-4rem)] space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="p-2 bg-white/5 rounded" />
        <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="p-2 bg-white/5 rounded" />
      </div>
      <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 bg-white/5 rounded" />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Mobile" />
        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Phone" />
      </div>
      <input value={String(form.salary)} onChange={e => setForm({...form, salary: Number(e.target.value)})} className="w-full p-2 bg-white/5 rounded" placeholder="Salary (annual)" />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Department" />
        <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Designation" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.business_entity} onChange={e => setForm({...form, business_entity: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Business Entity" />
        <input value={form.employment_status} onChange={e => setForm({...form, employment_status: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Employment Status" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={form.business_entity_id || ''} onChange={e => setForm({...form, business_entity_id: e.target.value})} className="p-2 bg-white/5 rounded">
          <option value="">Select business entity</option>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={form.reporting_manager_id || ''} onChange={e => setForm({...form, reporting_manager_id: e.target.value})} className="p-2 bg-white/5 rounded">
          <option value="">Select reporting manager</option>
          {managers.filter((m) => m.id !== employee.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={form.department_id || ''} onChange={e => setForm({...form, department_id: e.target.value})} className="p-2 bg-white/5 rounded">
          <option value="">Select department</option>
          {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={form.designation_id || ''} onChange={e => setForm({...form, designation_id: e.target.value})} className="p-2 bg-white/5 rounded">
          <option value="">Select designation</option>
          {filteredDesignations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} className="p-2 bg-white/5 rounded" />
        <input value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Gender" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className="p-2 bg-white/5 rounded" />
      </div>
      <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2 bg-white/5 rounded" placeholder="Address" rows={3} />
      <div className="grid grid-cols-3 gap-3">
        <input value={form.pf_number} onChange={e => setForm({...form, pf_number: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="PF Number" />
        <input value={form.aadhaar} onChange={e => setForm({...form, aadhaar: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Aadhaar" />
        <input value={form.pan} onChange={e => setForm({...form, pan: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="PAN" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="Bank Account" />
        <input value={form.bank_ifsc} onChange={e => setForm({...form, bank_ifsc: e.target.value})} className="p-2 bg-white/5 rounded" placeholder="IFSC" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <select value={form.tax_regime || 'NEW'} onChange={e => setForm({...form, tax_regime: e.target.value})} className="p-2 bg-white/5 rounded">
          <option value="NEW">Tax Regime: NEW</option>
          <option value="OLD">Tax Regime: OLD</option>
        </select>
        <input type="number" min={0} max={150000} value={String(form.declared_80c ?? 0)} onChange={e => setForm({...form, declared_80c: Number(e.target.value || 0)})} className="p-2 bg-white/5 rounded" placeholder="Declared 80C" />
        <input type="number" min={0} max={100000} value={String(form.declared_80d ?? 0)} onChange={e => setForm({...form, declared_80d: Number(e.target.value || 0)})} className="p-2 bg-white/5 rounded" placeholder="Declared 80D" />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 rounded">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-500 rounded text-white">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}
