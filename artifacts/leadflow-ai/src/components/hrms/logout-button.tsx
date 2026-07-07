

import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await supabase.auth.signOut();
    navigate("/login");
    window.location.reload();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}