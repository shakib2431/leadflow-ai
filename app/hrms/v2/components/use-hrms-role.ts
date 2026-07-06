"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type HRMSRole = "HR Admin" | "HR Executive" | "Employee" | null;
const ROLE_CACHE_KEY = "hrms.resolvedRole";
type RoleCache = {
  role: Exclude<HRMSRole, null>;
  email: string;
};

let memoryRoleCache: RoleCache | null = null;

function normalizeRoleFromTitle(value: string): Exclude<HRMSRole, null> | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (text === "hr admin" || text === "admin" || text.includes("hr admin")) return "HR Admin";
  if (text === "hr executive" || text.includes("hr executive")) return "HR Executive";
  return null;
}

export function useHRMSRole() {
  usePathname();
  const [role, setRole] = useState<HRMSRole>(null);
  const [loading, setLoading] = useState(true);
  const [serverResolved, setServerResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        if (!cancelled) setLoading(true);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Prefer real logged-in session so role is fetched from user_roles correctly.
        const { data } = await supabase.auth.getSession();
        let session = data.session || null;
        let token = session?.access_token;

        if (!token) {
          const refreshed = await supabase.auth.refreshSession();
          session = refreshed.data.session || null;
          token = session?.access_token;
        }

        const currentEmail = String(session?.user?.email || "").trim().toLowerCase();

        if (!currentEmail) {
          memoryRoleCache = null;
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ROLE_CACHE_KEY);
          }
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }

        // Never reuse cached role across different signed-in users.
        if (memoryRoleCache && memoryRoleCache.email !== currentEmail) {
          memoryRoleCache = null;
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ROLE_CACHE_KEY);
          }
        }

        if (
          memoryRoleCache?.email === currentEmail &&
          (memoryRoleCache.role === "HR Admin" || memoryRoleCache.role === "HR Executive" || memoryRoleCache.role === "Employee")
        ) {
          if (!cancelled) {
            setRole(memoryRoleCache.role);
            setLoading(false);
          }
        }

        if (typeof window !== "undefined" && currentEmail) {
          try {
            const raw = window.localStorage.getItem(ROLE_CACHE_KEY);
            if (raw) {
              const cached = JSON.parse(raw) as RoleCache;
              if (
                cached?.email === currentEmail &&
                (cached?.role === "HR Admin" || cached?.role === "HR Executive" || cached?.role === "Employee")
              ) {
                memoryRoleCache = cached;
                setRole(cached.role);
                setLoading(false);
              } else if (cached?.email && cached.email !== currentEmail) {
                window.localStorage.removeItem(ROLE_CACHE_KEY);
              }
            }
          } catch {
            // Ignore malformed cache payload.
          }
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        if (!token && typeof window !== "undefined" && !window.location.hostname.includes("prod")) {
          const roleOverride = String(window.localStorage.getItem("hrms-dev-role") || "").trim();
          const overrideValid = roleOverride === "HR Admin" || roleOverride === "HR Executive" || roleOverride === "Employee";
          const inferredEmail = currentEmail || memoryRoleCache?.email || "";

          // In dev, allow server-side role inference by email even without explicit override.
          if (overrideValid || inferredEmail) {
            headers["x-dev-mode"] = "true";
            if (overrideValid) headers["x-dev-role"] = roleOverride;
            if (inferredEmail) headers["x-dev-email"] = inferredEmail;
          }
        }

        const res = await fetch("/api/hrms/v2/user-roles/me", { headers });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || "Failed to resolve HRMS role");
        }
        let nextRole: HRMSRole = body?.data?.role;

        if (nextRole === "Employee") {
          try {
            const meRes = await fetch("/api/hrms/v2/me", { headers });
            if (meRes.ok) {
              const meBody = await meRes.json();
              const designation = String(meBody?.data?.employee?.designation || "");
              const currentTitle = String(meBody?.data?.employee?.current_title || "");
              const elevated = normalizeRoleFromTitle(designation) || normalizeRoleFromTitle(currentTitle);
              if (elevated) nextRole = elevated;
            }
          } catch {
            // Keep role from primary role endpoint if enrichment fails.
          }
        }

        if (!cancelled) {
          if (nextRole === "HR Admin" || nextRole === "HR Executive" || nextRole === "Employee") {
            setRole(nextRole);
            setLoading(false);
            setServerResolved(true);
            if (typeof window !== "undefined") {
              const payload: RoleCache = {
                role: nextRole,
                email: currentEmail,
              };
              memoryRoleCache = payload;
              window.localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(payload));
            }
          } else {
            setRole(null);
            setServerResolved(true);
          }
        }
      } catch {
        if (!cancelled) {
          // Keep the current in-memory role for transient network errors.
          setRole((prev) => prev);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        memoryRoleCache = null;
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ROLE_CACHE_KEY);
        }
        setRole(null);
        setLoading(false);
        setServerResolved(false);
        return;
      }
      loadRole();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading, serverResolved };
}
