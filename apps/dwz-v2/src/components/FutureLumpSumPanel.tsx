import React from 'react';
import { auMoney0 } from '../lib/format';

interface FutureLumpSumPanelProps {
  amount: number;
  ageYou: number;
  onAmountChange: (value: number) => void;
  onAgeYouChange: (value: number) => void;
}

export default function FutureLumpSumPanel({
  amount,
  ageYou,
  onAmountChange,
  onAgeYouChange
}: FutureLumpSumPanelProps) {
  const containerStyle: React.CSSProperties = {
    padding: 16,
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: 16,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #F3F4F6',
    fontSize: 15,
    color: '#111827',
    letterSpacing: '0.025em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    marginTop: 4,
  };

  return (
    <section style={containerStyle}>
      <div style={titleStyle}>
        Future inflow (outside)
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        fontSize: 13,
        marginBottom: 8
      }}>
        <label style={{ display: 'block', color: '#6b7280' }}>
          Amount (A$)
          <input
            style={inputStyle}
            type="number"
            step="1000"
            value={amount || ''}
            onChange={e => onAmountChange(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
          />
        </label>
        
        <label style={{ display: 'block', color: '#6b7280' }}>
          When you are age
          <input
            style={inputStyle}
            type="number"
            step="1"
            value={ageYou || ''}
            onChange={e => onAgeYouChange(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
          />
        </label>
      </div>
      
      <div style={{ 
        fontSize: 11, 
        color: '#9ca3af',
        marginBottom: 8
      }}>
        Will be added <em>before growth</em> in that year (DWZ order). Default destination: outside.
      </div>
      
      {(amount > 0 && ageYou > 0) && (
        <div style={{
          fontSize: 12,
          color: '#059669',
          fontWeight: 500,
          padding: 8,
          backgroundColor: '#ecfdf5',
          borderRadius: 6,
          border: '1px solid #d1fae5'
        }}>
          Configured: {auMoney0(amount)} at age {ageYou}
        </div>
      )}
    </section>
  );
}