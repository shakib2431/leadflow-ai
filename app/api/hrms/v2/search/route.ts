import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchQuery = request.nextUrl.searchParams.get("q") || "";

    if (searchQuery.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const query = `%${searchQuery}%`;

    // Search employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, email, designation")
      .or(`first_name.ilike.${query},last_name.ilike.${query},email.ilike.${query}`)
      .limit(5);

    const results = [];

    if (!empError && employees) {
      results.push(
        ...employees.map((emp) => ({
          id: emp.id,
          type: "employee",
          name: `${emp.first_name} ${emp.last_name}`,
          subtitle: emp.designation || emp.email,
        }))
      );
    }

    // Search for leave requests
    const { data: leaveReqs, error: leaveError } = await supabaseAdmin
      .from("leave_requests")
      .select("id, employee_id, leave_type, status, employees(first_name, last_name)")
      .or(`status.eq.pending,status.eq.approved,status.eq.rejected`)
      .limit(3);

    if (!leaveError && leaveReqs) {
      results.push(
        ...leaveReqs.map((req) => ({
          id: req.id,
          type: "request",
          name: `${req.leave_type} Request - ${req.status}`,
          subtitle: req.employees
            ? `${req.employees.first_name} ${req.employees.last_name}`
            : "Leave Request",
        }))
      );
    }

    return NextResponse.json({ results: results.slice(0, 8) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
