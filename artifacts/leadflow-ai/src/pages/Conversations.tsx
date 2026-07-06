  "use client";

  import { useEffect, useState } from "react";

  import { supabase } from "@/lib/supabase";

  import {
    Search,
    Send,
    Sparkles,
  } from "lucide-react";

  interface Lead {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    messages?: {
  message: string;
  created_at: string;
}[];
    conversations?: any[]; // <--- Add this line so TypeScript knows it exists!
  }

  interface Message {
    id: string;
    lead_id: string;
    sender: string;
    message: string;
    created_at?: string;
  }

  export default function ConversationsPage() {

    const [leads, setLeads] =
      useState<Lead[]>([]);

    const [selectedLead, setSelectedLead] =
      useState<Lead | null>(null);

    const [messages, setMessages] =
      useState<Message[]>([]);
      const [search, setSearch] =
  useState("");
      useEffect(() => {

    const chatContainer =
      document.getElementById("chat-container");

    if (chatContainer) {
      chatContainer.scrollTop =
        chatContainer.scrollHeight;
    }

  }, [messages]);

    const [newMessage, setNewMessage] =
      useState("");
      const [aiLoading, setAiLoading] =
    useState(false);
    const [summary, setSummary] =
    useState("");
    const [aiIntent, setAiIntent] =
    useState("");

  const [aiSentiment, setAiSentiment] =
    useState("");

  const [aiNextAction, setAiNextAction] =
    useState("");
    const [aiScore, setAiScore] =
    useState<number | null>(null);

  const [aiTemperature, setAiTemperature] =
    useState("");
    const [aiReason, setAiReason] =
  useState("");
  const [suggestedReply, setSuggestedReply] =
    useState("");
  const [summaryLoading, setSummaryLoading] =
    useState(false);
const [aiSuggestion, setAiSuggestion] =
  useState("");

const [showAiSuggestion, setShowAiSuggestion] =
  useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
 function formatTimeAgo(dateString: string) {

  const now = new Date();
  const date = new Date(dateString);

  const diff =
    Math.floor(
      (now.getTime() - date.getTime()) /
      1000
    );

  if (diff < 60) {
    return "Just now";
  }

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }

  if (diff < 172800) {
    return "Yesterday";
  }

  return date.toLocaleDateString();
}
async function loadLeads() {
 
   const { data } = await supabase
  .from("leads")
  .select(`
    *,
    conversations(unread_count),
    messages(
      message,
      created_at
    )
  `);

 if (data) {

  const sortedLeads = [...data].sort((a: any, b: any) => {

    const dateA =
      a.messages?.[0]?.created_at || "";

    const dateB =
      b.messages?.[0]?.created_at || "";

    return (
      new Date(dateB).getTime() -
      new Date(dateA).getTime()
    );

  });

  setLeads(sortedLeads);

  if (sortedLeads.length > 0) {
    setSelectedLead(
      (current) =>
        current || sortedLeads[0]
    );
  }
}
  }

  async function loadMessages(
    leadId: string
  ) {

    const { data } =
      await supabase
        .from("messages")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", {
          ascending: true,
        });

    if (data) {
      setMessages(data);
    }

   const { data: lead } = await supabase
  .from("leads")
  .select(`
    ai_score,
    ai_summary,
    ai_next_action,
    ai_score_reason
  `)
  .eq("id", leadId)
  .single();

