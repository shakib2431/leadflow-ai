"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
const [business, setBusiness] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

  useEffect(() => {
    loadBusiness();
  }, []);

async function loadBusiness() {
  try {
    setLoading(true);

    const res = await fetch("/api/business");

    if (!res.ok) {
      throw new Error("Failed to load settings");
    }

    const json = await res.json();

    if (
      json?.data &&
      json.data.length > 0
    ) {
      setBusiness(json.data[0]);
    } else {
      setBusiness({
        name: "",
        website: "",
        industry: "",
        timezone: "Asia/Kolkata",
        currency: "INR",
      });
    }
  } catch (err) {
    console.error(err);

    setError(
      "Unable to load business settings. Using default values."
    );

    setBusiness({
      name: "",
      website: "",
      industry: "",
      timezone: "Asia/Kolkata",
      currency: "INR",
    });
  } finally {
    setLoading(false);
  }
}
 if (loading) {
  return (
    <div className="p-10">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-zinc-800 rounded w-64"></div>
        <div className="h-40 bg-zinc-900 rounded"></div>
      </div>
    </div>
  );
}

  async function saveBusiness() {
  const res = await fetch(
    "/api/business/update",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(business),
    }
  );

  const result = await res.json();

  console.log(result);

  if (result.success) {
    alert("Business Updated Successfully");
  } else {
    alert("Update Failed");
  }
}

  return (
    <div className="p-10 text-white">
{error && (
  <div className="mb-6 rounded-lg bg-yellow-500/20 border border-yellow-500 p-4 text-yellow-300">
    {error}
  </div>
)}
      <h1 className="text-4xl font-bold mb-8">
        Business Settings
      </h1>

      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">

        <div>
          <p className="text-zinc-400">
            Business Name
          </p>
         <input
  value={business.name}
  onChange={(e) =>
    setBusiness({
      ...business,
      name: e.target.value,
    })
  }
  className="bg-zinc-800 rounded px-3 py-2 w-full"
/>
        </div>
<div>
  <p className="text-zinc-400 mb-2">
    Website
  </p>

  <input
    value={business.website || ""}
    onChange={(e) =>
      setBusiness({
        ...business,
        website: e.target.value,
      })
    }
    className="w-full bg-zinc-800 rounded-lg px-3 py-2"
  />
</div>

<div>
  <p className="text-zinc-400 mb-2">
    Industry
  </p>

  <input
    value={business.industry || ""}
    onChange={(e) =>
      setBusiness({
        ...business,
        industry: e.target.value,
      })
    }
    className="w-full bg-zinc-800 rounded-lg px-3 py-2"
  />
</div>

<div>
  <p className="text-zinc-400 mb-2">
    Timezone
  </p>

  <input
    value={business.timezone || ""}
    onChange={(e) =>
      setBusiness({
        ...business,
        timezone: e.target.value,
      })
    }
    className="w-full bg-zinc-800 rounded-lg px-3 py-2"
  />
</div>

<div>
  <p className="text-zinc-400 mb-2">
    Currency
  </p>

  <input
    value={business.currency || ""}
    onChange={(e) =>
      setBusiness({
        ...business,
        currency: e.target.value,
      })
    }
    className="w-full bg-zinc-800 rounded-lg px-3 py-2"
  />
</div>
        <div>
          <p className="text-zinc-400">
            WhatsApp Status
          </p>

          <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
            Connected
          </span>
        </div>
<button
  onClick={saveBusiness}
  className="mt-6 bg-violet-600 hover:bg-violet-500 px-6 py-3 rounded-xl font-semibold"
>
  Save Changes
</button>
      </div>

    </div>
  );
}
