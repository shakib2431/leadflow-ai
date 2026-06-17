"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (subject: string, body: string) => void;
  loading: boolean;
  leadEmail?: string;
}

export default function EmailModal({ open, onClose, onSend, loading, leadEmail }: EmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Clear fields when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSubject("");
      setBody("");
    }
  }, [open]);

  async function generateEmail() {
  try {
    setAiLoading(true);

    const res = await fetch(
      "/api/generate-email",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email: leadEmail,
        }),
      }
    );

    const data =
      await res.json();

    setSubject(data.subject || "");
    setBody(data.message || "");

  } catch (err) {
    console.error(err);
  } finally {
    setAiLoading(false);
  }
}
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0d0d14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Compose Email</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <button
  onClick={generateEmail}
  disabled={aiLoading}
  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium"
>
  {aiLoading
    ? "Generating..."
    : "🤖 Generate AI Email"}
</button>
            <label className="block text-sm text-white/40 mb-2">To</label>
            <input
              type="text"
              disabled
              value={leadEmail || "No email available"}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white/50 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/40 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-white/40 mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your email message..."
              className="w-full h-40 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(subject, body)}
            disabled={loading || !subject.trim() || !body.trim()}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}