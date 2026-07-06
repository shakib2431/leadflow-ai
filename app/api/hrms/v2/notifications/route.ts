import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export async function GET(request: NextRequest) {
  try {
    const notifications: any[] = [];

    // Fetch pending leave requests
    const { data: leaveRequests } = await supabaseAdmin
      .from("leave_requests")
      .select("id, employee_id, leave_type, start_date, end_date, status, created_at, employees(first_name, last_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (leaveRequests) {
      leaveRequests.forEach((req) => {
        notifications.push({
          id: `leave_${req.id}`,
          type: "leave",
          title: `Leave Request - ${req.leave_type}`,
          message: `${req.employees?.first_name} ${req.employees?.last_name} requested ${req.leave_type} leave from ${req.start_date} to ${req.end_date}`,
          time: formatTimeAgo(req.created_at || new Date()),
          link: `/hrms/v2/admin-dashboard`,
        });
      });
    }

    // Fetch pending approvals (onboarding, exits, etc.)
    const { data: onboardingRequests } = await supabaseAdmin
      .from("onboarding")
      .select("id, employee_id, status, created_at, employees(first_name, last_name)")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false })
      .limit(5);

    if (onboardingRequests) {
      onboardingRequests.forEach((req) => {
        notifications.push({
          id: `onboarding_${req.id}`,
          type: "approval",
          title: "Pending Onboarding Approval",
          message: `Onboarding approval pending for ${req.employees?.first_name} ${req.employees?.last_name}`,
          time: formatTimeAgo(req.created_at || new Date()),
          link: `/hrms/v2/admin-dashboard`,
        });
      });
    }

    // Fetch recent attendance issues
    const { data: attendanceIssues } = await supabaseAdmin
      .from("attendance")
      .select("id, employee_id, status, created_at, employees(first_name, last_name)")
      .eq("status", "marked_absent")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: false })
      .limit(3);

    if (attendanceIssues) {
      attendanceIssues.forEach((issue) => {
        notifications.push({
          id: `attendance_${issue.id}`,
          type: "info",
          title: "Attendance Alert",
          message: `${issue.employees?.first_name} ${issue.employees?.last_name} marked absent`,
          time: formatTimeAgo(issue.created_at || new Date()),
          link: `/hrms/v2/attendance`,
        });
      });
    }

    // If no notifications from database, add a welcome message
    if (notifications.length === 0) {
      notifications.push({
        id: "welcome",
        type: "info",
        title: "Welcome to HRMS",
        message: "Your notifications will appear here when there are pending items",
        time: "just now",
        link: null,
      });
    }

    return NextResponse.json({
      notifications: notifications.slice(0, 10),
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({
      notifications: [
        {
          id: "welcome",
          type: "info",
          title: "Welcome to HRMS",
          message: "Your notifications will appear here",
          time: "just now",
          link: null,
        },
      ],
    });
  }
}
