import React from 'react';

interface PanelCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function PanelCard({ children, className = '' }: PanelCardProps) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-[#0f172a] p-5 shadow-xl ${className}`}>
      {children}
    </section>
  );
}
