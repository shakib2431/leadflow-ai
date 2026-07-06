

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Download, FileText, Loader2, FolderLock, UploadCloud, RefreshCw } from "lucide-react";

export function DocumentCenter({ leadId }: { leadId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch files from the secure folder
  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from('client-documents')
      .list(leadId);

    if (data && !error) {
      setFiles(data.filter(file => file.name !== '.emptyFolderPlaceholder'));
    } else {
      console.error("Error fetching documents:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (leadId) fetchDocuments();
  }, [leadId]);

  // 2. Handle Client Uploading a File Securely
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);

    // Sanitize file name to avoid path issues
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `${leadId}/${sanitizedName}`;

    const { error } = await supabase.storage
      .from('client-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Overwrites if file name is identical
      });

    if (error) {
      alert(`Upload failed: ${error.message}`);
      console.error(error);
    } else {
      // Refresh the file list immediately after successful upload
      await fetchDocuments();
      
      // Optional: Log this upload to your internal CRM activity log table
      await supabase.from("activity_log").insert([{
        lead_id: leadId,
        activity_type: "document",
        title: "Client Uploaded Document",
        description: `Uploaded file: ${file.name}`
      }]);
    }
    setUploading(false);
  };

  // 3. Handle Secure Downloading
  const handleDownload = async (fileName: string) => {
    setDownloading(fileName);
    const { data, error } = await supabase.storage
      .from('client-documents')
      .download(`${leadId}/${fileName}`);

    if (error) {
      alert("Unable to download file.");
      console.error(error);
    } else if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  };

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <FolderLock size={18} className="text-zinc-400" /> Secure Document Vault
        </h2>
        <button 
          onClick={fetchDocuments}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Refresh Files"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Interactive Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="mb-6 border border-dashed border-white/10 rounded-2xl p-6 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUpload} 
          className="hidden" 
          accept=".pdf,.docx,.png,.jpg,.jpeg,.zip"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-violet-400" />
            <span className="text-xs text-zinc-400 font-medium">Encrypting and uploading asset...</span>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-zinc-800/50 group-hover:scale-105 transition-transform border border-white/5 mb-3">
              <UploadCloud size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Upload project documents</p>
            <p className="text-xs text-zinc-600 mt-1">PDF, DOCX, PNG, JPG, or ZIP up to 25MB</p>
          </>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-500">
            <Loader2 className="animate-spin mr-2" size={16} />
            <span className="text-xs">Decrypting folder...</span>
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-zinc-600 italic text-center py-4">No active assets stored in this vault.</p>
        ) : (
          files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={16} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-zinc-300 truncate" title={file.name}>
                  {file.name}
                </span>
              </div>
              <button 
                onClick={() => handleDownload(file.name)}
                disabled={downloading === file.name}
                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloading === file.name ? (
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                ) : (
                  <Download size={14} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}