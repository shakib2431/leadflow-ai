"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] =
    useState(false);
    const [email, setEmail] =
  useState("");

const [password, setPassword] =
  useState("");

async function handleLogin() {
  try {
    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }
const { data: businesses } =
  await supabase
    .from("businesses")
    .select("*")
    .limit(1);

if (
  !businesses ||
  businesses.length === 0
) {
  window.location.href =
    "/onboarding";

  return;
}

if (
  !businesses[0]
    .setup_completed
) {
  window.location.href =
    "/onboarding";

  return;
}

window.location.href = "/";
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

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