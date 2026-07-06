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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-sm mb-3">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-400">/</span>}
                {item.href ? (
                  <a href={item.href} className="text-blue-600 hover:text-blue-700">
                    {item.label}
                  </a>
                ) : (
                  <span className="text-slate-600">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-start gap-3">
          {Icon && <Icon size={28} className="text-blue-600 mt-1" />}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {children}
      </div>
    </div>
  );
}
