

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LifeBuoy, Plus, MessageSquare, Loader2 } from "lucide-react";

export function SupportCenter({ leadId }: { leadId: string }) {
  const [ticketText, setTicketText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch real tickets from Supabase
  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error && data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    if (leadId) fetchTickets();
  }, [leadId]);

  // 2. Handle button click to insert a new ticket
  const handleSubmit = async () => {
    if (!ticketText.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("tickets").insert([{
      lead_id: leadId,
      subject: ticketText,
      status: "Open"
    }]);

    if (error) {
      alert("Failed to raise ticket.");
      console.error(error);
    } else {
      setTicketText(""); // Clear input
      await fetchTickets(); // Refresh the list instantly
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <LifeBuoy size={18} className="text-zinc-400" /> Support Center
        </h2>
      </div>

      {/* Tickets List */}
      <div className="space-y-3 mb-6 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex justify-center py-10 text-zinc-500"><Loader2 className="animate-spin" size={20} /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-600 italic">No open tickets.</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-500">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                  ticket.status === 'Open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                  ticket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  'bg-violet-500/10 text-violet-400 border-violet-500/20'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm text-zinc-200">{ticket.subject}</p>
            </div>
          ))
        )}
      </div>

      {/* New Ticket Input */}
      <div className="relative mt-auto">
        <input
          value={ticketText}
          onChange={(e) => setTicketText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Describe your issue..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
        />
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !ticketText.trim()}
          className="absolute right-2 top-2 bottom-2 p-1.5 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors text-xs font-medium flex items-center gap-1"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Raise</>}
        </button>
      </div>
    </div>
  );
}