

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const firstLogin = searchParams.get("firstLogin") === "1";
  const recoveryHint = useMemo(() => {
    const tokenHash = searchParams.get("token_hash");
    const code = searchParams.get("code");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const type = searchParams.get("type") || hashParams.get("type");
    const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
    return {
      hasRecoverySignal: Boolean(type === "recovery" || tokenHash || code || accessToken),
      tokenHash,
      code,
      type,
    };
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapRecoverySession() {
      setBootstrapping(true);
      setError(null);

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");
        const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
        const type = searchParams.get("type") || hashParams.get("type");
        const code = searchParams.get("code");

        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        } else if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) throw setErr;
        } else if (tokenHash && type === "recovery") {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (verifyErr) throw verifyErr;
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (recoveryHint.hasRecoverySignal) {
            throw new Error("Recovery link is invalid or expired. Please request a new reset link.");
          }
          throw new Error("Open this page from the password reset email link.");
        }

        if (!cancelled) setSessionReady(true);
      } catch (err: any) {
        if (!cancelled) {
          setSessionReady(false);
          setError(err?.message || "Could not validate recovery link. Please request a new one.");
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    bootstrapRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [searchParams, recoveryHint.hasRecoverySignal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionReady) {
      setError("Recovery session is not ready. Please open the latest reset link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        must_change_password: false,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated successfully. Redirecting...");
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 700);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#0d0e12] border border-white/10">
        <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
        <p className="text-white/40 text-sm mb-5">
          {firstLogin
            ? "This is your first login. Please set a new password to continue."
            : "Choose a strong password for your account."}
        </p>

        {error && <p className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-2 rounded">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded">{message}</p>}

        <form onSubmit={submit} className="space-y-3">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded bg-black/40 border border-white/10" placeholder="New password" />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full p-3 rounded bg-black/40 border border-white/10" placeholder="Confirm password" />
          <button disabled={loading || bootstrapping || !sessionReady} className="w-full p-3 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">{loading ? "Updating..." : bootstrapping ? "Validating link..." : "Update Password"}</button>
        </form>

        <Link to="/login" className="inline-block mt-4 text-sm text-violet-300 hover:text-violet-200">Back to Login</Link>
      </div>
    </div>
  );
}
