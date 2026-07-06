

import { useEffect, useState } from "react";
import { Flame, Phone } from "lucide-react";

import { fetchHotLeads } from "@/lib/dashboard";
import { Lead } from "@/lib/leads";

export default function HotLeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHotLeads() {
      try {
        const data = await fetchHotLeads();

        setLeads(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadHotLeads();
  }, []);

  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-6"
      style={{ background: "#0d0d14" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Hot Leads
          </h2>

          <p className="text-sm text-white/40 mt-1">
            High priority prospects
          </p>
        </div>

        <div className="p-2 rounded-xl bg-orange-500/10">
          <Flame
            size={18}
            className="text-orange-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-16 rounded-xl bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-10 text-white/40 text-sm">
          No hot leads found
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-orange-500/10 bg-orange-500/[0.03] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">
                    {lead.full_name}
                  </h3>

                  <p className="text-xs text-white/40 mt-1">
                    {lead.email}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-orange-400 text-xs">
                  <Phone size={12} />
                  {lead.phone}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}