if (lead) {

  setSummary(
    lead.ai_summary || ""
  );

  setAiNextAction(
    lead.ai_next_action || ""
  );

  setAiScore(
    lead.ai_score || 0
  );

  setAiReason(
    lead.ai_score_reason || ""
  );

}
  }

    async function summarizeConversation() {

    if (!selectedLead) return;

    setSummaryLoading(true);

    try {

      const conversationText =
        messages
          .map(
            (msg) =>
              `${msg.sender}: ${msg.message}`
          )
          .join("\n");

  const prompt = `
  You are an AI CRM assistant.

  Analyze the conversation below and return ONLY valid JSON.

  Customer:
  ${selectedLead.full_name}

  Conversation:
  ${conversationText}

  Return format:

  {
    "summary": "",
    "intent": "",
    "sentiment": "",
    "nextAction": "",
    "score": 0,
    "temperature": ""
  }

  Rules:

  summary:
  Short conversation summary.

  intent:
  Customer buying intent.

  sentiment:
  positive, neutral, negative, interested, frustrated, etc.

  nextAction:
  Recommended next sales action.

  score:
  0-39 = Cold
  40-69 = Warm
  70-100 = Hot

  temperature:
  Must be exactly:
  Cold
  Warm
  Hot

  IMPORTANT:
  Return ONLY JSON.
  Do not use markdown.
  Do not use \`\`\`json.
  Do not add explanations.
  `;

      // const response = await fetch(
      //   "/api/generate-message",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type":
      //         "application/json",
      //     },
      //     body: JSON.stringify({
      //       prompt,
      //     }),
      //   }
      // );
      const response = await fetch(
        "/api/generate-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt,
            lead_id: selectedLead.id,  // <--- ADD THIS
            isAnalysis: true           // <--- ADD THIS
          }),
        }
      );

      const data =
    await response.json();
  if (data.message) {

    let aiData;

    try {

      const cleanedResponse = data.message
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      console.log(
        "RAW AI RESPONSE:",
        data.message
      );

      console.log(
        "CLEANED AI RESPONSE:",
        cleanedResponse
      );

      aiData =
        JSON.parse(cleanedResponse);

    } catch (err) {

      console.error(
        "Failed to parse AI JSON",
        data.message
      );

      return;
    }
    setSummary(
      aiData.summary
    );
    setAiIntent(
    aiData.intent
  );

  setAiSentiment(
    aiData.sentiment
  );

  setAiNextAction(
    aiData.nextAction
  );
  setAiScore(
    aiData.score
  );

  setAiTemperature(
    aiData.temperature
  );

    const result =
      await supabase
        .from("conversations")
  .update({

    ai_summary:
      aiData.summary,

    ai_intent:
      aiData.intent,

    ai_sentiment:
      aiData.sentiment,

    ai_next_action:
      aiData.nextAction,

    ai_score:
      aiData.score,

    ai_temperature:
      aiData.temperature

  })
        .eq(
          "lead_id",
          selectedLead.id
        );

    console.log(
      "AI Summary Save Result:",
      result
    );

    let followupMessage = "";

if (aiData.temperature === "Cold") {

  followupMessage =
    `Hi ${selectedLead.full_name} 👋

Just checking in.

If you'd like to know more about our services or have any questions, I'm happy to help.`;

}

else if (aiData.temperature === "Warm") {

  followupMessage =
    `Hi ${selectedLead.full_name} 👋

I noticed you were exploring our offerings.

Would you like a quick walkthrough of how we can help?`;

}

else {

  followupMessage =
    `Hi ${selectedLead.full_name} 👋

Looks like you're actively interested.

Would you like to schedule a quick call so we can discuss the best option for you?`;

}
  await supabase
  .from("follow_ups")
  .insert({

    lead_id:
      selectedLead.id,

    title:
      `Follow up with ${selectedLead.full_name}`,

    description:
      aiData.nextAction,

    ai_message:
      followupMessage,

    due_date:
      new Date(
        Date.now() +
        24 * 60 * 60 * 1000
      ),

    status:
      "pending"

  });
  }
    } catch (error) {

      console.error(
        "Summary Error:",
        error
      );

    } finally {

      setSummaryLoading(false);

    }
  }

    async function generateAiReply() {
      

    if (!selectedLead) return;

    setAiLoading(true);

    try {

      const conversationText = messages
  .slice(-15)
  .map(
    (msg) =>
      `${msg.sender}: ${msg.message}`
  )
  .join("\n");

const prompt = `
You are an expert sales representative.

Lead Name:
${selectedLead.full_name}

Conversation:
${conversationText}

Generate the BEST next reply.

Rules:

- Professional
- Friendly
- Short
- Human sounding
- Focus on moving the sale forward
- Ask qualifying questions when appropriate

Return ONLY the reply.

No markdown.
No explanations.
`;

      const response = await fetch(
        "/api/generate-message",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            prompt,
          }),
        }
      );

      const data =
        await response.json();

    if (data.message) {

 setAiSuggestion(
  data.message
);

setShowAiSuggestion(
  true
);

}

    } catch (error) {

      console.error(
        "AI Reply Error:",
        error
      );

    } finally {

      setAiLoading(false);

    }
  }

    async function sendMessage() {

    if (
      !newMessage ||
      !selectedLead
    ) return;

    try {

      await fetch(
        "/api/send-whatsapp",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            phone:
              selectedLead.phone,
            message:
              newMessage,
          }),
        }
      );

      await supabase
        .from("messages")
        .insert({
          lead_id:
            selectedLead.id,
          sender: "agent",
          message:
            newMessage,
        });

      setNewMessage("");

      loadMessages(
        selectedLead.id
      );

    } catch (error) {

      console.error(
        "Send Error:",
        error
      );

    }
  }

  useEffect(() => {
    loadLeads();

    // NEW: Listen for unread badge updates in the background!
    const channel = supabase
      .channel("sidebar-badges")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => {
          loadLeads(); // Silently refresh the sidebar when a badge changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {

          const newMessage =
            payload.new as Message;

          if (
            selectedLead?.id ===
            newMessage.lead_id
          ) {

            setMessages((prev) => {

              const exists =
                prev.find(
                  (msg) =>
                    msg.id === newMessage.id
                );

              if (exists) return prev;

              return [
                ...prev,
                newMessage,
              ];
            });

          }

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [selectedLead]);

  useEffect(() => {

    if (selectedLead) {
      loadMessages(selectedLead.id);
    }

  }, [selectedLead]);

  const filteredLeads =
  leads.filter((lead) =>
    lead.full_name
      .toLowerCase()
      .includes(
        search.toLowerCase()
      )
  );

    return (
      <div className="h-screen bg-[#0a0a0f] text-white flex overflow-hidden">

        {/* Sidebar */}
        <div className="w-[340px] border-r border-white/10 flex flex-col">

          <div className="p-5 border-b border-white/10">

            <h1 className="text-2xl font-bold">
              Conversations
            </h1>

            <p className="text-sm text-white/40 mt-1">
              Manage customer chats
            </p>

            <div className="mt-4 relative">

              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
<input
  type="text"
  placeholder="Search conversations..."
  value={search}
  onChange={(e) =>
    setSearch(e.target.value)
  }
  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none"
/>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">

{filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => {
                // 1. Instantly switch the chat view
                setSelectedLead(lead);
                
                // 2. Clear the database badge
                if (lead.conversations?.[0]?.unread_count > 0) {
                  supabase
                    .from("conversations")
                    .update({ unread_count: 0 })
                    .eq("lead_id", lead.id)
                    .then(() => loadLeads());
                }
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                selectedLead?.id === lead.id
                  ? "bg-gradient-to-r from-violet-500/20 to-purple-500/10 border-violet-500/30 shadow-lg shadow-violet-500/10"
                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]"
              }`}
            >
              {/* Card Inner Wrapper */}
              <div className="flex-1 min-w-0 flex items-start gap-3">
                
                {/* Avatar */}
                <div className="w-10 h-10 shrink-0 rounded-full bg-violet-500/20 border border-violet-500/20 flex items-center justify-center font-bold text-violet-300">
                  {lead.full_name?.charAt(0) || "?"}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold truncate text-sm text-white/90">
                      {lead.full_name}
                    </h2>
                    {lead.messages?.[0]?.created_at && (
                      <span className="text-[10px] text-white/40 shrink-0">
                        {formatTimeAgo(lead.messages[0].created_at)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-yellow-500/20 text-yellow-300 shrink-0">
                      🔥 Warm
                    </span>
                    <p className="text-[11px] text-white/40 truncate">
                      {lead.email}
                    </p>
                  </div>

                  <p className="text-xs text-white/50 mt-2 truncate">
                    {lead.messages?.[0]?.message || "No messages yet"}
                  </p>
                </div>
              </div>
              
              {/* Red Badge for Unread Messages */}
              {(lead.conversations?.[0]?.unread_count ?? 0) > 0 && selectedLead?.id !== lead.id && (
                <div className="ml-3 w-5 h-5 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-red-500/20">
                  {lead.conversations?.[0]?.unread_count}
                </div>
              )}
            </button>
          ))}
          </div>
        </div>

     {/* --- START OF PASTED CODE: Middle Chat Area --- */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Header Section */}
        <div className="h-[76px] shrink-0 border-b border-white/10 flex items-center justify-between px-6 overflow-hidden">
          <div>
            <h2 className="font-semibold text-lg">{selectedLead?.full_name}</h2>
            <p className="text-sm text-green-400">Active Lead</p>
          </div>

          <button
            onClick={summarizeConversation}
            disabled={summaryLoading}
            className="px-5 h-11 rounded-2xl bg-violet-500/20 border border-violet-500/20 hover:bg-violet-500/30 transition-all text-sm font-medium"
          >
            {summaryLoading ? "Analyzing..." : "✨ Summarize Chat"}
          </button>
        </div>

        {/* Summary Modal Section */}
        {summary && (
          <div className="mx-6 mt-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {aiTemperature === "Hot" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-400 font-semibold text-xs">
                    🔥 Hot Lead ({aiScore})
                  </div>
                )}
                {aiTemperature === "Warm" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-semibold text-xs">
                    🟡 Warm Lead ({aiScore})
                  </div>
                )}
                {aiTemperature === "Cold" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-400 font-semibold text-xs">
                    🔴 Cold Lead ({aiScore})
                  </div>
                )}
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
                <h3 className="font-semibold text-violet-300">
                  AI Conversation Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">
                      Summary
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">
                      AI Score
                    </p>
                    <p className="text-2xl font-bold text-violet-300">
                      {aiScore ?? 0}/100
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">
                      Recommended Action
                    </p>
                    <p className="text-sm text-white/80">{aiNextAction}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 mb-1 font-semibold">
                      AI Reasoning
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {aiReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          id="chat-container"
          className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "agent" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[600px] rounded-2xl px-4 py-3 ${
                  message.sender === "agent"
                    ? "bg-violet-600"
                    : "bg-white/10"
                }`}
              >
                <p className="text-sm">{message.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-5 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={generateAiReply}
              disabled={aiLoading}
              className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/30 transition-all"
            >
              <Sparkles
                size={20}
                className={aiLoading ? "animate-spin" : ""}
              />
            </button>

            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none"
            />

            <button
              onClick={sendMessage}
              className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* AI Suggestion Modal overlay */}
        {showAiSuggestion && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-[600px] rounded-3xl bg-[#0f172a] border border-violet-500/20 p-6">
              <h2 className="text-xl font-semibold mb-4">
                AI Follow-Up Suggestion
              </h2>

              <textarea
                value={aiSuggestion}
                onChange={(e) => setAiSuggestion(e.target.value)}
                className="w-full h-40 rounded-xl bg-black/20 border border-white/10 p-4 outline-none"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowAiSuggestion(false)}
                  className="px-5 py-2 rounded-xl border border-white/10 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedLead) return;
                    try {
                      const response = await fetch("/api/send-whatsapp", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          phone: selectedLead.phone,
                          message: aiSuggestion,
                        }),
                      });

                      const result = await response.json();
                      console.log("AI Follow-up Sent:", result);

                      await supabase.from("messages").insert({
                        lead_id: selectedLead.id,
                        sender: "agent",
                        message: aiSuggestion,
                      });

                      loadMessages(selectedLead.id);
                      setShowAiSuggestion(false);
                    } catch (err) {
                      console.error("AI Follow-up Error:", err);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 transition-colors"
                >
                  🚀 Send WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* --- END OF PASTED CODE --- */}
        {/* AI Copilot */}

