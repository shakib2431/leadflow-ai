"use client";

import { Lead } from "@/lib/leads";
import {
  ArrowUpRight,
  MessageCircle,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";



interface RecentLeadsTableProps {
  leads: Lead[];
  loading: boolean;
}

export default function RecentLeadsTable({
  leads,
  loading,
}: RecentLeadsTableProps) {
  const router = useRouter();
 



  if (loading) {
    return (
      <div
        className="rounded-2xl border border-white/[0.06] p-6"
        style={{ background: "#0d0d14" }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 bg-white/10 rounded" />

          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-14 rounded-xl bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    );
  }

 

  if (leads.length === 0) {
    return (
      <div
        className="rounded-2xl border border-white/[0.06] p-10 text-center"
        style={{ background: "#0d0d14" }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">
          No Leads Found
        </h3>

        <p className="text-white/40 text-sm">
          Your Supabase database is connected successfully.
        </p>
      </div>
    );
  }

  return (
    <div
      className="xl:col-span-2 rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: "#0d0d14" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Recent Leads
          </h2>

          <p className="text-sm text-white/40 mt-1">
            {leads.length} entries found
          </p>
        </div>

        <button className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
          View all
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left text-xs font-medium text-white/30 px-6 py-4">
                Name
              </th>

              <th className="text-left text-xs font-medium text-white/30 px-6 py-4">
                Phone
              </th>

              <th className="text-left text-xs font-medium text-white/30 px-6 py-4">
                Status
              </th>

              <th className="text-left text-xs font-medium text-white/30 px-6 py-4">
                Source
              </th>

              <th className="text-left text-xs font-medium text-white/30 px-6 py-4">
                Last Contact
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
             <tr
  key={lead.id}
  onClick={() =>
    router.push(`/leads/${lead.id}`)
  }
  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-all cursor-pointer"
>
                <td className="px-6 py-4">
                  <div className="font-medium text-white">
                    {lead.full_name}
                  </div>
                </td>

                <td className="px-6 py-4 text-white/60 text-sm">
                  {lead.phone}
                </td>

                <td className="px-6 py-4">
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

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MessageCircle size={14} />
                    {lead.source}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-white/40 text-sm">
                    <Clock size={14} />
                   {lead.created_at
  ? new Date(lead.created_at).toLocaleDateString()
  : "-"}
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