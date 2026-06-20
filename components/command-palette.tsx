"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, Sparkles, UserPlus, Building2, 
  LayoutDashboard, Mail, Layers, Users, Bot, X 
} from "lucide-react";

type Action = {
  id: string;
  name: string;
  shortcut?: string;
  icon: React.ElementType;
  section: "Navigation" | "Actions" | "Recent";
  perform: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle the palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Auto-focus input when opened & clear search when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  // Define the global actions mapped to our new architecture
  const actions: Action[] = [
    {
      id: "add-lead",
      name: "Create New Contact...",
      shortcut: "C",
      icon: UserPlus,
      section: "Actions",
      perform: () => { console.log("Trigger Add Lead Modal"); setOpen(false); }
    },
    {
      id: "ai-queue",
      name: "Open AI Action Queue",
      shortcut: "Q",
      icon: Sparkles,
      section: "Actions",
      perform: () => { router.push("/action-queue"); setOpen(false); }
    },
    {
      id: "nav-dash",
      name: "Go to Dashboard",
      icon: LayoutDashboard,
      section: "Navigation",
      perform: () => { router.push("/"); setOpen(false); }
    },
    {
      id: "nav-inbox",
      name: "Go to Unified Inbox",
      icon: Mail,
      section: "Navigation",
      perform: () => { router.push("/inbox"); setOpen(false); }
    },
    {
      id: "nav-pipeline",
      name: "Go to Sales Pipeline",
      icon: Layers,
      section: "Navigation",
      perform: () => { router.push("/pipeline"); setOpen(false); }
    },
    {
      id: "nav-companies",
      name: "View Companies Database",
      icon: Building2,
      section: "Navigation",
      perform: () => { router.push("/companies"); setOpen(false); }
    },
    {
      id: "nav-contacts",
      name: "View Contacts Database",
      icon: Users,
      section: "Navigation",
      perform: () => { router.push("/contacts"); setOpen(false); }
    },
    {
      id: "nav-playbooks",
      name: "AI Playbooks & Automations",
      icon: Bot,
      section: "Navigation",
      perform: () => { router.push("/playbooks"); setOpen(false); }
    },
    {
      id: "recent-valerin",
      name: "Valerin (Company)",
      icon: Building2,
      section: "Recent",
      perform: () => { console.log("Route to Valerin"); setOpen(false); }
    }
  ];

  // Filter actions based on search input
  const filteredActions = search.trim() === "" 
    ? actions 
    : actions.filter((action) => action.name.toLowerCase().includes(search.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Blurred Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Palette Window */}
      <div className="relative w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-white/[0.06] gap-3 bg-[#0a0a0f]">
          <Search size={20} className="text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-lg font-medium"
          />
          <kbd className="px-2 py-1 rounded bg-white/5 text-[10px] text-white/40 font-bold border border-white/10 uppercase tracking-widest">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar bg-[#0d0d14]">
          {filteredActions.length === 0 ? (
            <div className="p-10 text-center text-white/40 text-sm">
              No results found for "<span className="text-white/80">{search}</span>"
            </div>
          ) : (
            <>
              {/* Group by Section dynamically */}
              {(["Actions", "Recent", "Navigation"] as const).map((section) => {
                const sectionActions = filteredActions.filter(a => a.section === section);
                if (sectionActions.length === 0) return null;

                return (
                  <div key={section} className="mb-4 last:mb-0">
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      {section}
                    </div>
                    <div className="space-y-1">
                      {sectionActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={action.perform}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.06] transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/[0.03] text-white/40 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                              <action.icon size={16} />
                            </div>
                            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                              {action.name}
                            </span>
                          </div>
                          {action.shortcut && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-[10px] font-bold text-white/40 border border-white/10">
                                ⌘
                              </span>
                              <span className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-[10px] font-bold text-white/40 border border-white/10">
                                {action.shortcut}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}