

import { useState } from "react";
import { ExternalLink, Copy, Check, ShieldCheck } from "lucide-react";

export function PortalAccessCard({ portalToken, clientName }: { portalToken: string, clientName: string }) {
  const [copied, setCopied] = useState(false);
  
  // Dynamically generates the exact URL based on your current domain (localhost or live)
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/client/${portalToken}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={18} className="text-emerald-400" />
        <h3 className="text-sm font-medium text-white">Client Success Workspace</h3>
      </div>
      
      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
        This is the secure, private link for {clientName}. Do not share this link publicly.
      </p>

      <div className="flex items-center gap-3">
        <button 
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/5 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          {copied ? "Copied to Clipboard" : "Copy Secure Link"}
        </button>

        <button 
          onClick={() => window.open(portalUrl, "_blank")}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
        >
          Preview <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}