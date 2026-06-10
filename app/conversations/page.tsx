"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Send,
  Sparkles,
  BrainCircuit,
  Activity,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  ai_summary?: string;
  conversations?: any[]; 
}

interface Message {
  id: string;
  lead_id: string;
  sender: string;
  message: string;
  created_at?: string;
}

interface CopilotInsight {
  mood: string;
  insight: string;
  strategy: string;
  suggested_reply: string;
}

export default function ConversationsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  
  // Existing States
  const [newMessage, setNewMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [aiIntent, setAiIntent] = useState("");
  const [aiSentiment, setAiSentiment] = useState("");
  const [aiNextAction, setAiNextAction] = useState("");
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiTemperature, setAiTemperature] = useState("");
  const [aiReason, setAiReason] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  // NEW: Copilot States
  const [copilotActive, setCopilotActive] = useState(true);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [liveInsight, setLiveInsight] = useState<CopilotInsight | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, showAiInsights]);

  async function loadLeads() {
    const { data } = await supabase.from("leads").select(`*, conversations(unread_count)`);
    if (data) {
      setLeads(data);
      if (data.length > 0 && !selectedLead) {
        setSelectedLead(data[0]); 
      }
    }
  }

  async function loadMessages(leadId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      if (data.length > 0 && copilotActive) {
        triggerCopilot(data, leadId);
      }
    }

    const { data: lead } = await supabase
      .from("leads")
      .select(`ai_score, ai_summary, ai_next_action, ai_score_reason`)
      .eq("id", leadId)
      .single();

    if (lead) {
      setSummary(lead.ai_summary || "");
      setAiNextAction(lead.ai_next_action || "");
      setAiScore(lead.ai_score || 0);
      setAiReason(lead.ai_score_reason || "");
    }
  }

  // NEW: TRIGGER COPILOT
  async function triggerCopilot(chatMessages: Message[], leadId: string) {
    if (!copilotActive) return;
    
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (!lastMsg || lastMsg.sender === "agent") return;

    setCopilotLoading(true);
    try {
      const recentContext = chatMessages.slice(-8).map(m => `${m.sender === "agent" ? "You" : "Lead"}: ${m.message}`).join("\n");
      const currentLead = leads.find(l => l.id === leadId);

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: currentLead?.full_name,
          aiSummary: currentLead?.ai_summary,
          chatHistory: recentContext
        })
      });

      const insight = await res.json();
      if (insight.suggested_reply) {
        setLiveInsight(insight);
      }
    } catch (error) {
      console.error("Copilot Sync Error:", error);
    } finally {
      setCopilotLoading(false);
    }
  }

  // EXISTING: SUMMARIZE CONVERSATION
  async function summarizeConversation() {
    if (!selectedLead) return;
    setSummaryLoading(true);
    try {
      const conversationText = messages.map((msg) => `${msg.sender}: ${msg.message}`).join("\n");
      const prompt = `
      You are an AI CRM assistant. Analyze the conversation below and return ONLY valid JSON.
      Customer: ${selectedLead.full_name}
      Conversation: ${conversationText}
      Return format: { "summary": "", "intent": "", "sentiment": "", "nextAction": "", "score": 0, "temperature": "" }
      Rules: summary: Short conversation summary. intent: Customer buying intent. sentiment: positive, neutral, negative, interested, frustrated, etc. nextAction: Recommended next sales action. score: 0-39 = Cold, 40-69 = Warm, 70-100 = Hot. temperature: Must be exactly: Cold, Warm, Hot.
      IMPORTANT: Return ONLY JSON. Do not use markdown. Do not use \`\`\`json. Do not add explanations.
      `;

      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          lead_id: selectedLead.id,
          isAnalysis: true
        }),
      });

      const data = await response.json();
      if (data.message) {
        let aiData;
        try {
          const cleanedResponse = data.message.replace(/```json/g, "").replace(/```/g, "").trim();
          aiData = JSON.parse(cleanedResponse);
        } catch (err) {
          console.error("Failed to parse AI JSON", data.message);
          return;
        }
        
        setSummary(aiData.summary);
        setAiIntent(aiData.intent);
        setAiSentiment(aiData.sentiment);
        setAiNextAction(aiData.nextAction);
        setAiScore(aiData.score);
        setAiTemperature(aiData.temperature);

        await supabase.from("conversations").update({
          ai_summary: aiData.summary,
          ai_intent: aiData.intent,
          ai_sentiment: aiData.sentiment,
          ai_next_action: aiData.nextAction,
          ai_score: aiData.score,
          ai_temperature: aiData.temperature
        }).eq("lead_id", selectedLead.id);

        let followupMessage = aiData.temperature === "Cold" 
          ? `Hi ${selectedLead.full_name} 👋\n\nJust checking in.\nIf you'd like to know more about our services or have any questions, I'm happy to help.`
          : aiData.temperature === "Warm"
          ? `Hi ${selectedLead.full_name} 👋\n\nI noticed you were exploring our offerings.\nWould you like a quick walkthrough of how we can help?`
          : `Hi ${selectedLead.full_name} 👋\n\nLooks like you're actively interested.\nWould you like to schedule a quick call so we can discuss the best option for you?`;

        await supabase.from("follow_ups").insert({
          lead_id: selectedLead.id,
          title: `Follow up with ${selectedLead.full_name}`,
          description: aiData.nextAction,
          ai_message: followupMessage,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: "pending"
        });
      }
    } catch (error) {
      console.error("Summary Error:", error);
    } finally {
      setSummaryLoading(false);
    }
  }

  // EXISTING: MANUAL AI DRAFT
  async function generateAiReply() {
    if (!selectedLead) return;
    setAiLoading(true);
    try {
      const conversationText = messages.slice(-15).map((msg) => `${msg.sender}: ${msg.message}`).join("\n");
      const prompt = `You are an expert sales representative.\nLead Name: ${selectedLead.full_name}\nConversation:\n${conversationText}\nGenerate the BEST next reply.\nRules: Professional, Friendly, Short, Human sounding, Focus on moving the sale forward, Ask qualifying questions when appropriate.\nReturn ONLY the reply. No markdown. No explanations.`;

      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.message) {
        setAiSuggestion(data.message);
        setShowAiSuggestion(true);
      }
    } catch (error) {
      console.error("AI Reply Error:", error);
    } finally {
      setAiLoading(false);
    }
  }

  // EXISTING + NEW: SEND MESSAGE
  async function sendMessage(textToSend: string = newMessage) {
    if (!textToSend || !selectedLead) return;
    try {
      await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedLead.phone, message: textToSend }),
      });

      await supabase.from("messages").insert({
        lead_id: selectedLead.id,
        sender: "agent",
        message: textToSend,
      });

      setNewMessage("");
      setLiveInsight(null); // Clear copilot draft after sending
      loadMessages(selectedLead.id);
    } catch (error) {
      console.error("Send Error:", error);
    }
  }

  useEffect(() => {
    loadLeads();
    const channel = supabase.channel("sidebar-badges")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => loadLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedLead?.id === newMsg.lead_id) {
          setMessages((prev) => {
            const exists = prev.find((msg) => msg.id === newMsg.id);
            if (exists) return prev;
            
            const updated = [...prev, newMsg];
            // NEW: Trigger Copilot automatically if lead sent the message!
            if (newMsg.sender !== "agent" && copilotActive) {
              triggerCopilot(updated, selectedLead.id);
            }
            return updated;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedLead, copilotActive]);

  useEffect(() => {
    if (selectedLead) {
      setLiveInsight(null);
      loadMessages(selectedLead.id);
    }
  }, [selectedLead]);

  const filteredLeads = leads.filter((lead) => lead.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen bg-[#0a0a0f] text-white flex overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <div className="w-[340px] border-r border-white/10 flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-sm text-white/40 mt-1">Manage customer chats</p>
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => {
                setSelectedLead(lead);
                if (lead.conversations?.[0]?.unread_count > 0) {
                  supabase.from("conversations").update({ unread_count: 0 }).eq("lead_id", lead.id).then(() => loadLeads());
                }
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedLead?.id === lead.id ? "bg-violet-500/10 border-violet-500/20" : "bg-white/[0.03] border-white/5"
              }`}
            >
              <div>
                <h2 className="font-semibold">{lead.full_name}</h2>
                <p className="text-sm text-white/40 mt-1">{lead.email}</p>
              </div>
              {(lead.conversations?.[0]?.unread_count ?? 0) > 0 && selectedLead?.id !== lead.id && (
                <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-red-500/20">
                  {lead.conversations?.[0]?.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. MIDDLE CHAT AREA */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <div className="h-[76px] border-b border-white/10 flex items-center px-6 shrink-0 justify-between">
          <div>
            <h2 className="font-semibold text-lg">{selectedLead?.full_name}</h2>
            <p className="text-sm text-green-400">Active Lead</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCopilotActive(!copilotActive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                copilotActive ? "bg-violet-600 shadow-lg shadow-violet-600/20 text-white" : "bg-black/40 border border-white/10 text-white/40 hover:text-white/80"
              }`}
            >
              <BrainCircuit size={14} /> {copilotActive ? "Copilot Active" : "Enable Copilot"}
            </button>
            <button
              onClick={summarizeConversation}
              disabled={summaryLoading}
              className="px-5 h-11 rounded-2xl bg-violet-500/20 border border-violet-500/20 hover:bg-violet-500/30 transition-all text-sm font-medium"
            >
              {summaryLoading ? "Analyzing..." : "✨ Summarize Chat"}
            </button>
          </div>
        </div>

        {/* Existing Insights Dropdown */}
        {summary && (
          <div className="mx-6 mt-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {aiTemperature === "Hot" && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-400 font-semibold text-xs">🔥 Hot Lead ({aiScore})</div>}
                {aiTemperature === "Warm" && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-semibold text-xs">🟡 Warm Lead ({aiScore})</div>}
                {aiTemperature === "Cold" && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-400 font-semibold text-xs">🔴 Cold Lead ({aiScore})</div>}
              </div>
              <button
                onClick={() => setShowAiInsights(!showAiInsights)}
                className="text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors flex items-center gap-1 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20"
              >
                {showAiInsights ? "Hide Insights ▲" : "✨ View AI Insights ▼"}
              </button>
            </div>
            {showAiInsights && (
              <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 space-y-5 animate-in fade-in slide-in-from-top-2">
                <h3 className="font-semibold text-violet-300">AI Conversation Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">Summary</p><p className="text-sm text-white/80 leading-relaxed">{summary}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">AI Score</p><p className="text-2xl font-bold text-violet-300">{aiScore ?? 0}/100</p></div>
                  <div className="col-span-2"><p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">Recommended Action</p><p className="text-sm text-white/80">{aiNextAction}</p></div>
                  <div className="col-span-2"><p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">AI Reasoning</p><p className="text-sm text-white/80 leading-relaxed">{aiReason}</p></div>
                </div>
              </div>
            )}
          </div>
        )}

        <div id="chat-container" className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "agent" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.sender === "agent" ? "bg-violet-600" : "bg-white/10"}`}>
                <p className="text-sm">{message.message}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={generateAiReply}
              disabled={aiLoading}
              className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/30 transition-all"
            >
              <Sparkles size={20} className={aiLoading ? "animate-spin" : ""} />
            </button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
            />
            <button
              onClick={() => sendMessage()}
              className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. RIGHT: AI COPILOT SIDEBAR */}
      {copilotActive && (
        <div className="w-[380px] bg-[#0c0d12] border-l border-white/10 flex flex-col z-10 shrink-0 shadow-[-20px_0_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300">
          <div className="h-[76px] border-b border-white/10 flex items-center px-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles size={16} />
              </div>
              <h2 className="font-bold text-sm tracking-wide text-white/90">Live Sales Copilot</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
            {!liveInsight && !copilotLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-40">
                <Activity size={32} className="text-white/40 mb-4" />
                <p className="text-xs font-medium text-white/60">Listening to conversation...</p>
                <p className="text-[10px] text-white/40 mt-2">Copilot will automatically analyze the next message from the lead.</p>
              </div>
            )}

            {copilotLoading && (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-4 w-24 bg-white/5 rounded"></div>
                <div className="h-20 w-full bg-white/5 rounded-xl"></div>
                <div className="h-32 w-full bg-white/5 rounded-xl"></div>
              </div>
            )}

            {liveInsight && !copilotLoading && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                    liveInsight.mood.includes("Positive") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    liveInsight.mood.includes("Hesitant") || liveInsight.mood.includes("Price") ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  }`}>
                    {liveInsight.mood}
                  </span>
                </div>

                <div className="bg-[#14151a] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5"><BrainCircuit size={12}/> AI Insight</h3>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">{liveInsight.insight}</p>
                </div>

                <div className="bg-[#14151a] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50"></div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-1.5"><ShieldAlert size={12}/> Recommended Strategy</h3>
                  <p className="text-xs text-white/70 leading-relaxed font-medium">{liveInsight.strategy}</p>
                </div>

                <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-5 shadow-lg shadow-violet-900/10">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-1.5"><Sparkles size={12}/> One-Click Reply</h3>
                  <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5">
                    <p className="text-sm text-violet-100/90 italic leading-relaxed">"{liveInsight.suggested_reply}"</p>
                  </div>
                  <button
                    onClick={() => sendMessage(liveInsight.suggested_reply)}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all rounded-xl text-xs font-bold tracking-wide text-white flex items-center justify-center gap-2"
                  >
                    Send Draft to Lead <ArrowRight size={14} />
                  </button>
                  <button 
                    onClick={() => setNewMessage(liveInsight.suggested_reply)}
                    className="w-full mt-2 py-2 text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider"
                  >
                    Edit before sending
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual AI Suggestion Modal (Retained from your original code) */}
      {showAiSuggestion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[600px] rounded-3xl bg-[#0f172a] border border-violet-500/20 p-6">
            <h2 className="text-xl font-semibold mb-4">AI Follow-Up Suggestion</h2>
            <textarea
              value={aiSuggestion}
              onChange={(e) => setAiSuggestion(e.target.value)}
              className="w-full h-40 rounded-xl bg-black/20 border border-white/10 p-4 outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAiSuggestion(false)} className="px-5 py-2 rounded-xl border border-white/10">Cancel</button>
              <button onClick={() => sendMessage(aiSuggestion).then(() => setShowAiSuggestion(false))} className="px-5 py-2 rounded-xl bg-violet-600">🚀 Send WhatsApp</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}