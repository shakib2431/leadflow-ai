"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
  checkBusiness();
}, []);

async function checkBusiness() {
  const { data } =
    await supabase
      .from("businesses")
      .select("*")
      .limit(1);

  if (
    data &&
    data.length > 0 &&
    data[0].setup_completed
  ) {
    router.push("/");
  }
}

  
 const [formData, setFormData] = useState({
  business_name: "",
  website: "",
  industry: "",
  timezone: "Asia/Kolkata",
  currency: "INR",

  whatsapp_id: "",
  whatsapp_token: ""
});
  async function handleVerify() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
  business_name: formData.business_name,

  website: formData.website,

  industry: formData.industry,

  timezone: formData.timezone,

  currency: formData.currency,

  whatsapp_id: formData.whatsapp_id,

  whatsapp_token: formData.whatsapp_token
})
    });

    if (!res.ok) {
      setError("Connection failed. Please check your WhatsApp ID and Token.");
      setLoading(false);
      return;
    }

    setStep(3); // Success!
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[480px]">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-violet-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Initialize LeadFlow</h1>
          <p className="text-white/40 text-sm mt-2">Let&apos;s configure your AI workspace.</p>
        </div>

        {/* Wizard Steps */}
        <div className="bg-[#0c0d12] border border-white/5 rounded-3xl p-8 shadow-2xl">
          
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-lg font-semibold">1. Business Profile</h2>
              <input
                placeholder="Business Name"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500/50 transition-all"
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              />
              <input
  placeholder="Website"
  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
  onChange={(e) =>
    setFormData({
      ...formData,
      website: e.target.value,
    })
  }
/>

<select
  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
  onChange={(e) =>
    setFormData({
      ...formData,
      industry: e.target.value,
    })
  }
>
  <option value="">
    Select Industry
  </option>

  <option value="Restaurant">
    Restaurant
  </option>

  <option value="Ecommerce">
    Ecommerce
  </option>

  <option value="Real Estate">
    Real Estate
  </option>

  <option value="Agency">
    Agency
  </option>

</select>
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.business_name}
                className="w-full py-3 bg-violet-600 rounded-xl font-bold hover:bg-violet-500 transition-all disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: WhatsApp Integration */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lock size={16} className="text-violet-400"/> 2. Secure Integration
              </h2>
              <div className="space-y-4">
                <input
                  placeholder="WhatsApp Phone Number ID"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500/50 transition-all"
                  onChange={(e) => setFormData({...formData, whatsapp_id: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="WhatsApp Access Token"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500/50 transition-all"
                  onChange={(e) => setFormData({...formData, whatsapp_token: e.target.value})}
                />
              </div>
              
              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button 
                onClick={handleVerify}
                disabled={loading || !formData.whatsapp_id || !formData.whatsapp_token}
                className="w-full py-3 bg-violet-600 rounded-xl font-bold hover:bg-violet-500 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18}/> : "Verify Connection"}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold">Workspace Ready</h2>
              <p className="text-white/60 text-sm">Your AI engine is now connected and learning your business.</p>
              <button 
                onClick={() => router.push("/")}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}