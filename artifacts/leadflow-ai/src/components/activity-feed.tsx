
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/lib/supabase";

const ActivityFeed = forwardRef(({ leadId }: { leadId: string }, ref) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("message_logs") 
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    
    if (error) console.error("Feed Error:", error);
    setLogs(data || []);
    setLoading(false);
  }

  // Expose fetchLogs to the parent
  useImperativeHandle(ref, () => ({ fetchLogs }));

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
            log.direction === 'outbound' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-cyan-500/10 border-cyan-500/20'
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
});

ActivityFeed.displayName = "ActivityFeed";
export default ActivityFeed;