

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
  const { data, error } = await supabase
  .from("follow_ups")
  .select("*")
  .eq("status", "pending");

    if (error) {
      console.error(error);
      return;
    }

    setCount(data?.length || 0);
  }

  return (
    <div className="relative">
      <button className="text-white text-xl">
        🔔
      </button>

      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
          {count}
        </span>
      )}
    </div>
  );
}