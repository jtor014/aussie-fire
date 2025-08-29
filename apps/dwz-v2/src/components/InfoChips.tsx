import React from 'react';

export default function InfoChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}