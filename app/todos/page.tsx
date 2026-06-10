"use client";

import { useEffect, useState } from "react";

export default function TodosPage() {
  const [followups, setFollowups] =
    useState<any[]>([]);

  async function loadFollowups() {
    const res = await fetch(
      "/api/followups"
    );

    const data = await res.json();

    setFollowups(data.followups || []);
  }

  useEffect(() => {
  loadFollowups();
}, []);

const now = new Date();

return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-6">
        Follow-ups
      </h1>

      <div className="space-y-4">

{followups.map((item) => {

  const overdue =
    new Date(item.due_date) < now;

  return (

    <div
      key={item.id}
      className="bg-[#111827] border border-white/10 rounded-2xl p-5"
    >
      <h2 className="font-semibold text-lg">
        {item.title}
      </h2>

      <p className="text-white/60 mt-2">
        {item.description}
      </p>

      {item.ai_message && (
        <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/10">
          <div className="text-xs text-violet-400 mb-2">
            AI FOLLOW-UP MESSAGE
          </div>

          <p className="text-sm whitespace-pre-wrap">
            {item.ai_message}
          </p>
        </div>
      )}

      <div className="mt-3 text-sm text-white/40">
        Due: {item.due_date}
      </div>

      <div className="mt-2">
        Status: {item.status}
      </div>
      <div className="flex gap-3 mt-4">

  <button
    onClick={async () => {

      await fetch(
        "/api/followups/send-now",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: item.id,
          }),
        }
      );

      loadFollowups();

    }}
    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700"
  >
    🚀 Send Now
  </button>

  <button
    onClick={async () => {

      await fetch(
        "/api/followups/complete",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: item.id,
          }),
        }
      );

      loadFollowups();

    }}
   className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700"
  >
    Mark Complete
  </button>

</div>

      {overdue && (
        <div className="mt-3">
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            OVERDUE
          </span>
        </div>
      )}

    </div>

  );

})}

      </div>

    </div>
  );
}