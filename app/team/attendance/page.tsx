"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Calendar, CheckCircle, XCircle, Users, X, Palmtree, Tent } from "lucide-react";

// Seamlessly integrated upcoming regional holidays
const UPCOMING_HOLIDAYS = [
  { id: 1, name: "Independence Day", date: "15 Aug 2026", days: 1 },
  { id: 2, name: "Diwali", date: "08 Nov 2026", days: 1 }
];

export default function AttendancePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingPTO, setPendingPTO] = useState<any[]>([]);
  const [approvedPTO, setApprovedPTO] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showOutTodayModal, setShowOutTodayModal] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  async function fetchAttendanceData() {
    setLoading(true);

    // BUG FIX: Fetch all active AND onboarding employees (Exclude only Offboarding)
    const { data: empData } = await supabase
      .from("employees")
      .select("*")
      .neq("status", "Offboarding");
    if (empData) setEmployees(empData);

    const { data: pendingData } = await supabase
      .from("time_off_requests")
      .select("*, employees(full_name, role)")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });
    if (pendingData) setPendingPTO(pendingData);

    const today = new Date().toISOString().split('T')[0];
    const { data: outTodayData } = await supabase
      .from("time_off_requests")
      .select("*, employees(full_name, role)")
      .eq("status", "Approved")
      .lte("start_date", today)
      .gte("end_date", today);
    if (outTodayData) setApprovedPTO(outTodayData);

    setLoading(false);
  }

  const handleApprovePTO = async (id: string) => {
    setPendingPTO(prev => prev.filter(req => req.id !== id));
    const { error } = await supabase.from("time_off_requests").update({ status: "Approved" }).eq("id", id);
    if (error) {
      alert("Failed to approve PTO.");
      fetchAttendanceData(); 
    } else {
      fetchAttendanceData(); 
    }
  };

  const handleDenyPTO = async (id: string) => {
    setPendingPTO(prev => prev.filter(req => req.id !== id));
    await supabase.from("time_off_requests").update({ status: "Denied" }).eq("id", id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-white/40 bg-[#07070a]">Syncing attendance...</div>;

  // Safe math calculation to prevent negative numbers
  const activeCount = Math.max(0, employees.length - approvedPTO.length);

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white relative font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Time & Attendance</h1>
        <p className="text-white/40 mt-1">Monitor live employee status and manage time off requests.</p>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Active Now</p>
            <p className="text-3xl font-bold text-emerald-400">
              {activeCount}
              <span className="text-lg text-white/40 font-normal"> / {employees.length}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Clock className="text-emerald-400" size={24} />
          </div>
        </div>
        
        <div 
          onClick={() => setShowOutTodayModal(true)}
          className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl flex items-center justify-between cursor-pointer hover:border-amber-500/30 hover:bg-white/[0.02] transition-all group"
        >
          <div>
            <p className="text-white/40 group-hover:text-amber-400/70 transition-colors text-xs font-bold uppercase tracking-widest mb-1">On PTO Today</p>
            <p className="text-3xl font-bold text-amber-400">{approvedPTO.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
            <Calendar className="text-amber-400" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LIVE TEAM STATUS */}
        <div className="lg:col-span-2 p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl h-fit">
          <h3 className="font-bold mb-6 text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Clock size={16} /> Live Team Status
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Expected Schedule</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isOutToday = approvedPTO.some(pto => pto.employee_id === emp.id);
                  return (
                    <tr key={emp.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="font-medium text-white">{emp.full_name}</div>
                        <div className="text-xs text-white/40">{emp.role}</div>
                      </td>
                      <td className="py-4">
                        {isOutToday ? (
                           <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/20">
                             <Calendar size={10} /> On Leave
                           </span>
                        ) : (
                           <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-white/5 text-white/40 border-white/10">
                             Not Clocked In
                           </span>
                        )}
                      </td>
                      <td className="py-4 text-white/60">09:00 AM - 05:00 PM</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          
          {/* PENDING APPROVALS */}
          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
            <h3 className="font-bold mb-6 text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Calendar size={16} /> Pending Approvals
            </h3>
            <div className="space-y-4">
              {pendingPTO.map((request) => (
                <div key={request.id} className="p-4 bg-[#07070a] border border-white/5 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{request.employees?.full_name}</span>
                    <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{request.type}</span>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-2">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                  </p>
                  
                  {/* NEW: Leave Balance Indicator */}
                  <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg mb-4 border border-white/5">
                    <span className="text-xs text-white/40">Req: <strong className="text-white">{request.days_total} Days</strong></span>
                    <span className="text-xs text-white/40">Balance: <strong className="text-emerald-400">14 Days</strong></span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleApprovePTO(request.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleDenyPTO(request.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/20">
                      <XCircle size={14} /> Deny
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingPTO.length === 0 && (
                <p className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl bg-black/20">All caught up.</p>
              )}
            </div>
          </div>

          {/* NEW: COMPANY HOLIDAYS */}
          <div className="p-6 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-xl">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Palmtree size={16} /> Company Holidays
            </h3>
            <div className="space-y-3">
              {UPCOMING_HOLIDAYS.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                      <Tent size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/80">{holiday.name}</p>
                      <p className="text-xs text-white/40">{holiday.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white/40">{holiday.days} Day</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* OUT TODAY MODAL */}
      {showOutTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-amber-400" size={20} /> Team Out Today
              </h2>
              <button onClick={() => setShowOutTodayModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {approvedPTO.length === 0 ? (
                <p className="text-center text-white/40 py-4">Everyone is scheduled to be in today!</p>
              ) : (
                <div className="space-y-4">
                  {approvedPTO.map(pto => (
                    <div key={pto.id} className="p-4 border border-white/5 rounded-xl bg-white/[0.02]">
                      <h4 className="font-bold text-white mb-1">{pto.employees?.full_name}</h4>
                      <p className="text-xs text-white/40 mb-2">{pto.employees?.role}</p>
                      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 w-fit px-2 py-1 rounded">
                        <Calendar size={12} /> {pto.type} until {new Date(pto.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}