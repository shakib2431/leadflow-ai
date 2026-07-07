

import { Link } from "wouter";
import { useLocation } from "wouter";
import {
  BarChart3,
  Briefcase,
  Building,
  CheckSquare,
  Clock3,
  FileText,
  DollarSign,
  Gauge,
  Menu,
  Settings,
  UserCircle2,
  Users,
  X,
  AlertCircle,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useHRMSRole } from "@/components/hrms/use-hrms-role";

type NavItem = {
  key: string;
  section: "dashboard" | "workforce" | "employee" | "administration" | "exit";
  label: string;
  href: string;
  match: string[];
  exact?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", section: "dashboard", label: "Dashboard", href: "/hrms/v2/admin-dashboard", match: ["/hrms/v2", "/hrms/v2/admin-dashboard"], exact: true, icon: Gauge },

  { key: "employees", section: "workforce", label: "Employees", href: "/team/employees", match: ["/team/employees"] as string[], icon: Users },
  { key: "recruitment", section: "workforce", label: "Recruitment", href: "/team/recruitment", match: ["/team/recruitment"], icon: Briefcase },
  { key: "offer-management", section: "workforce", label: "Offer Management", href: "/team/offer-management", match: ["/team/offer-management"], icon: FileText },
  { key: "pre-onboarding", section: "workforce", label: "Pre-Onboarding", href: "/team/pre-onboarding", match: ["/team/pre-onboarding"], icon: CheckSquare },
  { key: "onboarding", section: "workforce", label: "Onboarding", href: "/team/onboarding", match: ["/team/onboarding"], icon: CheckSquare },
  { key: "attendance", section: "workforce", label: "Attendance", href: "/team/attendance", match: ["/team/attendance"], icon: Clock3 },
  { key: "attendance-exceptions", section: "workforce", label: "Exceptions & Corrections", href: "/team/attendance-exceptions", match: ["/team/attendance-exceptions"], icon: AlertCircle },
  { key: "leave", section: "workforce", label: "Leave", href: "/team/leave", match: ["/team/leave"], icon: Clock3 },
  { key: "payroll", section: "workforce", label: "Payroll", href: "/team/payroll", match: ["/team/payroll"], icon: DollarSign },
  { key: "reports", section: "workforce", label: "Reports", href: "/hrms/v2/reports", match: ["/hrms/v2/reports"], icon: BarChart3 },

  { key: "self-service", section: "employee", label: "Employee Self-Service", href: "/hrms/v2/self-service", match: ["/hrms/v2/self-service"], icon: UserCircle2 },

  { key: "organization", section: "administration", label: "Organization Setup", href: "/hrms/v2/organization", match: ["/hrms/v2/organization", "/hrms/v2/admin"], icon: Building },
  { key: "settings", section: "administration", label: "Settings", href: "/hrms/v2/settings", match: ["/hrms/v2/settings"], icon: Settings },
  { key: "roles", section: "administration", label: "Roles & Permissions", href: "/hrms/v2/roles", match: ["/hrms/v2/roles"], icon: UserCircle2 },
  { key: "templates", section: "administration", label: "Letter Templates", href: "/hrms/v2/templates", match: ["/hrms/v2/templates"], icon: FileText },
  { key: "audit", section: "administration", label: "Audit", href: "/hrms/v2/audit", match: ["/hrms/v2/audit"], icon: BarChart3 },

  { key: "separation", section: "exit", label: "Exit Management", href: "/team/exit", match: ["/team/exit"], icon: LogOut },
];

