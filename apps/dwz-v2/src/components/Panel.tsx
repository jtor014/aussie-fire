import React from 'react';

export default function Panel({
  title,
  subtitle,
  definition,
  children,
  className = '',
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional muted definition/help block shown below subtitle */
  definition?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-white/60 p-3 md:p-4 ${className}`}>
      <header className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
        {definition && (
          <div className="mt-2 text-xs text-gray-700 bg-gray-50/80 border border-gray-200 rounded px-2 py-1.5">
            {definition}
          </div>
        )}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </section>
  );
}