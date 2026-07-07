import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserPlus,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  FileBarChart,
  ChevronRight,
  TrendingUp,
  Download,
  Plus,
  ArrowRight,
  UserCheck,
  ClipboardList,
  Calendar,
  FileText,
  Mail,
  Video
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div 
      className="flex text-white font-sans selection:bg-indigo-500/30"
      style={{ width: 1600, height: 900, overflow: 'hidden', backgroundColor: '#080d1a', fontFamily: "'Inter', sans-serif" }}
    >
      {/* SIDEBAR - 180px */}
      <div className="w-[180px] h-full flex flex-col border-r border-white/[0.04]" style={{ backgroundColor: '#0f1629' }}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 gap-2 border-b border-white/[0.04]">
          <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
            <LayoutDashboard size={14} className="text-white" />
          </div>
          <div className="font-bold text-sm tracking-wide flex items-center gap-1.5">
            LeadFlow <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400">HRMS</span>
          </div>
        </div>

        {/* Nav Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 hide-scrollbar">
          
          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-slate-500 px-2 mb-1 tracking-wider uppercase">Overview</div>
            <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" active />
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-slate-500 px-2 mb-1 tracking-wider uppercase">Workforce</div>
            <NavItem icon={<Users size={16} />} label="Employees" />
            <NavItem icon={<Briefcase size={16} />} label="Recruitment" />
            <NavItem icon={<UserPlus size={16} />} label="Onboarding" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-slate-500 px-2 mb-1 tracking-wider uppercase">Employee</div>
            <NavItem icon={<CalendarCheck size={16} />} label="Attendance" />
            <NavItem icon={<CalendarDays size={16} />} label="Leave" />
            <NavItem icon={<CircleDollarSign size={16} />} label="Payroll" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-slate-500 px-2 mb-1 tracking-wider uppercase">Admin</div>
            <NavItem icon={<FileBarChart size={16} />} label="Reports" />
          </div>

        </div>

        {/* User Card */}
        <div className="p-3 border-t border-white/[0.04] mt-auto">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              HR
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">HR Admin</span>
              <span className="text-[10px] text-slate-500">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER - 48px */}
        <div 
          className="h-12 w-full flex items-center justify-between px-6 border-b border-white/[0.04] shrink-0"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-bold text-white tracking-wide">HR Command Center</h1>
            <span className="text-xs text-slate-400">Real-time workforce overview</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-300 font-medium">
              Oct 24, 2024
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/[0.04] text-[11px] text-slate-300 font-medium transition-colors border border-transparent hover:border-white/[0.05]">
              <Download size={12} />
              Export Report
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500 hover:bg-indigo-600 text-[11px] text-white font-medium transition-colors shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Plus size={12} />
              Add Employee
            </button>
          </div>
        </div>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
          
          {/* Row 1: KPI Stat Cards */}
          <div className="grid grid-cols-6 gap-4 shrink-0">
            <StatCard 
              label="Active Employees" 
              value="147" 
              borderColor="#10b981" 
              pillColor="bg-emerald-500/10 text-emerald-400"
              pillText="↑ +3 this month"
            />
            <StatCard 
              label="In Onboarding" 
              value="12" 
              borderColor="#8b5cf6" 
              pillColor="bg-amber-500/10 text-amber-400"
              pillText="4 pending activation"
            />
            <StatCard 
              label="Open Positions" 
              value="18" 
              borderColor="#6366f1" 
              pillColor="bg-rose-500/10 text-rose-400"
              pillText="6 urgent"
            />
            <StatCard 
              label="Offer Accepted" 
              value="15" 
              borderColor="#10b981" 
              pillColor="bg-emerald-500/10 text-emerald-400"
              pillText="this cycle"
            />
            <StatCard 
              label="Pending Actions" 
              value="7" 
              borderColor="#f59e0b" 
              pillColor="bg-amber-500/10 text-amber-400"
              pillText="requires attention"
            />
            <StatCard 
              label="Avg Attendance" 
              value="94.2%" 
              borderColor="#10b981" 
              pillColor="bg-emerald-500/10 text-emerald-400"
              pillText="↑ +1.3% vs last month"
            />
          </div>

          {/* Row 2: Pipeline & Activity */}
          <div className="flex gap-4 shrink-0 h-[220px]">
            {/* Left: Hiring Pipeline */}
            <div className="w-[55%] rounded-xl border border-white/[0.06] p-5 flex flex-col" style={{ backgroundColor: '#111827' }}>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-sm font-bold text-white">Hiring Pipeline</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">End-to-end recruitment funnel</p>
                </div>
              </div>

              {/* Funnel */}
              <div className="flex items-center justify-between mb-6 px-2">
                <PipelineStage label="Applied" count={42} color="slate" />
                <ArrowRight size={14} className="text-slate-600" />
                <PipelineStage label="Screening" count={28} color="indigo" />
                <ArrowRight size={14} className="text-slate-600" />
                <PipelineStage label="Interview" count={18} color="violet" />
                <ArrowRight size={14} className="text-slate-600" />
                <PipelineStage label="Offered" count={15} color="amber" />
                <ArrowRight size={14} className="text-slate-600" />
                <PipelineStage label="Accepted" count={15} color="emerald" />
                <ArrowRight size={14} className="text-slate-600" />
                <PipelineStage label="Active" count={12} color="emerald" active />
              </div>

              {/* Quick Links */}
              <div className="flex gap-3 mt-auto">
                <button className="px-4 py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] text-xs font-medium text-slate-300 transition-colors">
                  Recruitment Board
                </button>
                <button className="px-4 py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] text-xs font-medium text-slate-300 transition-colors">
                  Offer Management
                </button>
                <button className="px-4 py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] text-xs font-medium text-slate-300 transition-colors">
                  Pre-Onboarding
                </button>
              </div>
            </div>

            {/* Right: Recent Activity */}
            <div className="w-[45%] rounded-xl border border-white/[0.06] p-5 flex flex-col" style={{ backgroundColor: '#111827' }}>
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                <button className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  View All <ChevronRight size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-3 flex-1 overflow-y-auto hide-scrollbar">
                <ActivityItem name="Ananya Sharma" action="Joined as Senior Designer" time="2h ago" dotColor="bg-emerald-500" />
                <ActivityItem name="Rahul Mehta" action="Offer letter sent" time="4h ago" dotColor="bg-amber-500" />
                <ActivityItem name="Priya Nair" action="Interview scheduled" time="6h ago" dotColor="bg-indigo-500" />
                <ActivityItem name="Vikram Singh" action="Onboarding started" time="1d ago" dotColor="bg-orange-500" />
                <ActivityItem name="Leave request" action="Pending approval (3)" time="1d ago" dotColor="bg-rose-500" />
              </div>
            </div>
          </div>

          {/* Row 3: Attendance & Actions */}
          <div className="flex gap-4 flex-1">
            {/* Left: Attendance Overview */}
            <div className="w-[55%] rounded-xl border border-white/[0.06] p-5 flex flex-col" style={{ backgroundColor: '#111827' }}>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-sm font-bold text-white">Attendance This Week</h2>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] text-slate-400">Present</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700"></div><span className="text-[10px] text-slate-400">Absent</span></div>
                </div>
              </div>

              <div className="flex-1 flex items-end justify-between px-8 gap-4">
                <AttendanceBar day="Mon" percent={96} height="96%" />
                <AttendanceBar day="Tue" percent={94} height="94%" />
                <AttendanceBar day="Wed" percent={92} height="92%" />
                <AttendanceBar day="Thu" percent={95} height="95%" />
                <AttendanceBar day="Fri" percent={91} height="91%" />
                <AttendanceBar day="Sat" percent={78} height="78%" warning />
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="w-[45%] rounded-xl border border-white/[0.06] p-5 flex flex-col" style={{ backgroundColor: '#111827' }}>
              <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 grid-rows-3 gap-3 flex-1">
                <QuickAction icon={<UserCheck size={14} />} label="Add Employee" />
                <QuickAction icon={<CircleDollarSign size={14} />} label="Run Payroll" />
                <QuickAction icon={<Calendar size={14} />} label="Approve Leaves" />
                <QuickAction icon={<FileText size={14} />} label="Generate Report" />
                <QuickAction icon={<Mail size={14} />} label="Send Offer" />
                <QuickAction icon={<Video size={14} />} label="Schedule Interview" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button 
      className={`
        w-full flex items-center gap-3 px-3 h-9 rounded-lg text-xs font-medium transition-all
        ${active 
          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
        }
      `}
    >
      <span className={active ? 'text-indigo-400' : 'text-slate-500'}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ label, value, borderColor, pillColor, pillText }: { label: string, value: string, borderColor: string, pillColor: string, pillText: string }) {
  return (
    <div 
      className="h-24 rounded-xl border border-white/[0.06] p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-white/[0.02] transition-colors"
      style={{ backgroundColor: '#111827' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: borderColor }} />
      <div className="text-[11px] font-medium text-slate-400 ml-1">{label}</div>
      <div className="flex items-end justify-between ml-1">
        <div className="text-[26px] font-bold text-white leading-none tracking-tight tabular-nums">{value}</div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${pillColor} tabular-nums whitespace-nowrap`}>
          {pillText}
        </div>
      </div>
    </div>
  );
}

function PipelineStage({ label, count, color, active = false }: { label: string, count: number, color: 'slate' | 'indigo' | 'violet' | 'amber' | 'emerald', active?: boolean }) {
  const colorMap = {
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="flex flex-col items-center gap-2 group relative">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold border ${colorMap[color]} ${active ? 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' : ''}`}>
        {count}
      </div>
      <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">{label}</span>
    </div>
  );
}

