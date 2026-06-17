"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { UploadCloud, FileText, ArrowRight, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import Link from "next/link";

const DB_FIELDS = [
  { value: "full_name", label: "Full Name" },
  { value: "email", label: "Email Address" },
  { value: "phone", label: "Phone Number" },
  { value: "status", label: "Lead Status" },
  { value: "source", label: "Lead Source" },
];

export default function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip' | 'create'>('update');
  
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setFile(uploaded);

    Papa.parse(uploaded, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);
        
        // Auto-map obvious fields
        const autoMap: Record<string, string> = {};
        (results.meta.fields || []).forEach(header => {
          const lower = header.toLowerCase();
          if (lower.includes('name')) autoMap[header] = 'full_name';
          if (lower.includes('mail')) autoMap[header] = 'email';
          if (lower.includes('phone') || lower.includes('mobile')) autoMap[header] = 'phone';
          if (lower.includes('status')) autoMap[header] = 'status';
          if (lower.includes('source')) autoMap[header] = 'source';
        });
        setFieldMap(autoMap);
        setStep(2);
      }
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setStep(4);

    // Transform raw CSV data using the field mapping
    const mappedData = csvData.map(row => {
      const newRow: any = {};
      Object.entries(fieldMap).forEach(([csvCol, dbField]) => {
        if (dbField && row[csvCol]) {
          newRow[dbField] = row[csvCol];
        }
      });
      return newRow;
    });

    try {
      const res = await fetch('/api/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file?.name, 
          mappedData, 
          duplicateStrategy 
        })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      } else {
        alert("Import failed: " + data.error);
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="w-8 h-8 text-indigo-500" /> Data Import Center
            </h1>
            <p className="text-gray-400 mt-2">Bulk import leads and update pipeline records securely.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition">
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="bg-[#0d0e12] border border-white/10 border-dashed rounded-3xl p-16 text-center hover:border-indigo-500/50 transition relative">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <UploadCloud className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Upload CSV File</h3>
            <p className="text-gray-400 text-sm">Drag and drop your file here, or click to browse.</p>
          </div>
        )}

        {/* STEP 2: FIELD MAPPING */}
        {step === 2 && (
          <div className="bg-[#0d0e12] border border-white/10 rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6">Map Columns to CRM Fields</h2>
            <div className="space-y-4 mb-8">
              {csvHeaders.map(header => (
                <div key={header} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-1/3 text-sm font-medium text-gray-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" /> {header}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                  <select 
                    value={fieldMap[header] || ""}
                    onChange={(e) => setFieldMap({...fieldMap, [header]: e.target.value})}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="">-- Do Not Import --</option>
                    {DB_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition">Cancel</button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 transition text-white">Review Import &rarr;</button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & SETTINGS */}
        {step === 3 && (
          <div className="bg-[#0d0e12] border border-white/10 rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6">Import Settings & Preview</h2>
            
            <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl mb-8">
              <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> Duplicate Handling
              </h3>
              <p className="text-xs text-orange-200/70 mb-4">How should we handle leads that already exist (matching Email or Phone)?</p>
              <div className="flex gap-4">
                {['update', 'skip', 'create'].map((strategy) => (
                  <label key={strategy} className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${duplicateStrategy === strategy ? 'bg-orange-500/20 border-orange-500 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'}`}>
                    <input type="radio" name="duplicate" value={strategy} checked={duplicateStrategy === strategy} onChange={() => setDuplicateStrategy(strategy as any)} className="hidden" />
                    <span className="capitalize font-bold text-sm block mb-1">{strategy === 'create' ? 'Create Duplicate' : strategy}</span>
                    <span className="text-[10px] opacity-70">
                      {strategy === 'update' ? 'Overwrite existing records' : strategy === 'skip' ? 'Ignore matching rows' : 'Create a brand new record'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 mb-8">
              <p className="text-sm text-gray-300">Ready to process <strong className="text-white">{csvData.length}</strong> rows.</p>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition">Back</button>
                <button onClick={handleImport} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 transition text-white shadow-lg shadow-emerald-500/20">Execute Import</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PROGRESS & RESULTS */}
        {step === 4 && (
          <div className="bg-[#0d0e12] border border-white/10 rounded-3xl p-12 text-center shadow-xl">
            {importing ? (
              <div className="py-10">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-6"></div>
                <h2 className="text-xl font-bold mb-2">Processing Data Pipeline...</h2>
                <p className="text-gray-400 text-sm">Please do not close this window.</p>
              </div>
            ) : results ? (
              <div className="animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-2">Import Complete</h2>
                <p className="text-gray-400 mb-8">Your CRM data has been successfully updated.</p>
                
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-emerald-400">{results.successCount}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/70 mt-1">Succeeded</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-orange-400">{results.duplicateCount}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-orange-400/70 mt-1">Duplicates</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                    <p className="text-3xl font-bold text-red-400">{results.failedCount}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-red-400/70 mt-1">Failed</p>
                  </div>
                </div>

                <Link href="/dashboard" className="px-8 py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 transition text-white">
                  Return to Dashboard
                </Link>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}