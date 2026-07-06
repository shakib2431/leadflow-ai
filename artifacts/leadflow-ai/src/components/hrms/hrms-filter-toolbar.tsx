

import { ReportFilters, type ReportFilterState } from "../reports/components/report-filters";

export interface FilterConfig {
  [key: string]: any;
}

export interface FilterField {
  key: string;
  label: string;
}

interface HRMSFilterToolbarProps {
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
  fields: FilterField[];
  onExport?: () => void;
  onReset?: () => void;
  placeholder?: string;
}

export default function HRMSFilterToolbar({
  filters,
  onFilterChange,
  fields,
  onExport,
  onReset,
  placeholder = "Search...",
}: HRMSFilterToolbarProps) {
  // Use existing ReportFilters component
  return (
    <div className="px-8 py-4 bg-white border-t border-b border-slate-200">
      <ReportFilters 
        filters={filters as ReportFilterState}
        onChange={onFilterChange}
      />
    </div>
  );
}
