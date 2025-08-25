import React from 'react';

interface PersonCardProps {
  title: string;
  age: number;
  income: number;
  outside: number;
  super: number;
  onAgeChange: (value: number) => void;
  onIncomeChange: (value: number) => void;
  onOutsideChange: (value: number) => void;
  onSuperChange: (value: number) => void;
}

export default function PersonCard({
  title,
  age,
  income,
  outside,
  super: superBalance,
  onAgeChange,
  onIncomeChange,
  onOutsideChange,
  onSuperChange
}: PersonCardProps) {
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    marginTop: 0,
    color: '#111827'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    color: '#374151'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'inherit'
  };

  const comingSoonStyle: React.CSSProperties = {
    marginTop: 16
  };

  const detailsStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '8px 12px',
    backgroundColor: '#f9fafb'
  };

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#6b7280',
    padding: '4px 0'
  };

  const placeholderStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    lineHeight: 1.4
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{title}</h3>
      
      <label style={labelStyle}>
        Age
        <input 
          type="number" 
          value={age} 
          onChange={e => onAgeChange(+e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Income
        <input 
          type="number" 
          value={income} 
          onChange={e => onIncomeChange(+e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Outside
        <input 
          type="number" 
          value={outside} 
          onChange={e => onOutsideChange(+e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Super
        <input 
          type="number" 
          value={superBalance} 
          onChange={e => onSuperChange(+e.target.value)}
          style={inputStyle}
        />
      </label>

      <div style={comingSoonStyle}>
        <details style={detailsStyle}>
          <summary style={summaryStyle}>Tax & Benefits (coming soon)</summary>
          <div style={placeholderStyle}>
            <div>• HECS/HELP debt: Not yet configured</div>
            <div>• Private health insurance: Not yet configured</div>
            <div>• Insurance in super: Not yet configured</div>
            <div style={{ marginTop: 8, fontStyle: 'italic' }}>
              These will enable more precise tax calculations and optimization in future updates.
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}