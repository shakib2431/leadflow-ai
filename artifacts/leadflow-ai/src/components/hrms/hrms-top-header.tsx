

import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

type HRMSTopHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
};

// Polished command-center hero, matching the HRMS dashboard visual language.
export default function HRMSTopHeader({
  title,
  subtitle,
  actions,
  eyebrow = "HR Workspace",
  icon: Icon = Sparkles,
}: HRMSTopHeaderProps) {
  // Some pages render their own in-body title and pass an empty title as a placeholder.
  if (!title || !title.trim()) return null;
  return (
    <header
      className="hrms-animate-in"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        border: "1px solid #E9ECF5",
        background: "linear-gradient(115deg, #ffffff 0%, #f3f2ff 42%, #e9f0ff 100%)",
        boxShadow: "0 14px 40px rgba(79,70,229,0.09)",
        padding: "24px 26px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 18,
      }}
    >
      {/* decorative glows */}
      <div style={{ position: "absolute", top: -90, right: 90, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 68%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -130, right: -70, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg, #6366F1, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(79,70,229,0.35)", flexShrink: 0 }}>
          <Icon size={25} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px", borderRadius: 20, background: "rgba(79,70,229,0.10)", color: "#4F46E5", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            {eyebrow}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: "9px 0 0", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            {title}
          </h1>
          {subtitle ? (
            <p style={{ fontSize: 13, color: "#475569", marginTop: 5, maxWidth: 720 }}>{subtitle}</p>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
