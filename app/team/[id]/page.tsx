"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, Mail, Building2, CheckCircle2, Circle, FileText, Calendar, Send, Clock, Upload, Trash2, DollarSign, Eye, X } from "lucide-react";
import EditEmployeeModal from "@/components/edit-employee-modal";

export default function EmployeeProfilePage() {
  const params = useParams();
  const id = params.id as string;
  
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // NEW STATE
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState([
    { id: 'contract', title: 'Sign Employment Contract', status: 'action_required', type: 'send_doc' },
    { id: 'id', title: 'Upload Government ID', status: 'pending_employee', type: 'upload' },
    { id: 'handbook', title: 'Review Employee Handbook', status: 'pending_employee', type: 'review' }
  ]);

  const fetchEmployeeData = async () => {
    if (!id) return;
    const { data: empData } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
    if (empData) setEmployee(empData);

    const { data: docData } = await supabase.from("employee_documents").select("*").eq("employee_id", id).order("created_at", { ascending: false });
    if (docData) setDocuments(docData);

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const handleSendContract = async (taskId: string) => {
    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: 'sending' } : task));

    try {
      const response = await fetch('/api/hr/send-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employee.id,
          email: employee.email,
          name: employee.full_name,
          salary: employee.salary,
          role: employee.role
        })
      });

      if (response.ok) {
        setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: 'sent' } : task));
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      alert("Backend error: Could not send contract.");
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: 'action_required' } : task));
    }
  };

  // Mark a task as manually completed by HR
  const handleMarkComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'completed' } : task
    ));
  };

  // Send an automated reminder email to the employee
  const handleNudge = (taskId: string) => {
    alert(`Automated reminder email sent to ${employee.email}!`);
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}-${Math.random()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage.from('hr-docs').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('hr-docs').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('employee_documents').insert([{
        employee_id: id,
        file_name: file.name,
        file_path: publicUrlData.publicUrl
      }]);
      if (dbError) throw dbError;

      fetchEmployeeData();
    } catch (error) {
      alert("Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteDocument = async (docId: string, fileName: string) => {
    await supabase.from('employee_documents').delete().eq("id", docId);
    fetchEmployeeData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-white/40 bg-[#07070a]">Loading profile...</div>;
  if (!employee) return <div className="p-10 text-white bg-[#07070a] h-screen">Employee not found.</div>;

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white">
      <Link href="/team" className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Directory
      </Link>
      
      <header className="mb-10 flex items-start justify-between">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center shadow-xl">
            <span className="text-4xl font-bold text-violet-300">{employee.full_name?.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{employee.full_name}</h1>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-white/60"><Briefcase size={14}/> {employee.role}</span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5 text-white/60"><Building2 size={14}/> {employee.department}</span>
              <span className="text-white/20">•</span>
              <span className={`px-2 py-0.5 rounded-full uppercase tracking-widest text-[10px] border ${
                employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {employee.status}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-sm transition-colors font-bold"
        >
          Edit Profile
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
            <h3 className="font-bold mb-6 flex items-center gap-2 text-lg">
              <CheckCircle2 className="text-violet-400" size={20} /> Onboarding Checklist
            </h3>
            
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="text-emerald-500" size={20} />
                    ) : (
                      <Circle className="text-white/20" size={20} />
                    )}
                    <span className={`font-medium ${task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'}`}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* NEW PREVIEW BUTTON */}
                    {task.status === 'action_required' && task.type === 'send_doc' && (
                      <>
                        <button 
                          onClick={() => setIsPreviewModalOpen(true)}
                          className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/10"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        <button 
                          onClick={() => handleSendContract(task.id)}
                          className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Send size={12} /> Send Contract
                        </button>
                      </>
                    )}
                    {task.status === 'sending' && (
                      <span className="flex items-center gap-1.5 text-[10px] bg-violet-500/20 text-violet-400 px-2 py-1 rounded-md uppercase font-bold border border-violet-500/20">
                         <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Sending...
                      </span>
                    )}
                    {task.status === 'sent' && (
                      <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md uppercase font-bold border border-emerald-500/20">
                        <Clock size={12} /> Sent (Awaiting Sign)
                      </span>
                    )}
                 {/* Updated Pending Employee State */}
                    {task.status === 'pending_employee' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-md uppercase font-bold border border-amber-500/20">
                          Waiting on Employee
                        </span>
                        
                        {/* Send Reminder Button */}
                        <button 
                          onClick={() => handleNudge(task.id)}
                          className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Nudge
                        </button>
                        
                        {/* Manual Override / Verify Button */}
                        <button 
                          onClick={() => handleMarkComplete(task.id)}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-white/40">Details</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-white/80">
                <Mail size={16} className="text-white/40" /> {employee.email}
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Calendar size={16} className="text-white/40" /> 
                <span className="text-white/40 w-20">Start Date:</span> 
                {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : 'Not set'}
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <DollarSign size={16} className="text-white/40" /> 
                <span className="text-white/40 w-20">Salary:</span> 
                {employee.salary ? `₹${employee.salary.toLocaleString()}` : 'Not set'}
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
                <FileText size={16}/> Documents Vault
              </h3>
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.png,.jpg" />

            {documents.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()} className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-black/20 hover:bg-white/[0.02] cursor-pointer transition-colors">
                {isUploading ? (
                  <p className="text-sm text-violet-400 font-medium">Uploading...</p>
                ) : (
                  <><p className="text-sm text-white/40 mb-2">No documents uploaded</p><button className="text-violet-400 text-sm font-medium flex items-center gap-2 mx-auto"><Upload size={14} /> Upload Document</button></>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <a href={doc.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-violet-400 transition-colors truncate">
                      <FileText size={16} className="text-white/40 flex-shrink-0" />
                      <span className="text-sm truncate">{doc.file_name}</span>
                    </a>
                    <button onClick={() => deleteDocument(doc.id, doc.file_name)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full mt-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl text-xs font-bold text-white/60 transition-colors flex items-center justify-center gap-2">
                  {isUploading ? "Uploading..." : <><Upload size={14} /> Upload Another</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditEmployeeModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} employee={employee} onEmployeeUpdated={fetchEmployeeData} />

      {/* NEW: CONTRACT PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-black w-full max-w-2xl h-[80vh] flex flex-col rounded-md shadow-2xl overflow-hidden font-serif">
            {/* Modal Toolbar */}
            <div className="bg-[#0d0e12] border-b border-white/10 p-4 flex justify-between items-center text-white font-sans shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText size={16} className="text-violet-400" />
                Employment_Agreement_{employee.full_name?.replace(/\s+/g, '_')}.pdf
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* The Document View */}
            <div className="flex-1 overflow-y-auto p-12 bg-[#f4f4f5]">
              <div className="max-w-xl mx-auto bg-white p-10 shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-center mb-8 uppercase tracking-widest">Employment Agreement</h1>
                
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  This Employment Agreement (the "Agreement") is made effective as of <strong>{new Date().toLocaleDateString()}</strong>, by and between <strong>LeadFlow AI</strong> (the "Company") and <strong>{employee.full_name}</strong> (the "Employee").
                </p>

                <h3 className="font-bold mt-6 mb-2 text-sm uppercase">1. Position and Duties</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  The Company agrees to employ the Employee in the role of <strong>{employee.role}</strong>, operating within the <strong>{employee.department}</strong> department. The Employee's designated start date is <strong>{employee.start_date ? new Date(employee.start_date).toLocaleDateString() : 'TBD'}</strong>.
                </p>

                <h3 className="font-bold mt-6 mb-2 text-sm uppercase">2. Compensation</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-800">
                  As compensation for the services provided, the Company shall pay the Employee an annual base salary of <strong>₹{employee.salary ? employee.salary.toLocaleString() : '0'}</strong>, subject to applicable taxes and withholdings, payable in accordance with the Company's standard payroll schedule.
                </p>

                <h3 className="font-bold mt-6 mb-2 text-sm uppercase">3. At-Will Employment</h3>
                <p className="mb-10 text-sm leading-relaxed text-gray-800">
                  Employment with the Company is "at-will." This means that either the Employee or the Company may terminate the employment relationship at any time, with or without cause, and with or without notice.
                </p>

                <div className="mt-12 flex justify-between items-end border-t border-gray-200 pt-8">
                  <div>
                    <div className="border-b border-gray-400 w-48 mb-2"></div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Company Representative</p>
                  </div>
                  <div>
                    <div className="border-b border-gray-400 w-48 mb-2"></div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Employee Signature</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#0d0e12] p-4 flex justify-end gap-3 font-sans shrink-0 border-t border-white/10">
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  handleSendContract('contract');
                }}
                className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all"
              >
                <Send size={14} /> Send for Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}