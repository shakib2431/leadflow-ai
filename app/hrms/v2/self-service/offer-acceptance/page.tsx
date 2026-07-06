"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, FileText, Loader2, ExternalLink } from "lucide-react";

type PageState = "loading" | "ready" | "submitting" | "accepted" | "declined" | "revision_requested" | "already_done" | "error";

export default function OfferAcceptancePage() {
  const params = useSearchParams();
  const employeeId = params.get("employee");
  const employeeName = params.get("name") || "there";

  const [state, setState] = useState<PageState>("loading");
  const [message, setMessage] = useState("");
  const offerLetterUrl = employeeId ? `/api/hrms/v2/offer-acceptance?employeeId=${encodeURIComponent(employeeId)}` : "";
  const offerLetterPreviewUrl = employeeId ? `/api/hrms/v2/offer-acceptance?employeeId=${encodeURIComponent(employeeId)}&preview=true` : "";
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [changeRequest, setChangeRequest] = useState("");

  useEffect(() => {
    if (!employeeId) {
      setState("error");
      setMessage("Invalid link — no employee ID found. Please contact HR.");
    } else {
      setState("ready");
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId || state !== "ready") return;

    let cancelled = false;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const res = await fetch(offerLetterPreviewUrl, { cache: "no-store" });
        const body = await res.json();

        if (!res.ok) throw new Error(body.error || "Failed to load offer preview");

        if (cancelled) return;
        setPreviewSubject(body.data?.subject || "Offer Letter");
        setPreviewBody(body.data?.body || "Your offer letter is available for download.");
      } catch (err: any) {
        if (cancelled) return;
        setPreviewError(err.message || "Failed to load offer preview");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [employeeId, offerLetterPreviewUrl, state]);

  async function respond(action: "accept" | "decline" | "request_changes") {
    setState("submitting");
    try {
      const res = await fetch("/api/hrms/v2/offer-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, action, comments: changeRequest.trim() }),
      });
      const body = await res.json();

      if (!res.ok) throw new Error(body.error || "Request failed");

      if (body.alreadyProcessed) {
        setState("already_done");
        setMessage(`Your offer was already ${body.status}. No further action needed.`);
        return;
      }

      setState(action === "accept" ? "accepted" : action === "request_changes" ? "revision_requested" : "declined");
      setMessage(body.message || "");
    } catch (err: any) {
      setState("error");
      setMessage(err.message || "Something went wrong. Please contact HR.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <FileText className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Letter</h1>
          <p className="text-slate-500 text-sm mt-1">LeadFlow AI · HRMS Portal</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">

          {state === "loading" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={36} />
              <p className="text-slate-600 text-sm">Loading your offer...</p>
            </div>
          )}

          {state === "ready" && (
            <>
              <div className="mb-6">
                <p className="text-lg font-bold text-slate-900">Hi {decodeURIComponent(employeeName)},</p>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                  Your offer letter has been prepared and is ready for your review.
                  Please read it carefully and confirm your acceptance below.
                </p>
              </div>

              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Offer Letter Preview</p>
                    <p className="text-xs text-slate-500">Review the full letter before responding</p>
                  </div>
                  <a
                    href={offerLetterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                  >
                    <ExternalLink size={14} />
                    Open PDF
                  </a>
                </div>
                <div className="max-h-[560px] overflow-auto bg-white px-5 py-6">
                  {previewLoading && (
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Loader2 className="animate-spin" size={16} />
                      Loading preview...
                    </div>
                  )}
                  {!previewLoading && previewError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {previewError}
                    </div>
                  )}
                  {!previewLoading && !previewError && (
                    <article className="prose prose-slate max-w-none">
                      <h3 className="mb-4 text-2xl font-bold text-slate-900">{previewSubject || "Offer Letter"}</h3>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{previewBody}</pre>
                    </article>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 mb-6">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-1">What happens next?</p>
                <ol className="text-xs text-indigo-800 space-y-1 list-decimal list-inside">
                  <li>Click <strong>Accept Offer</strong> to confirm your acceptance</li>
                  <li>HR will receive your confirmation instantly</li>
                  <li>You will be sent the pre-onboarding form to complete</li>
                  <li>Welcome to the team on your joining date!</li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => respond("accept")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                >
                  <CheckCircle2 size={20} />
                  I Accept This Offer
                </button>
                <button
                  onClick={() => respond("decline")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 transition"
                >
                  <XCircle size={16} />
                  Decline Offer
                </button>
                <textarea
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="Need any changes? Add your comments for HR (optional)."
                  className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                />
                <button
                  onClick={() => respond("request_changes")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"
                >
                  Request Changes
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                If you have questions, contact your HR team before responding.
              </p>
            </>
          )}

          {state === "submitting" && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={36} />
              <p className="text-slate-600 text-sm">Processing your response...</p>
            </div>
          )}

          {state === "accepted" && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="text-emerald-600" size={36} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Offer Accepted!</h2>
                <p className="text-slate-500 text-sm mt-2">{message}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 w-full text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1">What's next?</p>
                <p className="text-xs text-emerald-800">
                  HR has been notified. You will receive a pre-onboarding form shortly to complete your joining details. Check your email.
                </p>
              </div>
            </div>
          )}

          {state === "declined" && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <XCircle className="text-rose-500" size={36} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Offer Declined</h2>
                <p className="text-slate-500 text-sm mt-2">{message}</p>
              </div>
            </div>
          )}

          {state === "revision_requested" && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <FileText className="text-amber-600" size={30} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Revision Requested</h2>
                <p className="text-slate-500 text-sm mt-2">{message}</p>
              </div>
            </div>
          )}

          {state === "already_done" && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CheckCircle2 className="text-slate-500" size={36} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Already Processed</h2>
                <p className="text-slate-500 text-sm mt-2">{message}</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <XCircle className="text-rose-500" size={36} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Invalid Link</h2>
                <p className="text-slate-500 text-sm mt-2">{message}</p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by LeadFlow AI HRMS · Secure employee portal
        </p>
      </div>
    </div>
  );
}
