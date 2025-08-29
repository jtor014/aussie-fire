import React from 'react';

export default function InfoChips({ items }: { items: string[] }) {
  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  };
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 9999,
    border: '1px solid #E5E7EB',      // light gray
    background: '#F9FAFB',             // near-white
    padding: '2px 8px',
    fontSize: 11,
    color: '#374151',                   // gray-700
    lineHeight: 1.2,
  };
  return (
    <div style={wrapStyle} aria-label="info-chips">
      {items.map((t, i) => (
        <span key={i} style={chipStyle}>{t}</span>
      ))}
    </div>
  );
}