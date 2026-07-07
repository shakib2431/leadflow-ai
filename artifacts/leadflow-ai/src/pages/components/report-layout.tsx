"use client";

import { LucideIcon } from "lucide-react";
import React from "react";

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}

export function ReportLayout({
  title,
  subtitle,
  icon: Icon,
  children,
  breadcrumb,
}: ReportLayoutProps) {
  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "linear-gradient(180deg, #F7F8FC 0%, #F1F2F9 100%)" }}>
      {/* Hero header */}
      <div className="px-4 py-5 md:px-6 sticky top-0 z-20" style={{ background: "linear-gradient(180deg, #F7F8FC 0%, rgba(241,242,249,0.85) 100%)", backdropFilter: "blur(6px)" }}>
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-sm mb-3">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-400">/</span>}
                {item.href ? (
                  <a href={item.href} className="text-indigo-600 hover:text-indigo-700">
                    {item.label}
                  </a>
                ) : (
                  <span className="text-slate-500">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <header
          className="hrms-animate-in"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 22,
            border: "1px solid #E9ECF5",
            background: "linear-gradient(115deg, #ffffff 0%, #f3f2ff 42%, #e9f0ff 100%)",
            boxShadow: "0 14px 40px rgba(79,70,229,0.09)",
            padding: "22px 26px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div style={{ position: "absolute", top: -90, right: 90, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 68%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -120, right: -70, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg, #6366F1, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(79,70,229,0.35)", flexShrink: 0 }}>
            {Icon && <Icon size={25} color="#fff" />}
          </div>
          <div style={{ position: "relative", minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px", borderRadius: 20, background: "rgba(79,70,229,0.10)", color: "#4F46E5", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
              Reporting Center
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: "9px 0 0", letterSpacing: "-0.03em", lineHeight: 1.15 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 13, color: "#475569", marginTop: 5, maxWidth: 720 }}>{subtitle}</p>}
          </div>
        </header>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 pb-6 space-y-6">
        {children}
      </div>
    </div>
  );
}
