"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Mail, MessageCircle, Camera, Smartphone, Sparkles, // Swapped Instagram for Camera
  Languages, Clock, UserPlus, Send, EyeOff, Search, Info 
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
  
  // FIX: Aligned the types to "summarize" | "translate"
  const [aiLoading, setAiLoading] = useState<"summarize" | "translate" | null>(null);
  
  const [summary, setSummary] = useState<string | null>(null);
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

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setConversations(data);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeConv) return;

    const payload = {
      conversation_id: activeConv.id,
      sender_type: "agent",
      content: replyText,
      is_internal: isInternal,
    };

    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...payload, id: tempId, created_at: new Date().toISOString() } as Message]);
    setReplyText("");
    scrollToBottom();

    await supabase.from('messages').insert([payload]);
  };

  const runAiAction = async (action: "summarize" | "translate", text?: string) => {
    setAiLoading(action);
    try {
      const context = messages.map(m => `${m.sender_type.toUpperCase()}: ${m.content}`).join("\n");
      const res = await fetch("/api/inbox-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text, context })
      });
      const data = await res.json();
      
      if (action === "summarize") setSummary(data.result);
      if (action === "translate" && text) alert(`Translation: \n\n${data.result}`);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(null);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail size={16} className="text-violet-400" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-emerald-400" />;
      case 'instagram': return <Camera size={16} className="text-pink-400" />; // Swapped to Camera
      case 'sms': return <Smartphone size={16} className="text-blue-400" />;
      default: return <Mail size={16} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#07070a] text-white overflow-hidden border-t border-white/5">
      
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#0a0b0f] shrink-0">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold tracking-tight mb-4">Unified Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/30 text-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.map((conv) => (
            <div 
              key={conv.id}
              onClick={() => setActiveConv(conv)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all ${
                activeConv?.id === conv.id ? "bg-white/10 border-l-2 border-l-violet-500" : "hover:bg-white/5"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-sm truncate">{conv.lead_name}</h3>
                <span className="text-[10px] text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                  {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-white/50 uppercase font-bold tracking-wider">
                {getChannelIcon(conv.channel)} {conv.channel}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#07070a] relative">
        {activeConv ? (
          <>
            <div className="px-6 py-5 border-b border-white/5 bg-[#0a0b0f]/80 backdrop-blur flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-900/30 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400">
                  {activeConv.lead_name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold tracking-tight">{activeConv.lead_name}</h2>
                  <div className="flex items-center gap-2 text-xs text-white/50 uppercase font-semibold tracking-wider mt-0.5">
                    {getChannelIcon(activeConv.channel)} {activeConv.channel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => runAiAction("summarize")} disabled={aiLoading === "summarize"} className="p-2.5 bg-white/5 hover:bg-violet-600/20 hover:text-violet-400 text-white/60 rounded-xl transition-all disabled:opacity-50" title="AI Summarize">
                  <Sparkles size={18} className={aiLoading === "summarize" ? "animate-pulse text-violet-400" : ""} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl transition-all" title="Snooze">
                  <Clock size={18} />
                </button>
                <button className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl transition-all" title="Assign">
                  <UserPlus size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
              {summary && (
                <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-5 mb-8 fade-in relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"></div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-2">
                    <Sparkles size={14} /> Executive Summary
                  </h3>
                  <div className="text-sm text-white/80 leading-relaxed font-medium space-y-2" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
                </div>
              )}

              {messages.map((msg) => {
                const isAgent = msg.sender_type === "agent";
                
                if (msg.is_internal) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-3 max-w-xl flex items-start gap-3">
                        <EyeOff size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500/70 mb-1">Internal Note</p>
                          <p className="text-sm text-amber-200/90 leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-2xl flex flex-col group ${isAgent ? "items-end" : "items-start"}`}>
                      <div className={`px-5 py-3.5 rounded-2xl ${
                        isAgent ? "bg-white/10 text-white" : "bg-[#111216] border border-white/5 text-white/90"
                      } ${!isAgent && "rounded-tl-sm"} ${isAgent && "rounded-tr-sm"}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isAgent && (
                          <button onClick={() => runAiAction("translate", msg.content)} className="text-white/30 hover:text-white/80 transition-colors" title="Translate">
                            <Languages size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 border-t border-white/5 bg-[#0a0b0f] shrink-0">
              <div className={`rounded-2xl border transition-all ${isInternal ? "bg-amber-500/5 border-amber-500/20" : "bg-[#111216] border-white/10 focus-within:border-white/30"}`}>
                
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsInternal(!isInternal)} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                        isInternal ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/5 text-white/40 hover:text-white/80"
                      }`}
                    >
                      <EyeOff size={14} /> Internal Note
                    </button>
                  </div>
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isInternal ? "Drop a note for the team..." : "Draft your response..."}
                  className="w-full bg-transparent resize-none outline-none p-4 text-sm min-h-[100px] placeholder:text-white/20 custom-scrollbar"
                />

                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-1.5">
                    <Info size={12} /> Press Enter to send
                  </span>
                  <button 
                    onClick={handleSend}
                    disabled={!replyText.trim()}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                      isInternal 
                        ? "bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50" 
                        : "bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                    }`}
                  >
                    <Send size={16} />
                    {isInternal ? "Save Note" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Mail size={24} className="text-white/30" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">Inbox Zero</h3>
            <p className="text-sm text-white/40 max-w-sm leading-relaxed">Select a conversation from the sidebar to view the thread, drop internal notes, or dispatch an AI response.</p>
          </div>
        )}
      </div>
    </div>
  );
}