"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

export interface ReportFilterState {
  dateRange: { start: string; end: string };
  businessEntity?: string;
  branch?: string;
  department?: string;
  designation?: string;
  manager?: string;
  employmentType?: string;
  employeeStatus?: string;
  workMode?: string;
  shift?: string;
  location?: string;
  gender?: string;
  grade?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterState;
  onChange: (filters: ReportFilterState) => void;
  options?: {
    businessEntities?: Array<{ id: string; name: string }>;
    branches?: Array<{ id: string; name: string }>;
    departments?: Array<{ id: string; name: string }>;
    designations?: Array<{ id: string; name: string }>;
    managers?: Array<{ id: string; name: string }>;
    employmentTypes?: Array<{ id: string; name: string }>;
  };
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export function ReportFilters({
  filters,
  onChange,
  options = {},
  isExpanded = true,
  onToggleExpand,
}: ReportFiltersProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = isExpanded;

  const handleFilterChange = (key: keyof ReportFilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && (typeof v === "string" ? v !== "" : true)
  ).length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Filter Header */}
      <button
        onClick={() => {
          setLocalExpanded(!localExpanded);
          onToggleExpand?.(!localExpanded);
        }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-indigo-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`transition transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Filter Content */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) =>
                  handleFilterChange("dateRange", {
                    ...filters.dateRange,
                    start: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) =>
                  handleFilterChange("dateRange", {
                    ...filters.dateRange,
                    end: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Business Entity */}
            {options.businessEntities && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Business Entity
                </label>
                <select
                  value={filters.businessEntity || ""}
                  onChange={(e) =>
                    handleFilterChange("businessEntity", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Entities</option>
                  {options.businessEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Department */}
            {options.departments && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Department
                </label>
                <select
                  value={filters.department || ""}
                  onChange={(e) =>
                    handleFilterChange("department", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Departments</option>
                  {options.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Designation */}
            {options.designations && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Designation
                </label>
                <select
                  value={filters.designation || ""}
                  onChange={(e) =>
                    handleFilterChange("designation", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Designations</option>
                  {options.designations.map((des) => (
                    <option key={des.id} value={des.id}>
                      {des.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Employee Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Employee Status
              </label>
              <select
                value={filters.employeeStatus || ""}
                onChange={(e) =>
                  handleFilterChange("employeeStatus", e.target.value || undefined)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="probation">On Probation</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Work Mode
              </label>
              <select
                value={filters.workMode || ""}
                onChange={(e) =>
                  handleFilterChange("workMode", e.target.value || undefined)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Modes</option>
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() =>
                onChange({
                  dateRange: { start: "", end: "" },
                  businessEntity: undefined,
                  branch: undefined,
                  department: undefined,
                  designation: undefined,
                  manager: undefined,
                  employmentType: undefined,
                  employeeStatus: undefined,
                  workMode: undefined,
                  shift: undefined,
                  location: undefined,
                  gender: undefined,
                  grade: undefined,
                })
              }
              className="mt-4 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
