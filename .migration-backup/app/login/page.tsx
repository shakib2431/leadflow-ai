"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function getRoleBasedDestination(): Promise<string | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;

    const res = await fetch("/api/hrms/v2/user-roles/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const body = await res.json();
    const role = String(body?.data?.role || "").trim();

    if (role === "Employee") return "/hrms/v2/self-service";
    if (role === "HR Admin" || role === "HR Executive") return "/hrms/v2/admin-dashboard";

    return null;
  }

  async function getFallbackDestination() {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("*")
      .limit(1);

    if (!businesses || businesses.length === 0) return "/onboarding";
    if (!businesses[0]?.setup_completed) return "/onboarding";

    // Prefer HRMS entrypoint so users without explicit role mapping
    // do not get dropped into the generic CRM shell.
    return "/hrms/v2/admin-dashboard";
  }

  async function handlePostAuthRedirect() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    const mustChangePassword =
      Boolean(user?.user_metadata?.must_change_password) ||
      Boolean((user as any)?.app_metadata?.must_change_password);

    if (mustChangePassword) {
      window.location.href = "/login/reset-password?firstLogin=1";
      return;
    }

    const roleRoute = await getRoleBasedDestination();
    const nextPath = searchParams.get("next") || "";
    let safeNextPath: string | null = null;

    if (/^\/(?!\/)/.test(nextPath)) {
      safeNextPath = nextPath;
    } else {
      try {
        const url = new URL(nextPath);
        const sameOrigin = typeof window !== "undefined" && url.origin === window.location.origin;
        if (sameOrigin && /^\/(?!\/)/.test(url.pathname)) {
          safeNextPath = `${url.pathname}${url.search}${url.hash}`;
        }
      } catch {
        safeNextPath = null;
      }
    }

    if (roleRoute) {
      if (roleRoute === "/hrms/v2/self-service" && safeNextPath) {
        window.location.href = safeNextPath;
        return;
      }
      window.location.href = roleRoute;
      return;
    }

    const fallbackRoute = await getFallbackDestination();
    window.location.href = fallbackRoute;
  }

  async function handleLogin() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await handlePostAuthRedirect();
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function redirectIfAlreadyLoggedIn() {
      if (typeof window !== "undefined") {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParamsLocal = new URLSearchParams(window.location.search);
        const recoveryType = hashParams.get("type") || searchParamsLocal.get("type");
        const tokenHash = hashParams.get("token_hash") || searchParamsLocal.get("token_hash");
        const code = searchParamsLocal.get("code");
        const hasRecoveryToken =
          recoveryType === "recovery" ||
          Boolean(tokenHash) ||
          Boolean(code) ||
          hashParams.has("access_token") ||
          searchParamsLocal.has("access_token");

        if (hasRecoveryToken) {
          const next = `/login/reset-password${window.location.search}${window.location.hash}`;
          window.location.replace(next);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      await handlePostAuthRedirect();
    }

    redirectIfAlreadyLoggedIn();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center border-r border-white/5 bg-gradient-to-br from-violet-950/30 via-black to-black">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.15),transparent_40%)]" />

        <div className="relative z-10 max-w-xl px-12">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-300 text-sm mb-8">
            <Sparkles size={16} />
            AI Powered CRM Platform
          </div>

          <h1 className="text-6xl font-bold leading-tight">
            Close more deals with AI automation.
          </h1>

          <p className="text-white/50 text-lg mt-6 leading-relaxed">
            Manage leads, WhatsApp conversations,
            follow-ups, pipelines, and analytics —
            all in one modern CRM platform.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <h3 className="text-3xl font-bold">
                124+
              </h3>

              <p className="text-white/40 mt-2 text-sm">
                Leads managed this month
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <h3 className="text-3xl font-bold">
                38%
              </h3>

              <p className="text-white/40 mt-2 text-sm">
                Increase in conversions
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex items-center justify-center p-6 relative">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_40%)]" />

        <div className="relative z-10 w-full max-w-md">

          <div className="mb-10">

            <h2 className="text-5xl font-bold tracking-tight">
              Leadflow AI
            </h2>

            <p className="text-white/40 mt-3 text-lg">
              Welcome back. Login to continue.
            </p>
          </div>

          <div className="space-y-5">
            {errorMessage && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* EMAIL */}
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
  type="email"
  value={email}
  onChange={(e) =>
    setEmail(e.target.value)
  }
  placeholder="Email address"
                className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 text-white outline-none focus:border-violet-500 transition-all"
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
  type="password"
  value={password}
  onChange={(e) =>
    setPassword(e.target.value)
  }
  placeholder="Password"
                className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/10 pl-12 pr-4 text-white outline-none focus:border-violet-500 transition-all"
              />
            </div>

            {/* LOGIN BUTTON */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 transition-all font-semibold text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="text-right">
              <Link href="/login/forgot-password" className="text-sm text-violet-300 hover:text-violet-200">
                Forgot password?
              </Link>
            </div>

            <div className="text-center text-sm text-white/40 pt-2">
              Don’t have an account?{" "}
              <span className="text-violet-400 cursor-pointer hover:text-violet-300">
                Sign up
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}