

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (
    title: string,
    note: string,
    dueDate: string
  ) => void;
  loading: boolean;
};

export default function FollowupModal({
  open,
  onClose,
  onSave,
  loading,
}: Props) {

  const [title, setTitle] =
    useState("");

  const [note, setNote] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  if (!open) return null;

  return (

    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B1120] p-6">

        <h2 className="text-2xl font-bold mb-6">
          Add Follow-up
        </h2>

        <div className="space-y-4">

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Follow-up title"
            className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-4 outline-none"
          />

          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            placeholder="Write follow-up note..."
            className="w-full h-32 rounded-2xl bg-black/30 border border-white/10 px-4 py-4 outline-none resize-none"
          />

          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) =>
              setDueDate(
                e.target.value
              )
            }
            className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-4 outline-none"
          />

        </div>

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-5 h-12 rounded-2xl border border-white/10"
          >
            Cancel
          </button>

          <button
          onClick={() => {

  const parsedDate = new Date(dueDate);

  if (isNaN(parsedDate.getTime())) {
    alert("Please select a valid due date");
    return;
  }

  onSave(
    title,
    note,
    parsedDate.toISOString()
  );
}}
            disabled={loading}
            className="px-5 h-12 rounded-2xl bg-violet-600"
          >

            {loading
              ? "Saving..."
              : "Save Follow-up"}

          </button>

        </div>

      </div>

    </div>
  );
}