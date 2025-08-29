import React from 'react';

export default function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-white/60 p-3 md:p-4 ${className}`}>
      <header className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </section>
  );
}