"use client";

import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

export function AiAssistant({ leadId, stage }: { leadId: string; stage: string }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: "Hello. I am your project AI. How can I assist you today?" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userText = query;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch('/api/client-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, leadId, stage })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection interrupted. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Sparkles size={16} className="text-violet-400" />
        </div>
        <h2 className="font-medium text-white">Project Assistant</h2>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20 rounded-tr-sm' 
                : 'bg-white/5 text-zinc-300 border border-white/5 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-sm flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/20 border-t border-white/5">
        <div className="relative flex items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about deliverables, invoices..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !query.trim()}
            className="absolute right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}