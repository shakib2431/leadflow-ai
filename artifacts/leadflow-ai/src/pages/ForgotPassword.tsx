

import { useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const appBase = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");
    const redirectTo = `${appBase}/login/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) setError(error.message);
    else setMessage("Password reset link sent. Please check your email.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#0d0e12] border border-white/10">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-white/40 text-sm mb-5">Enter your account email to receive a reset link.</p>

        {error && <p className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-2 rounded">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded">{message}</p>}

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded bg-black/40 border border-white/10" placeholder="you@company.com" />
          <button disabled={loading} className="w-full p-3 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
        </form>

        <Link to="/login" className="inline-block mt-4 text-sm text-violet-300 hover:text-violet-200">Back to Login</Link>
      </div>
    </div>
  );
}
