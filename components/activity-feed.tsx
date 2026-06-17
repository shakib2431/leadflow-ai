"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Use your existing lib import

export default function ActivityFeed({ leadId }: { leadId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    if (!leadId) return;
    setLoading(true);
    // Ensure 'message_logs' matches your Supabase table name EXACTLY
    const { data, error } = await supabase
      .from("message_logs") 
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    
    if (error) console.error("Feed Error:", error);
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [leadId]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Conversation History</h2>
      {loading ? (
        <p className="text-white/30 text-sm">Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-white/40 text-sm">No activity yet...</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className={`p-4 rounded-xl border ${
            log.direction === 'outbound' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-black/40 border-white/5'
          }`}>
            <p className="text-sm text-white/90">{log.content}</p>
            <span className="text-[10px] text-white/30 mt-2 block uppercase">
              {log.direction} • {new Date(log.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))
      )}
    </div>
  );
}