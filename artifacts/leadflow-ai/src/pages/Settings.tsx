

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, Globe, Briefcase, Clock, Coins, 
  ShieldCheck, MessageSquare, Mail, CreditCard, 
  Settings, Key, AlertCircle, CheckCircle2, Save,
  Users, UserPlus, Terminal, Copy, Trash2, X
} from "lucide-react";

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // --- LIVE STATE HOOKED UP TO DB ---
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // --- NEW INTERACTIVE UI STATES ---
  const [apiKey, setApiKey] = useState("lf_prod_8f92j" + Math.random().toString(36).substring(2, 8));
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Sales Rep");

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    setLoading(true);
    setError(null);

    try {
      const fetchPromise = supabase.from("businesses").select("*").limit(1).maybeSingle();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
      
      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (fetchError) throw fetchError;

      if (data) {
        setBusiness(data);
      } else {
        setBusiness({ name: "", website: "", industry: "", timezone: "Asia/Kolkata", currency: "INR" });
      }

      const { data: teamData, error: teamError } = await supabase
        .from("users")
        .select("*")
        .order("full_name", { ascending: true });
        
      if (teamData) {
        setTeamMembers(teamData);
      }

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Unable to sync with database. Showing default configuration.");
      setBusiness({ name: "", website: "", industry: "", timezone: "Asia/Kolkata", currency: "INR" });
    } finally {
      setLoading(false);
    }
  }

  async function saveBusiness() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (business.id) {
        const { error: updateError } = await supabase.from("businesses").update(business).eq("id", business.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase.from("businesses").insert([business]).select().single();
        if (insertError) throw insertError;
        if (data) setBusiness(data);
      }

      showToast("Configuration saved successfully.");
    } catch (err: any) {
      console.error("Save error:", err);
      setError("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- NEW: INTERACTIVE HANDLERS ---
  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    // Optimistic UI update (mocking the database insert for now)
    const newMember = {
      id: Math.random().toString(),
      full_name: "Pending Invite",
      email: inviteEmail,
      role: inviteRole,
      status: "Pending"
    };
    
    setTeamMembers([...teamMembers, newMember]);
    setIsInviteModalOpen(false);
    setInviteEmail("");
    showToast(`Invitation sent to ${inviteEmail}`);
  };

  const handleRollApiKey = () => {
    if (confirm("Are you sure? Rolling this key will break any active integrations using the old key.")) {
      setApiKey("lf_prod_" + Math.random().toString(36).substring(2, 12));
      showToast("New API Key generated successfully.");
    }
  };

  const handleConnectIntegration = (provider: string) => {
    alert(`Connecting to ${provider} requires secure OAuth. This will be wired up in Phase 2: Communication Hub.`);
  };

  const handleDeleteWorkspace = () => {
    const confirmName = prompt(`To delete this workspace, type your business name exactly: ${business?.name || 'Workspace'}`);
    if (confirmName === business?.name) {
      alert("Workspace deletion initiated. (Mock action for Phase 1)");
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#07070a] min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse opacity-50">
          <Settings size={32} className="mb-4 text-violet-400 animate-spin-slow" />
          <p className="text-sm font-mono tracking-widest uppercase">Initializing Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#07070a] min-h-screen text-white font-sans relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Workspace Settings</h1>
          <p className="text-white/40">Manage your business profile, team access, and integrations.</p>
        </div>
        <button
          onClick={saveBusiness}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
        >
          {saving ? <Settings size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* TOAST NOTIFICATIONS */}
      {error && (
        <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in z-50 relative">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      <div className="flex gap-8">
        {/* VERTICAL TAB NAVIGATION */}
        <div className="w-64 shrink-0 space-y-1">
          <button onClick={() => setActiveTab("general")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}>
            <Building2 size={16} /> General Info
          </button>
          <button onClick={() => setActiveTab("team")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}>
            <Users size={16} /> Team & Roles
          </button>
          <button onClick={() => setActiveTab("integrations")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'integrations' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}>
            <MessageSquare size={16} /> Integrations
          </button>
          <button onClick={() => setActiveTab("api")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'api' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}>
            <Terminal size={16} /> API & Webhooks
          </button>
          <button onClick={() => setActiveTab("security")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}>
            <ShieldCheck size={16} /> Security & Access
          </button>
        </div>

        {/* TAB CONTENT AREAS */}
        <div className="flex-1 bg-[#0d0e12] rounded-3xl border border-white/5 shadow-2xl p-8">
          
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold border-b border-white/5 pb-4 mb-6">Business Profile</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Building2 size={12}/> Legal Business Name
                  </label>
                  <input
                    value={business?.name || ""}
                    onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Acme Corp LLC"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Globe size={12}/> Website URL
                  </label>
                  <input
                    value={business?.website || ""}
                    onChange={(e) => setBusiness({ ...business, website: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="https://acmecorp.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Briefcase size={12}/> Primary Industry
                  </label>
                  <input
                    value={business?.industry || ""}
                    onChange={(e) => setBusiness({ ...business, industry: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="e.g. Software, Real Estate, Consulting"
                  />
                </div>
              </div>

              <h2 className="text-xl font-bold border-b border-white/5 pb-4 mt-10 mb-6">Localization</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Clock size={12}/> Default Timezone
                  </label>
                  <select
                    value={business?.timezone || "Asia/Kolkata"}
                    onChange={(e) => setBusiness({ ...business, timezone: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Coins size={12}/> Base Currency
                  </label>
                  <select
                    value={business?.currency || "INR"}
                    onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TEAM & ROLES TAB */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                <h2 className="text-xl font-bold">Team Members</h2>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                >
                  <UserPlus size={16} /> Invite Member
                </button>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/40 border-b border-white/5">
                    <tr>
                      <th className="p-4 font-semibold">User</th>
                      <th className="p-4 font-semibold">Role</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{member.full_name}</span>
                            <span className="text-xs text-white/40">{member.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.role?.toLowerCase() === 'owner' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-white/60'}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-2 text-xs ${member.status === 'Pending' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] ${member.status === 'Pending' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                            {member.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="text-white/40 hover:text-rose-400 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold border-b border-white/5 pb-4 mb-6">Connected Apps</h2>
              
              <div className="grid grid-cols-1 gap-4">
                {/* WhatsApp */}
                <div className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">WhatsApp Business API</h3>
                      <p className="text-xs text-white/40">Used for autonomous AI lead follow-ups.</p>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Google Workspace</h3>
                      <p className="text-xs text-white/40">Two-way email sync and calendar routing.</p>
                    </div>
                  </div>
                  <button onClick={() => handleConnectIntegration('Google Workspace')} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                    Connect Account
                  </button>
                </div>

                {/* Stripe */}
                <div className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Stripe Payments</h3>
                      <p className="text-xs text-white/40">Process invoice payments automatically.</p>
                    </div>
                  </div>
                  <button onClick={() => handleConnectIntegration('Stripe')} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                    Connect Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API & WEBHOOKS TAB */}
          {activeTab === "api" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold border-b border-white/5 pb-4 mb-6">API & Developer Settings</h2>
              
              <div className="p-5 bg-black/20 border border-white/5 rounded-2xl">
                <h3 className="font-bold mb-1">Production API Key</h3>
                <p className="text-xs text-white/40 mb-4">Use this key to authenticate requests to the LeadFlow AI REST API.</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/60 font-mono tracking-wider flex items-center justify-between">
                    <span>{apiKey}</span>
                    <button onClick={() => {navigator.clipboard.writeText(apiKey); showToast("Copied to clipboard!");}} className="text-white/40 hover:text-white transition-colors">
                      <Copy size={16} />
                    </button>
                  </div>
                  <button onClick={handleRollApiKey} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shrink-0">
                    Roll Key
                  </button>
                </div>
              </div>

              <div className="p-5 border border-dashed border-white/10 rounded-2xl text-center">
                <Terminal size={24} className="mx-auto text-white/20 mb-3" />
                <h3 className="font-bold text-white mb-1">Webhooks Configuration</h3>
                <p className="text-sm text-white/40 mb-4">Configure outbound payloads for real-time CRM events.</p>
                <button onClick={() => alert("Webhook endpoint configuration opens in Phase 7.")} className="text-sm text-violet-400 font-bold hover:text-violet-300 transition-colors">
                  + Add Endpoint
                </button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold border-b border-white/5 pb-4 mb-6">Security & Access</h2>
              
              <div className="space-y-4">
                <div className="p-5 bg-black/20 border border-white/5 rounded-2xl flex items-start justify-between">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Key size={16} className="text-violet-400"/> Two-Factor Authentication</h3>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">Require an additional security code from an authenticator app when signing in to this workspace.</p>
                  </div>
                  <button 
                    onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${is2FAEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 rounded-full absolute top-1 transition-all ${is2FAEnabled ? 'bg-white left-7' : 'bg-white/40 left-1'}`}></div>
                  </button>
                </div>

                <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <h3 className="font-bold text-rose-400">Danger Zone</h3>
                  <p className="text-xs text-white/40 mt-1 mb-4">Permanently delete this workspace and all associated data. This action cannot be undone.</p>
                  <button onClick={handleDeleteWorkspace} className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                    Delete Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- INVITE MEMBER MODAL --- */}
      {isInviteModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" onClick={() => setIsInviteModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0d0e12] border border-white/10 shadow-2xl z-50 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold">Invite Team Member</h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="p-6 space-y-5">
              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Email Address</label>
                <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider font-bold">Role Assignment</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-violet-500 transition-colors appearance-none">
                  <option className="bg-[#1a1b23]">Sales Rep</option>
                  <option className="bg-[#1a1b23]">Support Agent</option>
                  <option className="bg-[#1a1b23]">Manager</option>
                  <option className="bg-[#1a1b23]">Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)] mt-4">
                Send Invitation
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  );
}