<div
  className="
  w-[320px]
  border-l
  border-white/10
  bg-white/[0.02]
  backdrop-blur-xl
  p-5
  overflow-y-auto
  "
>

  <h2 className="text-lg font-semibold mb-5">
    🤖 AI Copilot
  </h2>

  <div className="space-y-4">

    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10">
      <p className="text-xs text-white/50 mb-1">
        AI Score
      </p>

      <p className="text-3xl font-bold text-violet-400">
        {aiScore ?? "--"}
      </p>
    </div>

    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10">
      <p className="text-xs text-white/50 mb-1">
        Temperature
      </p>

      <p className="font-semibold">
        {aiTemperature || "Not Analyzed"}
      </p>
    </div>

    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10">
      <p className="text-xs text-white/50 mb-2">
        Summary
      </p>

      <p className="text-sm text-white/80">
        {summary || "Run AI Summary"}
      </p>
    </div>

    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10">
      <p className="text-xs text-white/50 mb-2">
        Recommended Action
      </p>

      <p className="text-sm text-green-400">
        {aiNextAction || "Awaiting analysis"}
      </p>
    </div>

    <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/10">
      <p className="text-xs text-white/50 mb-2">
        AI Reasoning
      </p>

      <p className="text-sm text-white/70">
        {aiReason || "Run AI Summary"}
      </p>
    </div>

  </div>

</div>
        
      </div>
      
    );
  }