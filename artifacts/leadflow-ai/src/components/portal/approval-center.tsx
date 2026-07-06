

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckSquare, Check, X, Loader2 } from "lucide-react";

export function ApprovalCenter({ leadId }: { leadId: string }) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    const { data, error } = await supabase
      .from("client_approvals")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error && data) setApprovals(data);
    setLoading(false);
  };

  useEffect(() => {
    if (leadId) fetchApprovals();
  }, [leadId]);

  // Handle the Approve or Reject button clicks
  const handleAction = async (id: string, newStatus: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from("client_approvals")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Failed to update approval.");
      console.error(error);
    } else {
      await fetchApprovals(); // Refresh UI
    }
    setProcessingId(null);
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <CheckSquare size={18} className="text-zinc-400" />
        <h2 className="text-lg font-medium text-white">Action Required</h2>
        {pendingCount > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold">
            {pendingCount} PENDING
          </span>
        )}
      </div>

      <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-zinc-500" /></div>
        ) : approvals.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No approvals requested.</p>
        ) : (
          approvals.map((req) => (
            <div key={req.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">{req.item_name}</p>
                <p className="text-xs text-zinc-500 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
              </div>

              {req.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAction(req.id, 'approved')}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Approve</>}
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'rejected')}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/5 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              ) : (
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  req.status === 'approved' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/5 text-rose-500 border-rose-500/10'
                }`}>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}