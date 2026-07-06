

import { useState } from "react";
import { Search, Filter } from "lucide-react";

export type FilterConfig = {
  id: string;
  label: string;
  type: "select" | "search" | "date" | "multiselect";
  options?: { label: string; value: string }[];
  placeholder?: string;
  value?: string | string[];
  onChange: (value: any) => void;
};

interface HRMSHeaderWithFiltersProps {
  title: string;
  subtitle?: string;
  tabs?: { label: string; id: string; active: boolean; onClick: () => void }[];
  filters?: FilterConfig[];
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export default function HRMSHeaderWithFilters({
  title,
  subtitle,
  tabs,
  filters = [],
  actions,
  searchPlaceholder = "Search...",
  onSearch,
}: HRMSHeaderWithFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const activeFilterCount = filters.filter((f) => f.value && (Array.isArray(f.value) ? f.value.length > 0 : f.value)).length;

  return (
    <div className="sticky top-0 z-40 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      {/* Title Section */}
      <div className="bg-gradient-to-r from-[#f8faff] via-white to-[#f5f9ff] px-4 py-3 sm:px-5">
        <h1 className="text-[21px] font-semibold tracking-tight text-[#0f172a]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-[#64748b]">{subtitle}</p>}
      </div>

      {/* Tabs and Actions Row */}
      {(tabs || actions) && (
        <div className="flex items-center justify-between gap-3 border-t border-[#eef2f7] px-4 py-2.5 sm:px-5">
          {tabs && (
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                    tab.active
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Filter & Search Row */}
      {(filters.length > 0 || onSearch) && (
        <div className="border-t border-[#eef2f7] bg-[#f8fafc] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            {onSearch && (
              <div className="relative min-w-[230px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#a5b4fc] focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}

            {/* Filters - Desktop */}
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              {filters.map((filter) => (
                <div key={filter.id}>
                  {filter.type === "select" && (
                    <select
                      value={filter.value as string}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="h-10 min-w-[150px] rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#a5b4fc] focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">{filter.label}</option>
                      {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {filter.type === "date" && (
                    <input
                      type="date"
                      value={filter.value as string}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="h-10 rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#a5b4fc] focus:ring-2 focus:ring-indigo-100"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Filter Button */}
            {filters.length > 0 && (
              <button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="flex items-center gap-2 rounded-xl border border-[#dbe3ef] bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 md:hidden"
              >
                <Filter size={16} />
                Filters {activeFilterCount > 0 && <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}
              </button>
            )}
          </div>

          {/* Mobile Filter Panel */}
          {mobileFiltersOpen && filters.length > 0 && (
            <div className="mt-4 space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-4 md:hidden">
              {filters.map((filter) => (
                <div key={filter.id}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{filter.label}</label>
                  {filter.type === "select" && (
                    <select
                      value={filter.value as string}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="">All</option>
                      {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
