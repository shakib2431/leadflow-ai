"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Send, Sparkles, Phone, Mail, User, 
  Building2, Target, CheckCircle2, Clock, Bot,
  MessageSquare
} from "lucide-react";

// --- TYPES ---
interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  unread_count: number;
  updated_at: string;
  contacts: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company_name: string | null;
    lead_score: number;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "contact" | "agent" | "system";
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
}

export default function UnifiedInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiDrafting, setAiDrafting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new incoming conversations
    const convSub = supabase
      .channel('conversations_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();
      
    return () => { supabase.removeChannel(convSub); };
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    
    fetchMessages(activeConv.id);
    fetchDeals(activeConv.contact_id);

    // Clear unread badge
    if (activeConv.unread_count > 0) {
      supabase.from("conversations").update({ unread_count: 0 }).eq("id", activeConv.id).then(fetchConversations);
    }

    // Subscribe to active conversation messages
    const msgSub = supabase
      .channel(`messages_${activeConv.id}`)
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

  async function fetchConversations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select(`*, contacts (first_name, last_name, email, phone, company_name, lead_score)`)
      .order('updated_at', { ascending: false });
      
    if (data) setConversations(data as Conversation[]);
    setLoading(false);
  }

  async function fetchMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
      
    if (data) {
      setMessages(data as Message[]);
      scrollToBottom();
    }
  }

  async function fetchDeals(contactId: string) {
    const { data } = await supabase
      .from('deals')
      .select('id, title, value, stage')
      .eq('contact_id', contactId);
    if (data) setDeals(data);
  }

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeConv) return;
    
    // Capture text and clear input immediately for snappy UX
    const textToSend = replyText;
    setReplyText("");
    
    try {
      // 1. Dispatch through our Twilio Outbound Engine
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeConv.contact_id,
          conversationId: activeConv.id,
          toPhone: `whatsapp:${activeConv.contacts.phone}`, 
          text: textToSend,
        }),
      });

      if (!res.ok) {
        console.error("Failed to route message through Twilio");
        // You can add a toast notification here later to alert the user
        return; 
      }
      
      // 2. Bump the conversation to the top of the inbox list
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConv.id);
      
    } catch (error) {
      console.error("Network error during dispatch:", error);
    }
  };

  // const handleAiDraft = () => {
  //   setAiDrafting(true);
  //   // Simulate AI response based on previous messages
  //   setTimeout(() => {
  //     setReplyText(`Hi ${activeConv?.contacts.first_name},\n\nThanks for reaching out! I'd be happy to help you with that. Let me review your details and get right back to you.\n\nBest,\nTeam`);
  //     setAiDrafting(false);
  //   }, 1000);
  // };
  // Updated handleAiDraft with improved UX
