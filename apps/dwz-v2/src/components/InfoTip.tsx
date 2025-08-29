import React from 'react';

export default function InfoTip({ children }: { children: React.ReactNode }) {
  const summaryStyle: React.CSSProperties = {
    display: 'inline-block',
    marginLeft: 8,
    cursor: 'pointer',
    fontSize: 12,
    color: '#1D4ED8', // blue-700
    userSelect: 'none',
  };
  const boxStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    padding: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    maxWidth: '65ch',
  };
  return (
    <details style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <summary style={summaryStyle}>Learn more</summary>
      <div style={boxStyle}>{children}</div>
    </details>
  );
}