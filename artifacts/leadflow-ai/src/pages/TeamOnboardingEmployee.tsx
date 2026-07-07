

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, AlertCircle, CheckCircle } from "lucide-react";
import HRMSSidebarNav from "@/components/hrms/hrms-sidebar-nav";
import HRMSTopHeader from "@/components/hrms/hrms-top-header";

type EmployeeRow = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  designation?: string;
  current_title?: string;
  department?: string;
  onboarding_checklist?: {
    pre_onboarding?: {
      status?: string;
      submitted_at?: string;
      form?: Record<string, string>;
    };
  };
};

type ActivationForm = {
  personal: {
    first_name: string;
    middle_name: string;
    last_name: string;
    preferred_name: string;
    date_of_birth: string;
    gender: string;
    marital_status: string;
    nationality: string;
    blood_group: string;
    personal_email: string;
    personal_phone: string;
  };
  family: {
    father_name: string;
    mother_name: string;
    spouse_name: string;
    dependents_count: string;
  };
  addresses: {
    current_address: string;
    permanent_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    alternate_phone: string;
  };
  education: {
    highest_qualification: string;
    institution: string;
    graduation_year: string;
    specialization: string;
  };
  previous_employment: {
    employer_name: string;
    designation: string;
    start_date: string;
    end_date: string;
    total_experience_years: string;
    last_drawn_ctc: string;
    reason_for_leaving: string;
  };
  statutory: {
    pan_number: string;
    aadhaar_last4: string;
    uan_number: string;
    esic_number: string;
    passport_number: string;
    driving_license_number: string;
    voter_id: string;
  };
  bank: {
    account_number: string;
    ifsc: string;
    bank_name: string;
    account_holder_name: string;
  };
  medical: {
    known_conditions: string;
    allergies: string;
    disability_details: string;
  };
  compensation: {
    ctc_annual: string;
  };
  organization: {
    company: string;
    business_entity: string;
    branch: string;
    team: string;
    department: string;
    designation: string;
  };
};