const handleAiDraft = async () => {
  if (!activeConv) return;
  
  setAiDrafting(true);
  try {
    const contextStr = messages
      .map(m => `${m.sender_type.toUpperCase()}: ${m.content}`)
      .join("\n");
      
    const res = await fetch("/api/inbox-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "draft", 
        context: contextStr,
        contact: activeConv.contacts // Pass contact details for better personalization
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Inject directly into the reply state
      setReplyText(data.result);
    }
  } catch (error) {
    console.error("AI Draft Failed:", error);
  } finally { 
    setAiDrafting(false); 
  }
};

  const filteredConversations = conversations.filter(c => 
    `${c.contacts?.first_name} ${c.contacts?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#07070a] text-white font-sans overflow-hidden">
      
      {/* LEFT PANE: Inbox List */}
      <div className="w-[340px] border-r border-white/5 flex flex-col bg-[#0d0e12] shrink-0">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-2xl font-bold mb-1">Unified Inbox</h1>
          <p className="text-xs text-white/40 mb-5">Omnichannel messaging</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500 transition-colors" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {loading ? (
            <div className="text-center text-white/40 text-sm mt-10 animate-pulse">Syncing inbox...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-white/40 text-sm mt-10">No conversations found.</div>
          ) : (
            filteredConversations.map((conv) => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConv(conv)} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  activeConv?.id === conv.id 
                    ? "bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5" 
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                }`}
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-bold text-violet-300">
                  {conv.contacts?.first_name?.charAt(0)}{conv.contacts?.last_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`text-sm truncate ${activeConv?.id === conv.id ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                      {conv.contacts?.first_name} {conv.contacts?.last_name}
                    </h3>
                    <span className="text-[10px] text-white/40 shrink-0">
                      {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                      {conv.channel}
                    </span>
                    {conv.unread_count > 0 && activeConv?.id !== conv.id && (
                      <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CENTER PANE: Chat Area */}
      <div className="flex-1 flex flex-col bg-[#07070a] relative">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="h-[84px] shrink-0 px-8 border-b border-white/5 flex justify-between items-center bg-[#0d0e12]/50 backdrop-blur-md z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {activeConv.contacts?.first_name} {activeConv.contacts?.last_name}
                </h2>
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active Session
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleAiDraft} disabled={aiDrafting} className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                  {aiDrafting ? <Sparkles size={14} className="animate-spin" /> : <Bot size={14} />}
                  Auto-Draft Reply
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 text-sm">No messages yet.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_type === 'agent' ? 'items-end' : msg.sender_type === 'system' ? 'items-center' : 'items-start'}`}>
                    {msg.sender_type === 'system' ? (
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs text-white/40 flex items-center gap-2">
                        <Clock size={12} /> {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[70%] px-5 py-3 text-sm shadow-xl ${
                        msg.sender_type === 'agent' 
                          ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-[#1a1b23] text-white/90 rounded-2xl rounded-tl-sm border border-white/5'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    <span className="text-[10px] text-white/20 mt-1 mx-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {/* <div className="p-6 bg-[#0d0e12] border-t border-white/5 shrink-0">
              <div className="flex items-end gap-3 bg-black/40 border border-white/10 rounded-2xl p-2 focus-within:border-violet-500/50 transition-colors">
                <textarea 
                  value={replyText} 
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Reply via ${activeConv.channel}...`}
                  className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] px-3 py-3 text-sm text-white custom-scrollbar"
                  rows={1}
                />
                <button 
                  onClick={handleSend} 
                  disabled={!replyText.trim()}
                  className="w-11 h-11 shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] mb-0.5"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-2 text-center">Press Enter to send, Shift + Enter for new line</p>
            </div> */}
            <div className="p-6 bg-[#0d0e12] border-t border-white/5 shrink-0">
  {/* Composer Container */}
  <div className="flex items-end gap-3 bg-black/40 border border-white/10 rounded-2xl p-2 focus-within:border-violet-500/50 transition-all">
    
    <textarea 
      value={replyText} 
      onChange={(e) => setReplyText(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
      placeholder={`Drafting reply for ${activeConv.contacts?.first_name || 'Client'}...`}
      className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] px-3 py-3 text-sm text-white placeholder:text-white/20 custom-scrollbar"
      rows={3}
    />
    
    {/* Action Buttons */}
    <div className="flex flex-col gap-2 mb-0.5">
      <button 
        onClick={handleSend} 
        disabled={!replyText.trim()}
        className="w-11 h-11 shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
      >
        <Send size={18} className="ml-1" />
      </button>
      
      <button 
        onClick={() => setReplyText("")} 
        className="text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors"
      >
        Clear
      </button>
    </div>
  </div>
  <p className="text-[10px] text-white/20 mt-3 text-center uppercase tracking-widest">
    Press Enter to send
  </p>
</div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <MessageSquare size={48} className="mb-4 opacity-50" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* RIGHT PANE: 360° CRM Context */}
      {activeConv && (
        <div className="w-[320px] bg-[#0d0e12] border-l border-white/5 p-6 shrink-0 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <User size={14} /> Intelligence Profile
          </h3>
          
          <div className="bg-black/40 rounded-2xl border border-white/5 p-5 mb-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center font-bold text-3xl text-violet-300 mb-3">
              {activeConv.contacts?.first_name?.charAt(0)}{activeConv.contacts?.last_name?.charAt(0)}
            </div>
            <h2 className="font-bold text-lg">{activeConv.contacts?.first_name} {activeConv.contacts?.last_name}</h2>
            <p className="text-xs text-white/40 mt-1">{activeConv.contacts?.company_name || 'Individual Prospect'}</p>
            
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-bold">
              <Target size={14} /> Score: {activeConv.contacts?.lead_score} / 100
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-white/40" />
              <span className="text-white/80 select-all truncate">{activeConv.contacts?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-white/40" />
              <span className="text-white/80 select-all">{activeConv.contacts?.phone || 'No phone recorded'}</span>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
            <Building2 size={14} /> Active Pipeline
          </h3>
          
          <div className="space-y-3">
            {deals.length === 0 ? (
              <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-xs text-white/40">
                No active deals attached.
              </div>
            ) : (
              deals.map(deal => (
                <div key={deal.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <h4 className="font-bold text-sm text-white/90 truncate mb-1">{deal.title}</h4>
                  <div className="flex justify-between items-end mt-3">
                    <span className="text-xs font-bold text-white/40 uppercase bg-white/5 px-2 py-1 rounded">{deal.stage}</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{Number(deal.value).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}