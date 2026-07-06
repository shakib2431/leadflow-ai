import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Flame,
  Target,
  CalendarCheck,
  KanbanSquare,
  CheckSquare, // NEW
} from "lucide-react";

import type {
  NavItem,
  AnalyticsCard,
  Lead,
  HotLead,
  StatusConfig,
} from "@/types";

export const NAV_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    active: true,
    href: "/",
  },

  {
    icon: Users,
    label: "Leads",
    // badge: "124",
    href: "/leads",
  },
  {
  icon: KanbanSquare,
  label: "Pipeline",
  href: "/pipeline",
},

  {
    icon: MessageSquare,
    label: "Conversations",
    // badge: "8",
    href: "/conversations",
  },

  {
    icon: BarChart3,
    label: "Analytics",
    href: "/analytics",
  },

  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
  {
  icon: CheckSquare,
  label: "To Do",
  href: "/todos",
},
];

export const ANALYTICS_CARDS: AnalyticsCard[] = [
  {
    title: "Total Leads",
    value: "3,842",
    change: "+18.2%",
    positive: true,
    icon: Users,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20",
  },
  {
    title: "Hot Leads",
    value: "286",
    change: "+32.1%",
    positive: true,
    icon: Flame,
    color: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-400",
    borderColor: "border-orange-500/20",
  },
  {
    title: "Conversion Rate",
    value: "24.7%",
    change: "-2.4%",
    positive: false,
    icon: Target,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    title: "Appointments",
    value: "947",
    change: "+11.5%",
    positive: true,
    icon: CalendarCheck,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    borderColor: "border-cyan-500/20",
  },
];

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  hot:       { label: "Hot",       color: "bg-orange-500/15 text-orange-400",  dot: "bg-orange-400"  },
  warm:      { label: "Warm",      color: "bg-yellow-500/15 text-yellow-400",  dot: "bg-yellow-400"  },
  cold:      { label: "Cold",      color: "bg-blue-500/15 text-blue-400",      dot: "bg-blue-400"    },
  converted: { label: "Converted", color: "bg-emerald-500/15 text-emerald-400",dot: "bg-emerald-400" },
  lost:      { label: "Lost",      color: "bg-red-500/15 text-red-400",        dot: "bg-red-400"     },
};

export const AVATAR_COLORS: string[] = [
  "bg-violet-500/30 text-violet-300",
  "bg-orange-500/30 text-orange-300",
  "bg-cyan-500/30 text-cyan-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-pink-500/30 text-pink-300",
  "bg-yellow-500/30 text-yellow-300",
];

export const RECENT_LEADS: Lead[] = [
  { name: "Priya Sharma",  phone: "+91 98765 43210", status: "hot",       source: "WhatsApp",  lastContact: "2m ago", avatar: "PS" },
  { name: "Rajesh Kumar",  phone: "+91 87654 32109", status: "warm",      source: "Instagram", lastContact: "1h ago", avatar: "RK" },
  { name: "Anita Patel",   phone: "+91 76543 21098", status: "converted", source: "WhatsApp",  lastContact: "3h ago", avatar: "AP" },
  { name: "Vikram Singh",  phone: "+91 65432 10987", status: "cold",      source: "Facebook",  lastContact: "1d ago", avatar: "VS" },
  { name: "Meera Nair",    phone: "+91 54321 09876", status: "hot",       source: "WhatsApp",  lastContact: "5m ago", avatar: "MN" },
  { name: "Amit Gupta",    phone: "+91 43210 98765", status: "warm",      source: "Website",   lastContact: "2h ago", avatar: "AG" },
  { name: "Sunita Joshi",  phone: "+91 32109 87654", status: "lost",      source: "Referral",  lastContact: "3d ago", avatar: "SJ" },
];

export const HOT_LEADS: HotLead[] = [
  { name: "Priya Sharma", interest: "Gold Jewellery Package", value: "₹45,000",   score: 94, avatar: "PS", time: "2m"  },
  { name: "Meera Nair",   interest: "Wedding Photography",    value: "₹1,20,000", score: 89, avatar: "MN", time: "5m"  },
  { name: "Deepak Verma", interest: "Interior Design",        value: "₹2,80,000", score: 85, avatar: "DV", time: "12m" },
  { name: "Kavya Reddy",  interest: "Catering Services",      value: "₹95,000",   score: 81, avatar: "KR", time: "18m" },
];

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #ffffff15; border-radius: 2px; }
  .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); }
  .glass-hover:hover { background: rgba(255,255,255,0.05); }
  .score-bar { background: linear-gradient(90deg, #8b5cf6, #06b6d4); }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
  .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  .fade-in-1 { animation-delay: 0.05s; opacity: 0; }
  .fade-in-2 { animation-delay: 0.1s; opacity: 0; }
  .fade-in-3 { animation-delay: 0.15s; opacity: 0; }
  .fade-in-4 { animation-delay: 0.2s; opacity: 0; }
  .mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:40; }
`;