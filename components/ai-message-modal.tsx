"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (
    type: string,
    customPrompt?: string
  ) => void;
  loading: boolean;
}

const options = [
  "Sales Outreach",
  "Follow-up",
  "Pricing Reply",
  "Demo Booking",
];

export default function AiMessageModal({
  open,
  onClose,
  onGenerate,
  loading,
}: Props) {

  const [selected, setSelected] =
    useState("");

  const [customPrompt, setCustomPrompt] =
    useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f172a] p-6">

        <div className="flex items-center justify-between mb-6">

          <div>
            <h2 className="text-2xl font-bold text-white">
              AI Message Generator
            </h2>

            <p className="text-white/40 text-sm mt-1">
              Generate high-converting sales messages
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/40 hover:text-white"
          >
            <X size={20} />
          </button>

        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">

          {options.map((option) => (

            <button
              key={option}
              onClick={() => setSelected(option)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selected === option
                  ? "border-violet-500 bg-violet-500/20 text-white"
                  : "border-white/10 bg-black/20 text-white/70 hover:border-violet-500/30"
              }`}
            >
              {option}
            </button>

          ))}

        </div>

        <textarea
          placeholder="Custom instructions (optional)..."
          value={customPrompt}
          onChange={(e) =>
            setCustomPrompt(e.target.value)
          }
          className="w-full h-32 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none resize-none"
        />

        <button
          onClick={() =>
            onGenerate(
              selected,
              customPrompt
            )
          }
          disabled={loading}
          className="w-full mt-5 h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >

          <Sparkles
            size={18}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          {loading
            ? "Generating..."
            : "Generate AI Message"}

        </button>

      </div>
    </div>
  );
}