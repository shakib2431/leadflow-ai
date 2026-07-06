"use client";

import React from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#07070a] text-white font-sans selection:bg-violet-500/30 selection:text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">{title.split(' ')[0]}</p>
          <h1 className="text-4xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="max-w-3xl text-sm text-slate-300">{subtitle}</p>}
        </div>

        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
