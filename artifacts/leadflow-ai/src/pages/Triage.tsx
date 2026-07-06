

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Bot, Target, Sparkles } from "lucide-react";

interface TriageItem {
  id: string;
  conversation_id: string;
  ai_tag: string;
  suggested_reply: string;
  suggested_deal_value: number;
  status: string;
  created_at: string;
  conversations: {
    contact_id: string;
    contacts: {
      first_name: string;
      last_name: string;
      phone: string;
    } | null;
  } | null;
}

export default function TriagePage() {
  const [items, setItems] = useState<TriageItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTriageQueue();
  }, []);

  async function fetchTriageQueue() {
    const { data } = await supabase
      .from("triage_inbox")
      .select(`
        id, conversation_id, ai_tag, suggested_reply, suggested_deal_value, status, created_at,
        conversations (
          contact_id,
          contacts (first_name, last_name, phone)
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) setItems(data as unknown as TriageItem[]);
  }

  const handleApproveAndExecute = async (item: TriageItem) => {
    setProcessingId(item.id);
    try {
      const contact = item.conversations?.contacts;
      if (!contact) return;

      // 1. Dispatch the pre-drafted WhatsApp message
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: item.conversations?.contact_id,
          conversationId: item.conversation_id,
          toPhone: `whatsapp:${contact.phone}`,
          text: item.suggested_reply,
        }),
      });

      // 2. Automate Deal Pipeline (If High Intent)
      if (item.ai_tag === "BUYING_INTENT" || item.suggested_deal_value > 0) {
        await supabase.from("deals").insert({
          contact_id: item.conversations?.contact_id,
          title: `New Opportunity - ${contact.first_name}`,
          value: item.suggested_deal_value || 10000, // Default or AI-estimated value
          stage: "QUALIFIED"
        });
      }

      // 3. Mark Triage Item as Resolved
      await supabase
        .from("triage_inbox")
        .update({ status: "resolved" })
        .eq("id", item.id);

      // 4. Remove from UI
      setItems((prev) => prev.filter((i) => i.id !== item.id));

    } catch (error) {
      console.error("Execution failed:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="text-violet-500" /> Action Queue
        </h1>
        <p className="text-white/40 mt-2 text-sm">Review AI-drafted responses and pipeline updates.</p>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/10 rounded-2xl text-white/30">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
            <p>Inbox Zero. All actions resolved.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-[#0d0e12] border border-white/5 rounded-2xl p-6 flex gap-6 hover:border-violet-500/30 transition-colors">
              
              {/* Left Column: Context */}
              <div className="w-1/4 shrink-0 border-r border-white/5 pr-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold tracking-wider ${
                    item.ai_tag === 'BUYING_INTENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-300'
                  }`}>
                 {(item.ai_tag || 'GENERAL_INQUIRY').replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{item.conversations?.contacts?.first_name} {item.conversations?.contacts?.last_name}</h3>
                <p className="text-xs text-white/40 mt-1 font-mono">{new Date(item.created_at).toLocaleString()}</p>
                
                {item.ai_tag === "BUYING_INTENT" && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400/80 bg-emerald-400/5 px-3 py-2 rounded-lg border border-emerald-400/10">
                    <Target size={14} /> Will create Deal pipeline entry
                  </div>
                )}
              </div>

              {/* Middle Column: The AI Draft */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
                  <Bot size={14} /> AI Drafted Response
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-white/80 leading-relaxed relative">
                  {item.suggested_reply || "No reply drafted. Requires manual intervention."}
                </div>
              </div>

              {/* Right Column: The Action */}
              <div className="w-[200px] shrink-0 flex flex-col items-end justify-center pl-6 border-l border-white/5">
                <button
                  onClick={() => handleApproveAndExecute(item)}
                  disabled={processingId === item.id || !item.suggested_reply}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                >
                  {processingId === item.id ? (
                    <span className="animate-pulse">Executing...</span>
                  ) : (
                    <>Approve & Execute</>
                  )}
                </button>
                <button className="w-full mt-3 py-2 text-xs font-bold text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest">
                  Edit Draft
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}