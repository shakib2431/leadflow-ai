"use client";
import {
  useNotifications,
} from "@/lib/notification-context";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Bell, ChevronDown, Menu, MessageCircle } from "lucide-react";

interface TopNavbarProps {
  onMenuClick: () => void;
  
}

export default function TopNavbar({
  onMenuClick,
  
}: TopNavbarProps){
  const router = useRouter();
  const {
  notificationCount,
  setNotificationCount,
} = useNotifications();
  const [userEmail, setUserEmail] =
  useState("");
  const [
  notificationOpen,
  setNotificationOpen,
] = useState(false);
const [
  notifications,
  setNotifications,
] = useState<any[]>([]);

function getFollowupStatus(
  scheduledAt: string
) {

  const now =
    new Date();

  const dueDate =
    new Date(scheduledAt);

  const diff =
    dueDate.getTime() -
    now.getTime();

  const days =
    Math.ceil(
      diff /
      (1000 * 60 * 60 * 24)
    );

  if (days < 0) {
    return {
      label: `Overdue by ${Math.abs(days)}d`,
      color: "text-red-400",
    };
  }

  if (days === 0) {
    return {
      label: "Due Today",
      color: "text-orange-400",
    };
  }

  return {
    label: `Due in ${days}d`,
    color: "text-violet-400",
  };
}
  async function loadNotifications() {

  const { data, error } =
    await supabase
      .from("follow_ups")
      .select("*")
      .eq("status", "pending");

  if (error) {
    console.error(error);
    return;
  }

  setNotificationCount(
    data.length
  );
  setNotifications(data);
}
 useEffect(() => {

  async function getUser() {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserEmail(user.email || "");
    }
  }

  getUser();

  loadNotifications();

  const channel =
    supabase
      .channel("followups-realtime")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "followups",
        },
        () => {

          loadNotifications();

        }
      )

      .subscribe();

  return () => {

    supabase.removeChannel(
      channel
    );

  };

}, []);
async function handleLogout() {
  await supabase.auth.signOut();

  router.push("/login");
}
  return (
    <header
      className="flex items-center gap-3 px-4 lg:px-6 h-16 border-b border-white/[0.06] flex-shrink-0"
      style={{ background: "#0d0d14" }}
    >
      <button
        className="lg:hidden text-white/40 hover:text-white/70 mr-1"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          placeholder="Search leads, conversations..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-white/[0.07] bg-white/[0.04] text-white/70 placeholder-white/25 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
        />
        <span className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] text-white/20 font-mono">
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
       {/* Notifications */}

<div className="relative">

  <button
  onClick={() =>
    setNotificationOpen(
      !notificationOpen
    )
  }
  className="relative w-9 h-9 rounded-lg glass glass-hover flex items-center justify-center border border-white/[0.07] transition-all"
>

    <Bell
      size={15}
      className="text-white/50"
    />

    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500 pulse-dot" />

  </button>

  <div className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-violet-600 text-xs text-white flex items-center justify-center font-bold shadow-lg shadow-violet-500/40 border border-black">

   {notificationCount}

  </div>

</div>
{notificationOpen && (

  <div className="absolute top-14 right-0 w-80 rounded-2xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/40 p-4 z-50">

    <div className="flex items-center justify-between mb-4">

      <h3 className="text-sm font-semibold text-white">
        Notifications
      </h3>

      <span className="text-xs text-violet-400">
        {notificationCount} pending
      </span>

    </div>

 <div className="space-y-3">

  {notifications.map((item) => (

    <button
      key={item.id}
      onClick={async () => {

   const { error } =
  await supabase
    .from("follow_ups")
    .update({
      status: "completed",
    })
    .eq("id", item.id);

if (error) {
  console.error(error);
  return;
}

await loadNotifications();

setNotificationOpen(false);

router.push(
  `/leads/${item.lead_id}`
);

}}
      className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all"
    >

      <p className="text-sm text-white font-medium">
        {item.title}
      </p>

      <p className="text-xs text-white/50 mt-1">
        {item.description}
      </p>
      <p
  className={`text-[11px] mt-2 font-medium ${
    getFollowupStatus(
     item.due_date
    ).color
  }`}
>

  {
    getFollowupStatus(
      item.due_date
    ).label
  }

</p>

    </button>

  ))}

</div>

  </div>

)}
       {/* User Profile */}
<button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg glass glass-hover border border-white/[0.07] transition-all">
  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
    {userEmail
      ? userEmail.charAt(0).toUpperCase()
      : "U"}
  </div>

  <div className="hidden md:block text-left">
    <div className="text-xs font-medium text-white/80 leading-none">
      {userEmail.split("@")[0]}
    </div>

    <div className="text-[10px] text-white/30 mt-0.5">
      Admin
    </div>
  </div>

  <ChevronDown
    size={12}
    className="text-white/30 hidden md:block"
  />
</button>

<button
  onClick={handleLogout}
  className="w-9 h-9 rounded-lg border border-white/[0.07] flex items-center justify-center text-white/50 hover:text-red-400 hover:border-red-500/30 transition-all"
>
  <LogOut size={16} />
</button>
      </div>
    </header>
  );
}