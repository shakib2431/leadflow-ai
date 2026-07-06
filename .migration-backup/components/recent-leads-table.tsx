"use client";
import { ExternalLink, Copy } from "lucide-react";
import { Lead } from "@/lib/leads";
import { ArrowUpRight, MessageCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RecentLeadsTableProps {
  leads: Lead[];
  loading: boolean;
}

export default function RecentLeadsTable({ leads, loading }: RecentLeadsTableProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "#0d0d14" }}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-white/10 rounded" />
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-14 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] p-10 text-center" style={{ background: "#0d0d14" }}>
        <h3 className="text-lg font-semibold text-white mb-2">No Leads Found</h3>
        <p className="text-white/40 text-sm">Your Supabase database is connected successfully.</p>
      </div>
    );
  }

  return (
    <div className="xl:col-span-2 rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "#0d0d14" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
          <p className="text-sm text-white/40 mt-1">{leads.length} entries found</p>
        </div>
        <button className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
          View all <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Table Container - Relative positioning needed for sticky column */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.04] whitespace-nowrap">
              {/* Reduced padding from px-6 to px-4 to save space */}
              <th className="text-xs font-medium text-white/30 px-4 py-4">Name</th>
              <th className="text-xs font-medium text-white/30 px-4 py-4">Phone</th>
              <th className="text-xs font-medium text-white/30 px-4 py-4">Status</th>
              <th className="text-xs font-medium text-white/30 px-4 py-4">Source</th>
              <th className="text-xs font-medium text-white/30 px-4 py-4">Last Contact</th>
              
              {/* STICKY HEADER */}
              <th className="text-xs font-medium text-white/30 px-4 py-4 sticky right-0 z-20 bg-[#0d0d14] shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.3)]">
                Workspace
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                // Added "group" here so we can sync the hover state with the sticky column
                className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-all cursor-pointer group whitespace-nowrap"
              >
                <td className="px-4 py-4">
                  <div className="font-medium text-white truncate max-w-[150px]" title={lead.full_name}>
                    {lead.full_name}
                  </div>
                </td>

                <td className="px-4 py-4 text-white/60 text-sm">{lead.phone}</td>

                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      lead.status === "hot"
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        : lead.status === "converted"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : lead.status === "cold"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MessageCircle size={14} /> {lead.source}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Clock size={14} />
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                  </div>
                </td>

                {/* STICKY DATA CELL */}
                <td className="px-4 py-4 sticky right-0 z-10 bg-[#0d0d14] group-hover:bg-[#15151c] transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/client/${lead.portal_token}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(lead.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-colors text-xs font-medium"
                    >
                      {copiedId === lead.id ? (
                        <span className="text-emerald-400 flex items-center gap-1">Copied!</span>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/client/${lead.portal_token}`, "_blank");
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                      title="Preview Workspace"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}