
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LogOut, Bell, Search, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useHRMSRole } from "@/components/hrms/use-hrms-role";

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  type: string;
}

interface Notification {
  title: string;
  message: string;
  time: string;
  type: string;
  link?: string;
}

export default function HRMSMainNav() {
  const [, navigate] = useLocation();
  const { role } = useHRMSRole();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [notifPanelTop, setNotifPanelTop] = useState(64);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    performSearch();
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function updateNotifPosition() {
      const anchor = notifButtonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setNotifPanelTop(rect.bottom + 8);
    }

    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      const clickedBell = notifButtonRef.current?.contains(e.target as Node);
      const clickedPanel = notifPanelRef.current?.contains(e.target as Node);
      if (!clickedBell && !clickedPanel) {
        setShowNotifications(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowNotifications(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateNotifPosition);
    window.addEventListener("scroll", updateNotifPosition, true);

    if (showNotifications) updateNotifPosition();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateNotifPosition);
      window.removeEventListener("scroll", updateNotifPosition, true);
    };
  }, [showNotifications]);

  async function performSearch() {
    try {
      const response = await fetch(
        `/api/hrms/v2/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/hrms/v2/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Notifications fetch error:", error);
    }
  }

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    navigate("/login");
    window.location.reload();
  }

  function handleSearchSelect(result: SearchResult) {
    setShowSearchResults(false);
    setSearchQuery("");
    if (result.type === "employee") {
      navigate(`/hrms/v2/employees/${result.id}`);
    } else if (result.type === "request") {
      navigate(`/hrms/v2/requests/${result.id}`);
    }
  }

  function handleNotificationClick(notif: Notification) {
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3 gap-6">
        {/* Left spacer */}
        <div className="flex-1" />

        {/* Center: Search */}
        <div className="w-96 relative" ref={searchRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees, requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              {searchResults.slice(0, 6).map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">{result.name}</div>
                    <div className="text-xs text-slate-500">{result.subtitle || result.type}</div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Notifications & User */}
        <div className="flex items-center gap-3 flex-shrink-0 justify-end flex-1">
          {/* Notifications Bell */}
          <div className="hidden sm:block relative" ref={notifRef}>
            <button
              ref={notifButtonRef}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 relative"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && createPortal(
              <div
                ref={notifPanelRef}
                className="fixed w-80 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-lg shadow-lg z-[999]"
                style={{ top: `${notifPanelTop}px`, right: "0.75rem" }}
              >
                <div className="p-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.slice(0, 8).map((notif, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNotificationClick(notif)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.type === "approval" ? "bg-amber-500" : notif.type === "leave" ? "bg-indigo-500" : "bg-green-500"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900">{notif.title}</div>
                            <div className="text-xs text-slate-500 line-clamp-2">{notif.message}</div>
                            <div className="text-xs text-slate-500 mt-1">{notif.time}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No notifications yet</p>
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className="text-right text-xs hidden sm:block">
              <div className="font-semibold text-slate-900">Admin</div>
              <div className="text-slate-500 text-[10px]">{role}</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium text-sm"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{loading ? "..." : "Logout"}</span>
              <span className="sm:hidden">{loading ? "..." : "Out"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
