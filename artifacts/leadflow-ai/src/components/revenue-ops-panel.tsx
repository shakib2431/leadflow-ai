

import { useState } from "react";
import { FileText, PenTool, CreditCard, CheckCircle, ChevronRight, ArrowUpRight, DollarSign } from "lucide-react";

interface RevenueOpsProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
}

export default function RevenueOpsPanel({ leadId, leadName, leadEmail }: RevenueOpsProps) {
  const [currentStep, setCurrentStep] = useState<"draft" | "sign" | "invoice" | "paid">("draft");
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [gateway, setGateway] = useState<"razorpay" | "stripe">("razorpay");

  const proposalData = {
    title: "Enterprise AI Infrastructure Build",
    lineItems: [
      { name: "LeadFlow AI Implementation", description: "Full CRM setup and unified inbox", price: 3500 },
      { name: "Autonomous Agent Training", description: "Custom fine-tuning for Gemini models", price: 2000 }
    ],
    total: 5500
  };

  const generatePaymentLink = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: proposalData.total,
          lead_id: leadId,
          gateway: gateway 
        })
      });
      
      const data = await res.json();
      if (data.url) setPaymentUrl(data.url); // Stripe
      if (data.order_id) alert("Razorpay Order Created: " + data.order_id); // Razorpay
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0b0f] border border-white/10 rounded-3xl p-8 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <DollarSign className="text-emerald-400" /> Revenue Operations
      </h2>

      {/* Gateway Selector for India/Global */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setGateway("razorpay")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold ${gateway === "razorpay" ? "bg-emerald-600 text-white" : "bg-white/5 text-white/50"}`}
        >
          RAZORPAY (India)
        </button>
        <button 
          onClick={() => setGateway("stripe")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold ${gateway === "stripe" ? "bg-violet-600 text-white" : "bg-white/5 text-white/50"}`}
        >
          STRIPE (Global)
        </button>
      </div>

      <button 
        onClick={generatePaymentLink}
        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200"
      >
        {loading ? "Processing..." : `Generate ${gateway.toUpperCase()} Invoice`}
      </button>
    </div>
  );
}