const initialForm: ActivationForm = {
  personal: { first_name: "", middle_name: "", last_name: "", preferred_name: "", date_of_birth: "", gender: "Male", marital_status: "", nationality: "", blood_group: "", personal_email: "", personal_phone: "" },
  family: { father_name: "", mother_name: "", spouse_name: "", dependents_count: "" },
  addresses: { current_address: "", permanent_address: "", city: "", state: "", postal_code: "", country: "" },
  emergency_contact: { name: "", relationship: "", phone: "", alternate_phone: "" },
  education: { highest_qualification: "", institution: "", graduation_year: "", specialization: "" },
  previous_employment: { employer_name: "", designation: "", start_date: "", end_date: "", total_experience_years: "", last_drawn_ctc: "", reason_for_leaving: "" },
  statutory: { pan_number: "", aadhaar_last4: "", uan_number: "", esic_number: "", passport_number: "", driving_license_number: "", voter_id: "" },
  bank: { account_number: "", ifsc: "", bank_name: "", account_holder_name: "" },
  medical: { known_conditions: "", allergies: "", disability_details: "" },
  compensation: { ctc_annual: "" },
  organization: { company: "", business_entity: "", branch: "", team: "", department: "", designation: "" },
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function pickValue(form: Record<string, string> | undefined, keys: string[]) {
  if (!form) return "";
  for (const key of keys) {
    const value = String(form[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export default function OnboardingDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams();
  const employeeId = params.employeeId as string;

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [formData, setFormData] = useState<ActivationForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "review">("edit");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function authHeaders() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
      headers["x-dev-mode"] = "true";
      headers["x-dev-role"] = "HR Admin";
    }
    return headers;
  }

  async function loadEmployee() {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/v2/pre-onboarding/queue", { headers: authHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load");

      let emp = (body.data || []).find((e: EmployeeRow) => e.id === employeeId) as EmployeeRow | undefined;

      // Fallback: directory employees may not appear in pre-onboarding queue.
      if (!emp) {
        const employeeRes = await fetch(`/api/hrms/v2/employees/${encodeURIComponent(employeeId)}`, {
          headers: authHeaders(),
        });
        const employeeBody = await employeeRes.json();
        if (!employeeRes.ok) {
          throw new Error(employeeBody.error || "Employee not found");
        }
        emp = employeeBody?.data as EmployeeRow;
      }

      if (!emp) throw new Error("Employee not found");
      
      setEmployee(emp);
      const form = (emp.onboarding_checklist?.pre_onboarding?.form || {}) as Record<string, string>;
      const offeredDesignation = String(emp.designation || emp.current_title || "").trim();

      setFormData((prev) => ({
        ...prev,
        personal: {
          ...prev.personal,
          first_name: emp.first_name || "",
          last_name: emp.last_name || "",
          personal_email: emp.email || "",
          date_of_birth: pickValue(form, ["date_of_birth"]),
          marital_status: pickValue(form, ["marital_status"]),
        },
        addresses: {
          ...prev.addresses,
          current_address: pickValue(form, ["current_address"]),
          permanent_address: pickValue(form, ["permanent_address"]),
          city: pickValue(form, ["current_city", "city"]),
          state: pickValue(form, ["state"]),
          postal_code: pickValue(form, ["postal_code"]),
          country: pickValue(form, ["country"]),
        },
        emergency_contact: {
          ...prev.emergency_contact,
          name: pickValue(form, ["emergency_contact_name"]),
          phone: pickValue(form, ["emergency_contact_phone"]),
        },
        education: {
          ...prev.education,
          highest_qualification: pickValue(form, ["education", "highest_qualification"]),
          institution: pickValue(form, ["institution"]),
          graduation_year: pickValue(form, ["graduation_year"]),
          specialization: pickValue(form, ["specialization"]),
        },
        previous_employment: {
          ...prev.previous_employment,
          employer_name: pickValue(form, ["prior_employer", "employer_name"]),
          designation: pickValue(form, ["previous_designation", "designation"]),
        },
        statutory: {
          ...prev.statutory,
          pan_number: pickValue(form, ["pan", "pan_number"]),
          aadhaar_last4: pickValue(form, ["aadhaar_last4", "aadhaar"]),
        },
        bank: {
          ...prev.bank,
          account_number: pickValue(form, ["bank_account_number", "account_number"]),
          ifsc: pickValue(form, ["ifsc_code", "ifsc"]),
          bank_name: pickValue(form, ["bank_name"]),
        },
        organization: {
          ...prev.organization,
          company: pickValue(form, ["company"]) || prev.organization.company,
          business_entity: pickValue(form, ["business_entity"]) || prev.organization.business_entity,
          branch: pickValue(form, ["branch"]) || prev.organization.branch,
          team: pickValue(form, ["team"]) || prev.organization.team,
          department: pickValue(form, ["department"]) || emp.department || prev.organization.department,
          designation: pickValue(form, ["designation"]) || offeredDesignation || prev.organization.designation,
        },
      }));
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to load employee" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  function updateSection<K extends keyof ActivationForm>(section: K, key: keyof ActivationForm[K], value: string) {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;

    if (viewMode === "edit") {
      if (!formData.personal.first_name || !formData.personal.last_name || !formData.personal.date_of_birth) {
        setNotice({ type: "error", text: "First name, last name, and date of birth are required." });
        return;
      }

      if (!formData.family.father_name || !formData.family.mother_name) {
        setNotice({ type: "error", text: "Father and mother names are required." });
        return;
      }

      if (!formData.organization.company || !formData.organization.business_entity || !formData.organization.branch || !formData.organization.team || !formData.organization.department || !formData.organization.designation) {
        setNotice({ type: "error", text: "All organization hierarchy fields are required." });
        return;
      }

      if (!formData.statutory.pan_number || !formData.statutory.aadhaar_last4 || !formData.bank.account_number || !formData.bank.ifsc) {
        setNotice({ type: "error", text: "PAN, Aadhaar last 4, bank account, and IFSC are required." });
        return;
      }

      setViewMode("review");
      setNotice(null);
      return;
    }

    setIsActivating(true);
    setNotice(null);

    try {
      const payload = {
        employee_id: employee.id,
        date_of_birth: formData.personal.date_of_birth,
        gender: formData.personal.gender,
        pan_number: formData.statutory.pan_number.toUpperCase(),
        aadhaar_number_masked: `XXXX-XXXX-${formData.statutory.aadhaar_last4}`,
        bank_account_number: formData.bank.account_number,
        bank_ifsc: formData.bank.ifsc.toUpperCase(),
        ctc_annual: Number(formData.compensation.ctc_annual || 0),
        company: formData.organization.company,
        business_entity: formData.organization.business_entity,
        branch: formData.organization.branch,
        team: formData.organization.team,
        department: formData.organization.department,
        designation: formData.organization.designation,
        current_title: formData.organization.designation,
        master_profile: {
          personal: formData.personal,
          family: {
            ...formData.family,
            dependents_count: Number(formData.family.dependents_count || 0),
          },
          addresses: formData.addresses,
          emergency_contact: formData.emergency_contact,
          education: formData.education,
          previous_employment: {
            ...formData.previous_employment,
            total_experience_years: Number(formData.previous_employment.total_experience_years || 0),
            last_drawn_ctc: Number(formData.previous_employment.last_drawn_ctc || 0),
          },
          statutory: {
            ...formData.statutory,
            aadhaar_last4: undefined,
          },
          bank: formData.bank,
          medical: formData.medical,
        },
      };

      const res = await fetch("/api/hr/activate-employee", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Activation failed");

      setNotice({ type: "success", text: `${employee.first_name || "Employee"} activated and handed off to payroll.` });
      setTimeout(() => navigate("/team/onboarding"), 1500);
    } catch (error: any) {
      setNotice({ type: "error", text: error.message || "Activation failed" });
    } finally {
      setIsActivating(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;

  return (
    <main className="hrms-enterprise min-h-screen px-4 py-6 md:px-8 md:py-8">
      <HRMSSidebarNav />
      <div className="hrms-main-with-nav">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Employee Activation</h1>
            <p className="text-slate-600">{employee?.first_name} {employee?.last_name}</p>
          </div>
        </div>

        {notice ? (
          <div className={`mb-4 rounded-xl border p-3 text-sm flex gap-2 items-start ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {notice.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
                  viewMode === "edit"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                📝 Edit Details
              </button>
              <button
                type="button"
                onClick={() => setViewMode("review")}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
                  viewMode === "review"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                ✓ Review & Approve
              </button>
            </div>
          </div>

          <form onSubmit={handleActivate} className="space-y-4 px-6 py-6">
            {viewMode === "edit" ? (
              <>
                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">Personal Information</h3>
                  <input value={formData.personal.first_name} onChange={(e) => updateSection("personal", "first_name", e.target.value)} placeholder="First name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.personal.middle_name} onChange={(e) => updateSection("personal", "middle_name", e.target.value)} placeholder="Middle name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.personal.last_name} onChange={(e) => updateSection("personal", "last_name", e.target.value)} placeholder="Last name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.personal.preferred_name} onChange={(e) => updateSection("personal", "preferred_name", e.target.value)} placeholder="Preferred name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="date" value={formData.personal.date_of_birth} onChange={(e) => updateSection("personal", "date_of_birth", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <select value={formData.personal.gender} onChange={(e) => updateSection("personal", "gender", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option>Male</option><option>Female</option><option>Other</option></select>
                  <input value={formData.personal.marital_status} onChange={(e) => updateSection("personal", "marital_status", e.target.value)} placeholder="Marital status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.personal.nationality} onChange={(e) => updateSection("personal", "nationality", e.target.value)} placeholder="Nationality" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.personal.blood_group} onChange={(e) => updateSection("personal", "blood_group", e.target.value)} placeholder="Blood group" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="email" value={formData.personal.personal_email} onChange={(e) => updateSection("personal", "personal_email", e.target.value)} placeholder="Personal email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                  <input value={formData.personal.personal_phone} onChange={(e) => updateSection("personal", "personal_phone", e.target.value)} placeholder="Personal phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </section>

                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">Family and Emergency</h3>
                  <input value={formData.family.father_name} onChange={(e) => updateSection("family", "father_name", e.target.value)} placeholder="Father name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.family.mother_name} onChange={(e) => updateSection("family", "mother_name", e.target.value)} placeholder="Mother name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.family.spouse_name} onChange={(e) => updateSection("family", "spouse_name", e.target.value)} placeholder="Spouse name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.family.dependents_count} onChange={(e) => updateSection("family", "dependents_count", e.target.value)} placeholder="Dependents count" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.emergency_contact.name} onChange={(e) => updateSection("emergency_contact", "name", e.target.value)} placeholder="Emergency contact name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.emergency_contact.relationship} onChange={(e) => updateSection("emergency_contact", "relationship", e.target.value)} placeholder="Relationship" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.emergency_contact.phone} onChange={(e) => updateSection("emergency_contact", "phone", e.target.value)} placeholder="Emergency phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.emergency_contact.alternate_phone} onChange={(e) => updateSection("emergency_contact", "alternate_phone", e.target.value)} placeholder="Alternate emergency phone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </section>

                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">Address and Education</h3>
                  <input value={formData.addresses.current_address} onChange={(e) => updateSection("addresses", "current_address", e.target.value)} placeholder="Current address" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" />
                  <input value={formData.addresses.permanent_address} onChange={(e) => updateSection("addresses", "permanent_address", e.target.value)} placeholder="Permanent address" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" />
                  <input value={formData.addresses.city} onChange={(e) => updateSection("addresses", "city", e.target.value)} placeholder="City" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.addresses.state} onChange={(e) => updateSection("addresses", "state", e.target.value)} placeholder="State" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.addresses.postal_code} onChange={(e) => updateSection("addresses", "postal_code", e.target.value)} placeholder="Postal code" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.addresses.country} onChange={(e) => updateSection("addresses", "country", e.target.value)} placeholder="Country" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.education.highest_qualification} onChange={(e) => updateSection("education", "highest_qualification", e.target.value)} placeholder="Highest qualification" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.education.institution} onChange={(e) => updateSection("education", "institution", e.target.value)} placeholder="Institution" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.education.graduation_year} onChange={(e) => updateSection("education", "graduation_year", e.target.value)} placeholder="Graduation year" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.education.specialization} onChange={(e) => updateSection("education", "specialization", e.target.value)} placeholder="Specialization" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" />
                </section>

                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">Previous Employment</h3>
                  <input value={formData.previous_employment.employer_name} onChange={(e) => updateSection("previous_employment", "employer_name", e.target.value)} placeholder="Previous employer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.previous_employment.designation} onChange={(e) => updateSection("previous_employment", "designation", e.target.value)} placeholder="Designation" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="date" value={formData.previous_employment.start_date} onChange={(e) => updateSection("previous_employment", "start_date", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input type="date" value={formData.previous_employment.end_date} onChange={(e) => updateSection("previous_employment", "end_date", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.previous_employment.total_experience_years} onChange={(e) => updateSection("previous_employment", "total_experience_years", e.target.value)} placeholder="Total experience years" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.previous_employment.last_drawn_ctc} onChange={(e) => updateSection("previous_employment", "last_drawn_ctc", e.target.value)} placeholder="Last drawn CTC" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.previous_employment.reason_for_leaving} onChange={(e) => updateSection("previous_employment", "reason_for_leaving", e.target.value)} placeholder="Reason for leaving" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" />
                </section>

                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">🏢 Organization Assignment</h3>
                  <select value={formData.organization.company} onChange={(e) => updateSection("organization", "company", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Company</option>
                    <option value="LeadFlow AI">LeadFlow AI</option>
                  </select>
                  <select value={formData.organization.business_entity} onChange={(e) => updateSection("organization", "business_entity", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Business Entity</option>
                    <option value="LeadFlow India Pvt Ltd">LeadFlow India Pvt Ltd</option>
                  </select>
                  <select value={formData.organization.branch} onChange={(e) => updateSection("organization", "branch", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Branch</option>
                    <option value="HQ Branch">HQ Branch</option>
                    <option value="Bangalore Branch">Bangalore Branch</option>
                    <option value="Delhi Branch">Delhi Branch</option>
                  </select>
                  <select value={formData.organization.team} onChange={(e) => updateSection("organization", "team", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Team</option>
                    <option value="Frontend Team">Frontend Team</option>
                    <option value="Backend Team">Backend Team</option>
                    <option value="DevOps Team">DevOps Team</option>
                    <option value="QA Team">QA Team</option>
                  </select>
                  <select value={formData.organization.department} onChange={(e) => updateSection("organization", "department", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                  </select>
                  <input value={formData.organization.designation} onChange={(e) => updateSection("organization", "designation", e.target.value)} placeholder="Designation" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                </section>

                <section className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <h3 className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-sm font-semibold text-slate-800 mb-2">Statutory, Bank, Medical, Compensation</h3>
                  <input value={formData.statutory.pan_number} onChange={(e) => updateSection("statutory", "pan_number", e.target.value.toUpperCase())} placeholder="PAN number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.statutory.aadhaar_last4} onChange={(e) => updateSection("statutory", "aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Aadhaar last 4" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.statutory.uan_number} onChange={(e) => updateSection("statutory", "uan_number", e.target.value)} placeholder="UAN" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.statutory.esic_number} onChange={(e) => updateSection("statutory", "esic_number", e.target.value)} placeholder="ESIC" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.statutory.passport_number} onChange={(e) => updateSection("statutory", "passport_number", e.target.value)} placeholder="Passport" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.statutory.driving_license_number} onChange={(e) => updateSection("statutory", "driving_license_number", e.target.value)} placeholder="Driving license" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.statutory.voter_id} onChange={(e) => updateSection("statutory", "voter_id", e.target.value)} placeholder="Voter ID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.bank.account_number} onChange={(e) => updateSection("bank", "account_number", e.target.value)} placeholder="Bank account number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.bank.ifsc} onChange={(e) => updateSection("bank", "ifsc", e.target.value.toUpperCase())} placeholder="IFSC" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.bank.bank_name} onChange={(e) => updateSection("bank", "bank_name", e.target.value)} placeholder="Bank name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.bank.account_holder_name} onChange={(e) => updateSection("bank", "account_holder_name", e.target.value)} placeholder="Account holder name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.compensation.ctc_annual} onChange={(e) => updateSection("compensation", "ctc_annual", e.target.value)} placeholder="Annual CTC" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  <input value={formData.medical.known_conditions} onChange={(e) => updateSection("medical", "known_conditions", e.target.value)} placeholder="Known conditions" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                  <input value={formData.medical.allergies} onChange={(e) => updateSection("medical", "allergies", e.target.value)} placeholder="Allergies" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={formData.medical.disability_details} onChange={(e) => updateSection("medical", "disability_details", e.target.value)} placeholder="Disability details" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" />
                </section>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-900 mb-4">📋 Please verify all details below before final approval</h3>
                  <div className="space-y-4 text-sm">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Name</p>
                        <p className="font-semibold text-slate-900">{formData.personal.first_name} {formData.personal.middle_name} {formData.personal.last_name}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Date of Birth</p>
                        <p className="font-semibold text-slate-900">{formatDate(formData.personal.date_of_birth)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Email</p>
                        <p className="font-semibold text-slate-900 text-xs">{formData.personal.personal_email}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Gender</p>
                        <p className="font-semibold text-slate-900">{formData.personal.gender}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-3 font-semibold">🏢 Organization Assignment</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-slate-600">Company:</span> <span className="font-semibold block">{formData.organization.company}</span></div>
                        <div><span className="text-slate-600">Business Entity:</span> <span className="font-semibold block text-xs">{formData.organization.business_entity}</span></div>
                        <div><span className="text-slate-600">Branch:</span> <span className="font-semibold block">{formData.organization.branch}</span></div>
                        <div><span className="text-slate-600">Team:</span> <span className="font-semibold block">{formData.organization.team}</span></div>
                        <div><span className="text-slate-600">Department:</span> <span className="font-semibold block">{formData.organization.department}</span></div>
                        <div><span className="text-slate-600">Designation:</span> <span className="font-semibold block">{formData.organization.designation}</span></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-slate-600">PAN:</span> <span className="font-semibold block">{formData.statutory.pan_number}</span></div>
                        <div><span className="text-slate-600">Aadhaar:</span> <span className="font-semibold block">XXXX-XXXX-{formData.statutory.aadhaar_last4}</span></div>
                        <div><span className="text-slate-600">UAN:</span> <span className="font-semibold block">{formData.statutory.uan_number || "-"}</span></div>
                        <div><span className="text-slate-600">ESIC:</span> <span className="font-semibold block">{formData.statutory.esic_number || "-"}</span></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-3 font-semibold">🏦 Bank Details</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-slate-600">Bank:</span> <span className="font-semibold block">{formData.bank.bank_name}</span></div>
                        <div><span className="text-slate-600">Account Holder:</span> <span className="font-semibold block text-xs">{formData.bank.account_holder_name}</span></div>
                        <div className="sm:col-span-2 lg:col-span-2"><span className="text-slate-600">Account:</span> <span className="font-semibold block">{formData.bank.account_number}</span></div>
                        <div className="sm:col-span-2 lg:col-span-2"><span className="text-slate-600">IFSC:</span> <span className="font-semibold block">{formData.bank.ifsc}</span></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-2 font-semibold">💰 Compensation</p>
                      <div className="text-sm"><span className="text-slate-600">Annual CTC:</span> <span className="font-semibold">₹{Number(formData.compensation.ctc_annual || 0).toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white -mx-6 px-6 py-3 mt-6">
              <button type="button" onClick={() => window.history.back()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
              {viewMode === "edit" ? (
                <button type="submit" disabled={isActivating} className="hrms-btn hrms-btn-primary px-6 py-2 text-sm disabled:opacity-50">
                  {isActivating ? "Loading..." : "Proceed to Review"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setViewMode("edit")} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit Details</button>
                  <button type="submit" disabled={isActivating} className="hrms-btn hrms-btn-primary px-6 py-2 text-sm disabled:opacity-50">
                    {isActivating ? "Activating..." : "✓ Approve & Activate"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
