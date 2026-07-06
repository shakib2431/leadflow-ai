

import { CheckCircle2, MessageSquare } from "lucide-react";

export function ProjectUpdates({ leadId }: { leadId: string }) {
  // Hardcoded for UI visualization. Later, map this from your `lead_timeline` table.
  const updates = [
    { title: "Scope of Work Approved", date: "Today, 10:00 AM", type: "system", author: "Aman" },
    { title: "Discovery Call Completed", date: "Yesterday", type: "meeting", author: "Imran" }
  ];

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
      <h2 className="text-lg font-medium text-white mb-6">Recent Updates</h2>
      
      <div className="space-y-6">
        {updates.map((update, i) => (
          <div key={i} className="flex gap-4 relative">
            {/* Vertical Line */}
            {i !== updates.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-white/5" />
            )}
            
            <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
              {update.type === 'system' ? 
                <CheckCircle2 size={12} className="text-emerald-500" /> : 
                <MessageSquare size={12} className="text-violet-400" />
              }
            </div>
            
            <div className="flex-1 pb-1">
              <p className="text-sm font-medium text-zinc-200">{update.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500">{update.date}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-xs text-zinc-500">by {update.author}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}