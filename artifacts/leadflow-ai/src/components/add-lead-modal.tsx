

import { useState } from "react";
import { createLead } from "@/lib/leads";

interface Props {
  open: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
}

export default function AddLeadModal({
  open,
  onClose,
  onLeadCreated,
}: Props) {

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      full_name: "",
      phone: "",
      email: "",
      status: "new",
      source: "whatsapp",
    });

  async function handleSubmit() {
    try {
      setLoading(true);

      await createLead(formData);

      onLeadCreated();

      onClose();

      setFormData({
        full_name: "",
        phone: "",
        email: "",
        status: "new",
        source: "whatsapp",
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

    <div className="w-full max-w-md bg-[#111827] rounded-3xl border border-white/10 p-6 shadow-2xl">

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">
          Add New Lead
        </h2>

        <button
          onClick={onClose}
          className="text-white text-2xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">

        <input
          type="text"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({
              ...formData,
              full_name: e.target.value,
            })
          }
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-violet-500"
        />

        <input
          type="text"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData({
              ...formData,
              phone: e.target.value,
            })
          }
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-violet-500"
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value,
            })
          }
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-violet-500"
        />

       <select
  value={formData.status}
  onChange={(e) =>
    setFormData({
      ...formData,
      status: e.target.value,
    })
  }
  style={{
    backgroundColor: "#111827",
    color: "white",
  }}
  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-violet-500"
>
       <option
  value="new"
  className="bg-[#111827] text-white"
>
  New
</option>

<option
  value="warm"
  className="bg-[#111827] text-white"
>
  Warm
</option>

<option
  value="hot"
  className="bg-[#111827] text-white"
>
  Hot
</option>

<option
  value="converted"
  className="bg-[#111827] text-white"
>
  Converted
</option>
        </select>

        <select
  value={formData.source}
  onChange={(e) =>
    setFormData({
      ...formData,
      source: e.target.value,
    })
  }
  style={{
    backgroundColor: "#111827",
    color: "white",
  }}
  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-violet-500"
>
  <option
    value="whatsapp"
    className="bg-[#111827] text-white"
  >
    WhatsApp
  </option>

  <option
    value="instagram"
    className="bg-[#111827] text-white"
  >
    Instagram
  </option>

  <option
    value="facebook"
    className="bg-[#111827] text-white"
  >
    Facebook
  </option>

  <option
    value="website"
    className="bg-[#111827] text-white"
  >
    Website
  </option>
</select>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-2xl font-semibold transition-all"
        >
          {loading
            ? "Creating..."
            : "Create Lead"}
        </button>

      </div>
    </div>
  </div>
);
}