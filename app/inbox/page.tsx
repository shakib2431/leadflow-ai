"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Mail, MessageCircle, Camera, Smartphone, Sparkles, 
  Languages, Clock, UserPlus, Send, EyeOff, Search, Info, ExternalLink 
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
);

interface Conversation {
  id: string;
  lead_name: string;
  channel: string;
  status: string;
  updated_at: string;
  lead_id: string; // Ensure this is available to link contacts
}

interface Message {
  id: string;
  sender_type: "lead" | "agent" | "system";
  content: string;
  is_internal: boolean;
  created_at: string;
}

export default function UnifiedInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [aiLoading, setAiLoading] = useState<"summarize" | "translate" | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null); // State for the Sidebar Context
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    const convSub = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();
    return () => { supabase.removeChannel(convSub); };
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    setSummary(null);
    fetchMessages(activeConv.id);
    fetchContext(activeConv.lead_id); // Fetch relational data

    const msgSub = supabase
      .channel(`public:messages:${activeConv.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(msgSub); };
  }, [activeConv]);

  const fetchConversations = async () => {
    const { data } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
    if (data) setConversations(data);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) { setMessages(data); scrollToBottom(); }
  };

  const fetchContext = async (leadId: string) => {
    const { data } = await supabase
      .from('leads')
      .select(`*, companies(name, industry), deals(id, title, value, status)`)
      .eq('id', leadId)
      .single();
    setContext(data);
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeConv) return;
    const payload = { conversation_id: activeConv.id, sender_type: "agent", content: replyText, is_internal: isInternal };
    await supabase.from('messages').insert([payload]);
    setReplyText("");
  };

  const runAiAction = async (action: "summarize" | "translate", text?: string) => {
    setAiLoading(action);
    try {
      const contextStr = messages.map(m => `${m.sender_type.toUpperCase()}: ${m.content}`).join("\n");
      const res = await fetch("/api/inbox-ai", {
        method: "POST",
        body: JSON.stringify({ action, text, context: contextStr })
      });
      const data = await res.json();
      if (action === "summarize") setSummary(data.result);
    } finally { setAiLoading(null); }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#07070a] text-white overflow-hidden border-t border-white/5">
      {/* Inbox List */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#0a0b0f] shrink-0">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold mb-4">Unified Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.map((conv) => (
            <div key={conv.id} onClick={() => setActiveConv(conv)} className={`p-4 border-b border-white/5 cursor-pointer ${activeConv?.id === conv.id ? "bg-white/10 border-l-2 border-l-violet-500" : "hover:bg-white/5"}`}>
              <h3 className="font-semibold text-sm">{conv.lead_name}</h3>
              <p className="text-[10px] text-white/40 uppercase mt-1">{conv.channel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex bg-[#07070a] overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h2 className="font-bold">{activeConv.lead_name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => runAiAction("summarize")} className="p-2 bg-white/5 rounded-lg hover:bg-violet-600/20"><Sparkles size={16} /></button>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-lg ${msg.sender_type === 'agent' ? 'bg-violet-600' : 'bg-white/10'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/5">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full bg-transparent p-2 outline-none" placeholder="Draft your response..." />
                <button onClick={handleSend} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold">Send</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">Select a conversation</div>
          )}
        </div>

        {/* Context Sidebar (The 360° View) */}
        {activeConv && context && (
          <div className="w-[320px] border-l border-white/5 bg-[#0a0b0f] p-6 shrink-0 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-6">CRM Context</h3>
            <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 mb-6">
              <p className="text-[10px] text-white/40 uppercase">Company</p>
              <p className="font-semibold text-sm">{context.companies?.name || "N/A"}</p>
            </div>
            <div className="mb-6">
              <h4 className="text-[10px] uppercase text-white/40 mb-3">Active Deals</h4>
              {context.deals?.map((deal: any) => (
                <div key={deal.id} className="flex justify-between p-2 bg-white/5 rounded-lg text-xs mb-2">
                  <span>{deal.title}</span>
                  <span className="text-emerald-400 font-bold">₹{deal.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}