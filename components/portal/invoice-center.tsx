"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Receipt, ArrowRight, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function InvoiceCenter({ leadId }: { leadId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("lead_id", leadId)
        .order("due_date", { ascending: false });

      if (!error && data) setInvoices(data);
      setLoading(false);
    }
    if (leadId) fetchInvoices();
  }, [leadId]);

  const handlePayment = (paymentLink: string) => {
    if (!paymentLink) {
      alert("Payment link is not generated yet. Please contact support.");
      return;
    }
    // Opens your Stripe checkout link in a new secure tab
    window.open(paymentLink, "_blank");
  };

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <Receipt size={18} className="text-zinc-400" /> Financials
        </h2>
        <button className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
          Billing History <ArrowRight size={14} />
        </button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-zinc-500" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-4">No invoices generated yet.</p>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group gap-4">
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-200">{invoice.invoice_number}</span>
                <span className="text-xs text-zinc-500 mt-1">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto">
                <span className="text-sm font-medium text-white">
                  ${Number(invoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                
                <div className="w-24 flex justify-end">
                  {invoice.status === 'paid' && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 size={14} /> Paid
                    </span>
                  )}
                  {invoice.status === 'pending' && (
                    <button 
                      onClick={() => handlePayment(invoice.payment_link)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                    >
                      <CreditCard size={14} /> Pay Now
                    </button>
                  )}
                  {invoice.status === 'overdue' && (
                    <button 
                      onClick={() => handlePayment(invoice.payment_link)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium transition-colors"
                    >
                      <AlertCircle size={14} /> Overdue
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}