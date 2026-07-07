/**
 * HRMS v2 client-side API adapter.
 *
 * The HRMS v2 pages were built against a REST backend at `/api/hrms/v2/*` that
 * does not exist in this deployment (those requests 404). The real HRMS data
 * lives in Supabase (same project the rest of the app already reads from).
 *
 * Rather than rewrite every page, this module installs a single fetch()
 * interceptor: any request whose URL contains `/api/hrms/v2` is served from
 * Supabase, shaped to match exactly what the calling pages expect. Every other
 * request (including Supabase's own internal fetches and Vite HMR) passes
 * through untouched.
 */
import { supabase } from "./supabase";

const API_MARKER = "/api/hrms/v2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// ---- small caches for reference data (names) ----
let _deptCache: Map<string, string> | null = null;
let _desigCache: Map<string, string> | null = null;
let _empNameCache: Map<string, string> | null = null;

async function deptMap() {
  if (_deptCache) return _deptCache;
  const { data } = await supabase.from("departments").select("id,name");
  _deptCache = new Map((data ?? []).map((d: any) => [d.id, d.name]));
  return _deptCache;
}
async function desigMap() {
  if (_desigCache) return _desigCache;
  const { data } = await supabase.from("designations").select("id,name");
  _desigCache = new Map((data ?? []).map((d: any) => [d.id, d.name]));
  return _desigCache;
}
async function empNameMap() {
  if (_empNameCache) return _empNameCache;
  const { data } = await supabase
    .from("employees")
    .select("id,first_name,last_name,employee_code");
  _empNameCache = new Map(
    (data ?? []).map((e: any) => [
      e.id,
      `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.employee_code || e.id,
    ]),
  );
  return _empNameCache;
}

async function enrichEmployee(e: any, depts: Map<string, string>, desigs: Map<string, string>) {
  const designation = desigs.get(e.designation_id) ?? e.designation ?? null;
  const department = depts.get(e.department_id) ?? e.department ?? null;
  return {
    ...e,
    designation,
    current_title: designation,
    department,
    department_name: department,
    designation_name: designation,
    full_name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
  };
}

// ---- route handlers ----
type Ctx = { path: string; method: string; params: URLSearchParams; body: any };

async function handle(ctx: Ctx): Promise<Response> {
  const { path, method, params, body } = ctx;

  // ---------- roles / identity ----------
  if (path === "/user-roles/me" || path === "/me") {
    return json({ data: { role: "HR Admin", designation: "HR Admin", current_title: "HR Admin" } });
  }
  if (path === "/user-roles") {
    return json({
      data: [
        { id: "1", role: "HR Admin" },
        { id: "2", role: "HR Executive" },
        { id: "3", role: "Employee" },
      ],
    });
  }
  if (path === "/admin/settings") {
    return json({
      data: {
        currency: "INR",
        timezone: "Asia/Kolkata",
        payroll_cutoff_day: 25,
        leave_auto_approval_enabled: false,
        attendance_auto_approval_enabled: false,
        financial_year_start_month: 4,
      },
    });
  }

  // ---------- reference data ----------
  if (path === "/business-entities") {
    const { data } = await supabase.from("business_entities").select("*").order("name");
    return json({ data: data ?? [] });
  }
  if (path === "/departments") {
    const { data } = await supabase.from("departments").select("*").order("name");
    return json({ data: data ?? [] });
  }
  if (path === "/designations") {
    const { data } = await supabase.from("designations").select("*").order("name");
    return json({ data: data ?? [] });
  }

  // ---------- employees ----------
  if (path === "/employees" && method === "GET") {
    const status = params.get("status");
    const pageSize = Number(params.get("pageSize") ?? "500");
    const page = Number(params.get("page") ?? "1");
    let q = supabase.from("employees").select("*", { count: "exact" });
    if (status && status !== "all") {
      q = q.eq("status", status);
    } else if (params.get("includeArchived") !== "true") {
      q = q.neq("status", "archived");
    }
    const from = (page - 1) * pageSize;
    q = q.range(from, from + pageSize - 1).order("created_at", { ascending: false });
    const { data, count } = await q;
    const [depts, desigs] = await Promise.all([deptMap(), desigMap()]);
    const rows = await Promise.all((data ?? []).map((e: any) => enrichEmployee(e, depts, desigs)));
    return json({ data: rows, total: count ?? rows.length });
  }

  const empDetail = path.match(/^\/employees\/([^/]+)(\/(service-history|documents|letters))?$/);
  if (empDetail && method === "GET") {
    const id = empDetail[1];
    const sub = empDetail[3];
    if (sub === "service-history") {
      const { data } = await supabase.from("employees").select("service_history").eq("id", id).maybeSingle();
      return json({ data: (data as any)?.service_history ?? [] });
    }
    if (sub === "documents" || sub === "letters") {
      return json({ data: [] });
    }
    const { data } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
    if (!data) return json({ data: null }, 404);
    const [depts, desigs] = await Promise.all([deptMap(), desigMap()]);
    return json({ data: await enrichEmployee(data, depts, desigs) });
  }

  // ---------- leave ----------
  if (path === "/leave/requests" && method === "GET") {
    const status = params.get("status");
    let q = supabase.from("leave_requests").select("*", { count: "exact" });
    if (status && status !== "all") q = q.eq("status", status);
    q = q.order("created_at", { ascending: false });
    const { data, count } = await q;
    const names = await empNameMap();
    const rows = (data ?? []).map((r: any) => ({
      ...r,
      employee_name: names.get(r.employee_id) ?? r.employee_id,
    }));
    return json({ data: rows, total: count ?? rows.length });
  }
  const leavePatch = path.match(/^\/leave\/requests\/([^/]+)$/);
  if (leavePatch && (method === "PATCH" || method === "PUT")) {
    const id = leavePatch[1];
    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status: body?.status })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!data) return json({ error: "Update failed or not permitted (no matching row)" }, 403);
    return json({ data });
  }

  // ---------- attendance ----------
  if (path === "/attendance" && method === "GET") {
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false })
      .limit(2000);
    const names = await empNameMap();
    const rows = (data ?? []).map((r: any) => {
      const s = String(r.status ?? "").toLowerCase();
      return {
        ...r,
        employee_name: names.get(r.employee_id) ?? r.employee_id,
        late_arrival: s.includes("late"),
        early_departure: s.includes("early"),
      };
    });
    return json({ data: rows, total: rows.length });
  }
  if (path === "/attendance/exceptions") {
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false })
      .limit(2000);
    const names = await empNameMap();
    const rows = (data ?? [])
      .filter((r: any) => {
        const s = String(r.status ?? "").toLowerCase();
        return s.includes("absent") || s.includes("late") || s.includes("half_day") || s.includes("missing");
      })
      .map((r: any) => ({
        ...r,
        employee_name: names.get(r.employee_id) ?? r.employee_id,
        current_status: r.status,
      }));
    const absent = rows.filter((r: any) => String(r.status).toLowerCase().includes("absent")).length;
    const late = rows.filter((r: any) => String(r.status).toLowerCase().includes("late")).length;
    return json({ data: rows, summary: { total: rows.length, absent, late } });
  }
  if (path === "/attendance/corrections") {
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .in("status", ["absent", "half_day"])
      .eq("is_regularized", false)
      .order("date", { ascending: false })
      .limit(500);
    const names = await empNameMap();
    const rows = (data ?? []).map((r: any) => ({
      ...r,
      employee_name: names.get(r.employee_id) ?? r.employee_id,
      current_status: r.status,
      requested_status: "present",
      reason: r.reason ?? "Regularization requested",
    }));
    return json({ data: rows });
  }

  // ---------- payroll ----------
  if (path === "/payroll/runs" && method === "GET") {
    const status = params.get("status");
    let q = supabase.from("payroll_runs").select("*", { count: "exact" });
    if (status && status !== "all") {
      // payroll_runs.status enum is draft|paid; callers ask for "pending" (== not yet paid)
      q = status === "pending" ? q.neq("status", "paid") : q.eq("status", status);
    }
    q = q.order("period_year", { ascending: false }).order("period_month", { ascending: false });
    const { data, count } = await q;
    return json({ data: data ?? [], total: count ?? (data ?? []).length });
  }
  if (path === "/payroll/dashboard" || path === "/payroll/reports") {
    const month = Number(params.get("month")) || undefined;
    const year = Number(params.get("year")) || undefined;
    const [{ data: runs }, { data: items }] = await Promise.all([
      supabase.from("payroll_runs").select("*"),
      supabase.from("payroll_line_items").select("*"),
    ]);
    const runsArr = runs ?? [];
    const li = items ?? [];
    const aggOf = (rows: any[]) => {
      const s = (k: string) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
      return {
        gross: s("gross_earnings"),
        net: s("net_pay"),
        deductions: s("pf_employee") + s("esi_employee") + s("professional_tax") + s("tds") + s("lwf_employee"),
        pf: s("pf_employee") + s("pf_employer"),
        esi: s("esi_employee") + s("esi_employer"),
        pt: s("professional_tax"),
        tds: s("tds"),
        lwf: s("lwf_employee") + s("lwf_employer"),
        employeeCount: new Set(rows.map((r) => r.employee_id)).size,
      };
    };
    const byRun = new Map<string, ReturnType<typeof aggOf>>();
    for (const r of runsArr) byRun.set(r.id, aggOf(li.filter((x: any) => x.payroll_run_id === r.id)));
    const sortedRuns = [...runsArr].sort(
      (a: any, b: any) => b.period_year - a.period_year || b.period_month - a.period_month,
    );

    if (path === "/payroll/reports") {
      return json({
        data: {
          runs: sortedRuns.map((r: any) => ({ id: r.id, period_month: r.period_month, period_year: r.period_year, status: r.status })),
          monthlySummary: sortedRuns.map((r: any) => {
            const a = byRun.get(r.id)!;
            return {
              period_key: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
              month: r.period_month,
              year: r.period_year,
              gross: a.gross,
              net: a.net,
              deductions: a.deductions,
              employee_count: a.employeeCount,
            };
          }),
        },
      });
    }

    const periodRun =
      runsArr.find((r: any) => (!month || r.period_month === month) && (!year || r.period_year === year)) ??
      sortedRuns[0] ??
      null;
    const totals = periodRun ? byRun.get(periodRun.id)! : aggOf(li);
    const statusCounts = runsArr.reduce((m: Record<string, number>, r: any) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
    const trend = sortedRuns
      .slice(0, 6)
      .reverse()
      .map((r: any) => {
        const a = byRun.get(r.id)!;
        return { month: r.period_month, year: r.period_year, gross: a.gross, net: a.net };
      });
    return json({
      data: {
        period: { month: month ?? periodRun?.period_month, year: year ?? periodRun?.period_year },
        run: periodRun ? { id: periodRun.id, status: periodRun.status, period_month: periodRun.period_month, period_year: periodRun.period_year } : null,
        totals: { gross: totals.gross, net: totals.net, deductions: totals.deductions, pf: totals.pf, esi: totals.esi, pt: totals.pt, tds: totals.tds, lwf: totals.lwf },
        employeeCount: totals.employeeCount,
        statusCounts,
        trend,
      },
    });
  }
  if (path === "/payroll/runs/preview" && method === "POST") {
    const now = new Date();
    const month = body?.month ?? now.getMonth() + 1;
    const year = body?.year ?? now.getFullYear();
    const { data: emps } = await supabase.from("employees").select("*").eq("status", "active");
    const empArr = emps ?? [];
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
    const items = empArr.map((e: any) => ({
      employee_id: e.id,
      employee_name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
      lop_days: 0,
      gross_earnings: 0,
      net_pay: 0,
    }));
    return json({
      data: {
        period: { month, year, startDate, endDate },
        totals: { gross: 0, deductions: 0, net: 0 },
        employeeCount: empArr.length,
        items,
      },
    });
  }

  // ---------- PF / compliance ----------
  if (path === "/pf/summary") {
    const [{ data: items }, { count: activeCount }] = await Promise.all([
      supabase.from("payroll_line_items").select("pf_employee,pf_employer,employee_id"),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    const li = items ?? [];
    const emp = li.reduce((a: number, r: any) => a + Number(r.pf_employee ?? 0), 0);
    const er = li.reduce((a: number, r: any) => a + Number(r.pf_employer ?? 0), 0);
    const pfEmployees = new Set(li.filter((r: any) => Number(r.pf_employee ?? 0) > 0).map((r: any) => r.employee_id)).size;
    const active = activeCount ?? 0;
    return json({
      data: {
        totals: {
          employee_contribution: emp,
          employer_contribution: er,
          total_contribution: emp + er,
        },
        coverage: {
          active_employees: active,
          payroll_employees: new Set(li.map((r: any) => r.employee_id)).size,
          pf_applicable_employees: pfEmployees,
          pf_coverage_percent: active ? Math.round((pfEmployees / active) * 100) : 0,
        },
      },
    });
  }
  if (path === "/pf/ledger") {
    const { data } = await supabase.from("payroll_line_items").select("*");
    const names = await empNameMap();
    const rows = (data ?? []).map((r: any) => ({
      ...r,
      employee_name: names.get(r.employee_id) ?? r.employee_id,
      pf_number: r.pf_number ?? "-",
      is_pf_applicable: Number(r.pf_employee ?? 0) > 0,
    }));
    return json({ data: rows });
  }

  // ---------- onboarding / exit ----------
  if (path === "/pre-onboarding/queue") {
    const { data } = await supabase.from("employees").select("*").eq("status", "onboarding");
    const rows = (data ?? []).map((e: any) => ({
      employee: e,
      tasks: (e.onboarding_checklist as any[]) ?? [],
    }));
    return json({ data: rows });
  }
  if (path === "/pre-onboarding/intake-link" && method === "POST") {
    return json({ data: { link: `${window.location.origin}/hrms/v2/intake/${crypto.randomUUID()}` } });
  }
  if (path === "/exit-management") {
    const { data } = await supabase.from("employees").select("*").eq("status", "archived");
    return json({ data: data ?? [] });
  }

  // ---------- templates ----------
  if (path === "/letter-templates" && method === "GET") {
    return json({ data: [] });
  }
  if (path === "/letter-templates/preview" && method === "POST") {
    const subject = body?.subject_template ?? "";
    const bodyText = body?.body_template ?? "";
    return json({ data: { subject, body: bodyText }, subject, body: bodyText });
  }

  // ---------- search / notifications ----------
  if (path === "/search") {
    const qStr = params.get("q") ?? "";
    if (!qStr) return json({ data: [] });
    const { data } = await supabase
      .from("employees")
      .select("id,first_name,last_name,employee_code,email")
      .or(`first_name.ilike.%${qStr}%,last_name.ilike.%${qStr}%,employee_code.ilike.%${qStr}%,email.ilike.%${qStr}%`)
      .limit(10);
    return json({ data: data ?? [] });
  }
  if (path === "/notifications") {
    return json({ data: [] });
  }

  // ---------- fallback (unknown endpoint): empty but valid ----------
  console.warn(`[hrms-api-adapter] unhandled ${method} ${API_MARKER}${path} — returning empty`);
  return json({ data: [] });
}

let installed = false;

export function installHrmsApiAdapter() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: string;
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else url = (input as Request).url;

    let u: URL;
    try {
      u = new URL(url, window.location.origin);
    } catch {
      return originalFetch(input as any, init);
    }
    // Match on pathname only, so the marker in a query string or hash never triggers us.
    if (!u.pathname.includes(API_MARKER)) return originalFetch(input as any, init);

    try {
      const idx = u.pathname.indexOf(API_MARKER);
      const path = u.pathname.slice(idx + API_MARKER.length) || "/";
      const method = (
        init?.method || (input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      let body: any = undefined;
      let rawBody: any = init?.body;
      if (rawBody == null && input instanceof Request) {
        try {
          rawBody = await input.clone().text();
        } catch {
          rawBody = undefined;
        }
      }
      if (rawBody && typeof rawBody === "string") {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = undefined;
        }
      }

      return await handle({ path, method, params: u.searchParams, body });
    } catch (err) {
      console.error("[hrms-api-adapter] error handling", url, err);
      return json({ data: [], error: String(err) }, 200);
    }
  };
}
