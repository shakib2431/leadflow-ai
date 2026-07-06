

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

export default function HRMSUserMenu() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Component is mounted
  }, []);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    navigate("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      <LogOut size={16} />
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
