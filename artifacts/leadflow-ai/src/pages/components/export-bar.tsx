"use client";

import { FileText, Download, Mail, Share2, Printer } from "lucide-react";
import { useState } from "react";

interface ExportBarProps {
  reportName: string;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  onShare?: () => void;
  loading?: boolean;
}

export function ExportBar({
  reportName,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onPrint,
  onEmail,
  onShare,
  loading = false,
}: ExportBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{reportName}</p>
        <p className="text-xs text-slate-600">
          Last updated: {new Date().toLocaleString("en-IN")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
          >
            <Download size={16} />
            Export
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              {onExportCSV && (
                <button
                  onClick={() => {
                    onExportCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 transition"
                >
                  📊 Export as CSV
                </button>
              )}
              {onExportExcel && (
                <button
                  onClick={() => {
                    onExportExcel();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 transition"
                >
                  📈 Export as Excel
                </button>
              )}
              {onExportPDF && (
                <button
                  onClick={() => {
                    onExportPDF();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 transition"
                >
                  📄 Export as PDF
                </button>
              )}
              {onPrint && (
                <button
                  onClick={() => {
                    onPrint();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition"
                >
                  <Printer size={14} className="inline mr-2" />
                  Print
                </button>
              )}
            </div>
          )}
        </div>

        {/* Email */}
        {onEmail && (
          <button
            onClick={onEmail}
            disabled={loading}
            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition"
            title="Email Report"
          >
            <Mail size={16} />
          </button>
        )}

        {/* Share */}
        {onShare && (
          <button
            onClick={onShare}
            disabled={loading}
            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition"
            title="Share Report"
          >
            <Share2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
