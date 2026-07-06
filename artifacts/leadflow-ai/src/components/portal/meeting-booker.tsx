

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, Clock, Video, ArrowRight, Loader2 } from "lucide-react";

export function MeetingScheduler({ leadId }: { leadId?: string }) {
  const [nextMeeting, setNextMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔴 CHANGE THIS TO YOUR ACTUAL CALENDLY OR CAL.COM LINK
  const SCHEDULING_LINK = "https://calendly.com"; 

  useEffect(() => {
    async function fetchNextMeeting() {
      // If leadId is missing, stop loading and return early
      if (!leadId) {
        setLoading(false);
        return; 
      }
      
      try {
        const { data, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("lead_id", leadId)
          .gte("meeting_date", new Date().toISOString()) // Only future meetings
          .order("meeting_date", { ascending: true })
          .limit(1)
          .single();

        if (!error && data) {
          setNextMeeting(data);
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
      } finally {
        // ALWAYS turn off the spinner, even if there's an error or no meetings
        setLoading(false);
      }
    }
    
    fetchNextMeeting();
  }, [leadId]);

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />

      <h2 className="text-lg font-medium text-white flex items-center gap-2 mb-6">
        <CalendarIcon size={18} className="text-zinc-400" /> Meetings
      </h2>

      {/* Dynamic Next Sync Card */}
      {loading ? (
        <div className="flex justify-center py-4 mb-4"><Loader2 size={16} className="animate-spin text-zinc-500" /></div>
      ) : nextMeeting ? (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-4">
          <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Next Sync</h3>
          <p className="text-sm font-medium text-white mb-1">{nextMeeting.title}</p>
          <div className="flex items-center gap-4 text-xs text-emerald-400/70">
            <span className="flex items-center gap-1">
              <CalendarIcon size={12} /> 
              {new Date(nextMeeting.meeting_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> 
              {new Date(nextMeeting.meeting_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button 
            onClick={() => window.open(nextMeeting.meet_url, "_blank")}
            disabled={!nextMeeting.meet_url}
            className="mt-4 w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Video size={14} /> {nextMeeting.meet_url ? "Join Google Meet" : "Link pending"}
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-4 text-center">
          <p className="text-xs text-zinc-500">No upcoming meetings scheduled.</p>
        </div>
      )}

      {/* Action Button */}
      <button 
        onClick={() => window.open(SCHEDULING_LINK, "_blank")}
        className="w-full py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-zinc-300 text-sm font-medium transition-colors flex items-center justify-between px-4 group"
      >
        Schedule Ad-hoc Call <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}