function ActivityItem({ name, action, time, dotColor }: { name: string, action: string, time: string, dotColor: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className={`w-2 h-2 rounded-full mt-1.5 ${dotColor} shadow-[0_0_8px_currentColor]`} />
      <div className="flex-1 flex flex-col">
        <div className="text-xs">
          <span className="font-bold text-slate-200">{name}</span>
          <span className="text-slate-400 ml-1.5">{action}</span>
        </div>
        <span className="text-[10px] text-slate-500 mt-0.5">{time}</span>
      </div>
    </div>
  );
}

function AttendanceBar({ day, percent, height, warning = false }: { day: string, percent: number, height: string, warning?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 w-10">
      <span className="text-[10px] font-bold text-slate-300 tabular-nums">{percent}%</span>
      <div className="w-6 h-[80px] bg-slate-800 rounded-sm relative overflow-hidden group">
        <div 
          className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-500 ${warning ? 'bg-amber-500/80' : 'bg-emerald-500/80'} group-hover:brightness-125`}
          style={{ height }}
        />
      </div>
      <span className="text-[10px] font-medium text-slate-500 uppercase">{day}</span>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-400 transition-all group text-left">
      <div className="text-slate-400 group-hover:text-violet-400 transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-300 group-hover:text-violet-300 transition-colors">{label}</span>
    </button>
  );
}
