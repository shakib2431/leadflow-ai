import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function MetricCard({ title, value, subtitle, icon, className = '' }: MetricCardProps) {
  return (
    <div className={`bg-[#0d0e12] p-6 rounded-3xl border border-white/5 shadow-xl ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/2 flex items-center justify-center text-white/40">
          {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-white/40">{title}</span>
      </div>
      <h2 className="text-3xl font-bold">{value}</h2>
      {subtitle && <p className="text-xs text-white/40 mt-2">{subtitle}</p>}
    </div>
  );
}