export default function HRMSSidebarNav() {
  const [pathname] = useLocation();
  const [, navigate] = useLocation();
  const { role, loading, serverResolved } = useHRMSRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ workforce: true, employee: true, administration: true, exit: true });
  const isEmployee = role === "Employee";
  const isPrivileged = role === "HR Admin" || role === "HR Executive";
  const adminContextRoute =
    pathname.startsWith("/team/") ||
    pathname.startsWith("/hrms/v2/admin-dashboard") ||
    pathname.startsWith("/hrms/v2/reports") ||
    pathname.startsWith("/hrms/v2/organization") ||
    pathname.startsWith("/hrms/v2/templates") ||
    pathname.startsWith("/hrms/v2/audit") ||
    pathname.startsWith("/hrms/v2/settings") ||
    pathname.startsWith("/hrms/v2/roles") ||
    pathname.startsWith("/hrms/v2/admin");
  const fallbackPrivileged = !loading && role === null && adminContextRoute;
  const effectivePrivileged = isPrivileged || fallbackPrivileged;
  const showRoleSections = !loading;
  const canViewAdminSections = !loading && effectivePrivileged;

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("hrms-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("hrms-sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const dashboardItem = !showRoleSections
    ? []
    : (isEmployee
    ? [
        {
          key: "my-dashboard",
          section: "dashboard",
          label: "My Dashboard",
          href: "/hrms/v2/self-service",
          match: ["/hrms/v2", "/hrms/v2/self-service"],
          icon: Gauge,
        } as NavItem,
      ]
    : NAV_ITEMS.filter((item) => item.section === "dashboard"));
  const workforceItems = canViewAdminSections ? NAV_ITEMS.filter((item) => item.section === "workforce") : [];
  const employeeItems = showRoleSections ? NAV_ITEMS.filter((item) => item.section === "employee") : [];
  const adminItems = canViewAdminSections ? NAV_ITEMS.filter((item) => item.section === "administration") : [];
  const exitItems = canViewAdminSections ? NAV_ITEMS.filter((item) => item.section === "exit") : [];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!serverResolved) return;
    if (!isEmployee) return;

    const employeeAllowed = [
      "/hrms/v2/self-service",
      "/hrms/v2/setup",
    ];

    const isAllowed = employeeAllowed.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (!isAllowed) {
      // Delay redirect slightly so stale cached roles can be corrected by role revalidation.
      const timer = window.setTimeout(() => {
        navigate("/hrms/v2/self-service");
      }, 3000);
      return () => window.clearTimeout(timer);
    }
  }, [isEmployee, loading, pathname, serverResolved]);

  function isActive(item: NavItem) {
    return item.match.some((prefix) => {
      if (item.exact) return pathname === prefix;
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });
  }

  useEffect(() => {
    if (workforceItems.some(isActive)) setOpenSections((prev) => ({ ...prev, workforce: true }));
    if (employeeItems.some(isActive)) setOpenSections((prev) => ({ ...prev, employee: true }));
    if (adminItems.some(isActive)) setOpenSections((prev) => ({ ...prev, administration: true }));
    if (exitItems.some(isActive)) setOpenSections((prev) => ({ ...prev, exit: true }));
  }, [pathname]);

  function renderItem(item: NavItem) {
    const active = isActive(item);
    const Icon = item.icon;

    if (collapsed) {
      return (
        <Link
          key={item.key}
          href={item.href}
          className={`hrms-nav-link-icon ${active ? "hrms-nav-link-icon-active" : ""}`}
          title={item.label}
        >
          <Icon size={20} className="hrms-nav-icon" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href}
        className={`hrms-nav-link ${active ? "hrms-nav-link-active" : ""}`}
      >
        <Icon size={18} className="hrms-nav-icon" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed md:hidden top-4 left-4 z-40 p-2 rounded-lg hover:bg-slate-200/60 text-slate-700"
        aria-label="Open HRMS menu"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="hrms-nav-mobile-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`hrms-nav-shell ${collapsed ? "hrms-nav-shell-collapsed" : ""} ${mobileOpen ? "hrms-nav-mobile-open" : ""}`}>
        {/* Sidebar Header with Collapse Button */}
        <div className="hrms-nav-header">
          {!collapsed && (
            <div className="hrms-nav-logo">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                L
              </div>
              <span className="text-sm font-semibold text-slate-900">LeadFlow</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hrms-nav-collapse-btn ${collapsed ? "hrms-nav-collapse-btn-rotated" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            <ChevronDown size={18} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200/60 md:hidden"
            aria-label="Close HRMS menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="hrms-nav-content">
          {/* Dashboard */}
          <div className="hrms-nav-section">{dashboardItem.map(renderItem)}</div>

          {/* Workforce Section */}
          {canViewAdminSections && workforceItems.length > 0 && (
            <div className="hrms-nav-section">
              {!collapsed && (
                <button
                  type="button"
                  className="hrms-nav-section-title"
                  onClick={() => setOpenSections((prev) => ({ ...prev, workforce: !prev.workforce }))}
                  aria-expanded={openSections.workforce}
                >
                  <span>Workforce</span>
                  <ChevronDown size={14} className={`transition-transform ${openSections.workforce ? "rotate-180" : ""}`} />
                </button>
              )}
              {(collapsed || openSections.workforce) && (
                <div className="hrms-nav-group">{workforceItems.map(renderItem)}</div>
              )}
            </div>
          )}

          {/* Employee Section */}
          {employeeItems.length > 0 && (
            <div className="hrms-nav-section">
              {!collapsed && (
                <button
                  type="button"
                  className="hrms-nav-section-title"
                  onClick={() => setOpenSections((prev) => ({ ...prev, employee: !prev.employee }))}
                  aria-expanded={openSections.employee}
                >
                  <span>Employee</span>
                  <ChevronDown size={14} className={`transition-transform ${openSections.employee ? "rotate-180" : ""}`} />
                </button>
              )}
              {(collapsed || openSections.employee) && (
                <div className="hrms-nav-group">{employeeItems.map(renderItem)}</div>
              )}
            </div>
          )}

          {/* Administration Section */}
          {canViewAdminSections && adminItems.length > 0 && (
            <div className="hrms-nav-section">
              {!collapsed && (
                <button
                  type="button"
                  className="hrms-nav-section-title"
                  onClick={() => setOpenSections((prev) => ({ ...prev, administration: !prev.administration }))}
                  aria-expanded={openSections.administration}
                >
                  <span>Administration</span>
                  <ChevronDown size={14} className={`transition-transform ${openSections.administration ? "rotate-180" : ""}`} />
                </button>
              )}
              {(collapsed || openSections.administration) && (
                <div className="hrms-nav-group">{adminItems.map(renderItem)}</div>
              )}
            </div>
          )}

          {/* Exit Management Section */}
          {canViewAdminSections && exitItems.length > 0 && (
            <div className="hrms-nav-section">
              {!collapsed && (
                <button
                  type="button"
                  className="hrms-nav-section-title"
                  onClick={() => setOpenSections((prev) => ({ ...prev, exit: !prev.exit }))}
                  aria-expanded={openSections.exit}
                >
                  <span>Exit Management</span>
                  <ChevronDown size={14} className={`transition-transform ${openSections.exit ? "rotate-180" : ""}`} />
                </button>
              )}
              {(collapsed || openSections.exit) && (
                <div className="hrms-nav-group">{exitItems.map(renderItem)}</div>
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
