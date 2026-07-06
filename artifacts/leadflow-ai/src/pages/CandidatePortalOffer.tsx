

import { useEffect, useState } from "react";
import { useParams, useRouter } from "wouter";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";

type OfferState = "loading" | "ready" | "submitting" | "accepted" | "declined" | "error";

type OfferData = {
  id: string;
  position?: string;
  salary?: number | string;
  joining_date?: string;
  validity_until?: string;
  status?: string;
  offer_content?: string;
};

export default function CandidateOfferPage() {
  const params = useParams<{ offerId: string }>();
  const [, navigate] = useLocation();
  const offerId = params?.offerId;

  const [state, setState] = useState<OfferState>("loading");
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!offerId) {
        setState("error");
        setMessage("Invalid offer link.");
        return;
      }

      try {
        const res = await fetch(`/api/hrms/v2/candidate-offers/${offerId}`);
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load offer");
        const blob = await res.blob();
        const pdfUrl = URL.createObjectURL(blob);
        window.open(pdfUrl, "_blank", "noopener,noreferrer");

        const metaRes = await fetch(`/api/hrms/v2/candidate-offers/${offerId}?meta=true`);
        if (metaRes.ok) {
          const body = await metaRes.json();
          setOffer(body.data || null);
        }

        setState("ready");
      } catch (err: any) {
        setState("error");
        setMessage(err.message || "Failed to load offer");
      }
    }

    load();
  }, [offerId]);

  async function respond(action: "accept" | "decline") {
    setState("submitting");
    try {
      const res = await fetch(`/api/hrms/v2/candidate-offers/${offerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to submit response");

      setState(action === "accept" ? "accepted" : "declined");
      setMessage(action === "accept" ? "Offer accepted. HR has been notified." : "Offer declined.");

      if (action === "accept" && body.preOnboardingLink) {
        navigate(String(body.preOnboardingLink));
      }
    } catch (err: any) {
      setState("error");
      setMessage(err.message || "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <FileText className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Letter</h1>
          <p className="text-sm text-slate-500">Candidate Portal</p>
        </div>

        {state === "loading" && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={36} />
            <p className="text-slate-600 text-sm">Loading your offer...</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <XCircle className="text-rose-500" size={40} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Offer Not Available</h2>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>
          </div>
        )}

        {state === "ready" && offer && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Offer Summary</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{offer.position || "Offer"}</h2>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div><span className="font-semibold text-slate-500">Joining Date:</span> {offer.joining_date || "TBD"}</div>
                <div><span className="font-semibold text-slate-500">Salary:</span> {offer.salary ? `₹${offer.salary}` : "—"}</div>
                <div><span className="font-semibold text-slate-500">Valid Until:</span> {offer.validity_until ? new Date(offer.validity_until).toLocaleDateString() : "TBD"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Full Offer Letter</p>
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{offer.offer_content || "No letter content found."}</pre>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
              Please review the full offer letter above, then accept or decline below. Once you accept, HR will be notified and the next onboarding step will be sent automatically.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => respond("accept")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                <CheckCircle2 size={18} />
                Accept Offer
              </button>
              <button
                onClick={() => respond("decline")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600 transition"
              >
                <XCircle size={18} />
                Decline Offer
              </button>
            </div>
          </div>
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={36} />
            <p className="text-slate-600 text-sm">Submitting your response...</p>
          </div>
        )}

        {state === "accepted" && (
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <CheckCircle2 className="text-emerald-600" size={42} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Offer Accepted</h2>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>
          </div>
        )}

        {state === "declined" && (
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <XCircle className="text-rose-600" size={42} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Offer Declined</h2>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}