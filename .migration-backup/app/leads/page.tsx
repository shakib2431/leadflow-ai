"use client";


import AddLeadModal from "@/components/add-lead-modal";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar";
import TopNavbar from "@/components/top-navbar";

import {
  fetchLeads,
  Lead,
  updateLeadStatus,
} from "@/lib/leads";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
  useState("all");
  const [openAddModal, setOpenAddModal] =
  useState(false);
  const router = useRouter();
  async function handleStatusChange(
  id: string,
  status: string
) {
  try {
    await updateLeadStatus(id, status);

    const updated = leads.map((lead) =>
      lead.id === id
        ? { ...lead, status }
        : lead
    );

    setLeads(updated);
    setFilteredLeads(updated);
  } catch (error) {
    console.error(error);
  }
}


async function loadLeads() {
  try {
    const data = await fetchLeads();

    setLeads(data);
    setFilteredLeads(data);

  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadLeads();
}, []);

 useEffect(() => {
  let filtered = leads.filter((lead) =>
    lead.full_name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (statusFilter !== "all") {
    filtered = filtered.filter(
      (lead) =>
        lead.status === statusFilter
    );
  }

  setFilteredLeads(filtered);

}, [search, statusFilter, leads]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
  <div className="flex h-screen overflow-hidden">

    {sidebarOpen && (
      <div
        className="mobile-overlay lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}

    <Sidebar
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
    />

    <div className="flex-1 flex flex-col overflow-hidden">
      <TopNavbar
  onMenuClick={() => setSidebarOpen(true)}

/>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Leads
            </h1>

            <p className="text-white/40 mt-1">
              Manage your CRM leads
            </p>
          </div>
        </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">

  <div className="relative flex-1">
    <Search
      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
      size={18}
    />

    <input
      type="text"
      placeholder="Search leads..."
      value={search}
      onChange={(e) =>
        setSearch(e.target.value)
      }
      className="w-full bg-[#111827] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-violet-500"
    />
  </div>

  <select
    value={statusFilter}
    onChange={(e) =>
      setStatusFilter(e.target.value)
    }
    className="bg-[#111827] border border-white/10 rounded-2xl px-4 py-4 text-white outline-none focus:border-violet-500"
  >
    <option value="all">
      All Statuses
    </option>

    <option value="new">
      New
    </option>

    <option value="warm">
      Warm
    </option>

    <option value="hot">
      Hot
    </option>

    <option value="converted">
      Converted
    </option>
  </select>

</div>

        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-white/40">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-10 text-center text-white/40">
              No leads found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="text-left px-6 py-4 text-white/40 text-sm">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-white/40 text-sm">
  AI Score
</th>

                  <th className="text-left px-6 py-4 text-white/40 text-sm">
                    Phone
                  </th>

                  <th className="text-left px-6 py-4 text-white/40 text-sm">
                    Email
                  </th>

                  <th className="text-left px-6 py-4 text-white/40 text-sm">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
  {filteredLeads.map((lead) => (
    <tr
      key={lead.id}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="border-t border-white/[0.05] hover:bg-white/[0.03] transition-all cursor-pointer"
    >
      <td className="px-6 py-4">
        {lead.full_name}
      </td>
      <td className="px-6 py-4">

  {(lead.ai_score || 0) >= 70 ? (
    <span className="text-red-400">
      🔥 {lead.ai_score || 0}
    </span>
  ) : (lead.ai_score || 0) >= 40 ? (
    <span className="text-yellow-400">
      🟡 {lead.ai_score || 0}
    </span>
  ) : (
    <span className="text-blue-400">
      ❄️ {lead.ai_score || 0}
    </span>
  )}

</td>

      <td className="px-6 py-4 text-white/60">
        {lead.phone}
      </td>

      <td className="px-6 py-4 text-white/60">
        {lead.email}
      </td>

    <td
  className="px-6 py-4"
  onClick={(e) => e.stopPropagation()}
>
        <select
          value={lead.status}
          onChange={(e) =>
            handleStatusChange(
              lead.id,
              e.target.value
            )
          }
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="new">New</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Unresponsive</option>
          <option value="converted">Converted</option>
        </select>
      </td>
    </tr>
  ))}
</tbody>
            </table>
          )}
            </div>
            </div>
      </main>
    </div>
  </div>
</div>
  );
}