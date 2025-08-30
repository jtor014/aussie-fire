import React from 'react';
import { auMoney0 } from '../lib/format';

interface FutureInflow {
  ageYou: number;
  amount: number;
  to?: 'outside' | 'super';
}

interface FutureInflowsPanelProps {
  value: FutureInflow[];
  onChange: (value: FutureInflow[]) => void;
}

export default function FutureInflowsPanel({ value, onChange }: FutureInflowsPanelProps) {
  const add = () => {
    onChange([...value, { amount: 0, ageYou: 0, to: 'outside' }]);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const update = (index: number, updates: Partial<FutureInflow>) => {
    onChange(value.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

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
    fontFamily: 'inherit',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'inherit',
    backgroundColor: '#fff',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
  };

  const removeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 10px',
  };

  const hasValidInflows = value.some(inf => inf.amount > 0 && inf.ageYou > 0);

  return (
    <section style={containerStyle}>
      <div style={titleStyle}>
        Future inflows (windfalls/inheritance)
      </div>
      
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
        Model multiple lump sums like inheritance, property sales, or redundancy payments. 
        Applied <em>before growth</em> in the year you reach the specified age.
      </div>

      {value.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '24px 0',
          color: '#6b7280',
          fontSize: 13
        }}>
          No future inflows configured
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {value.map((inflow, index) => (
            <div key={index} style={{
              padding: 12,
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr auto',
                gap: 12,
                alignItems: 'end'
              }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: 13 }}>
                  Amount (A$)
                  <input
                    style={inputStyle}
                    type="number"
                    step="1000"
                    value={inflow.amount || ''}
                    onChange={e => update(index, { amount: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0"
                  />
                </label>
                
                <label style={{ display: 'block', color: '#6b7280', fontSize: 13 }}>
                  When you are age
                  <input
                    style={inputStyle}
                    type="number"
                    step="1"
                    value={inflow.ageYou || ''}
                    onChange={e => update(index, { ageYou: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0"
                  />
                </label>

                <label style={{ display: 'block', color: '#6b7280', fontSize: 13 }}>
                  Destination
                  <select
                    style={selectStyle}
                    value={inflow.to || 'outside'}
                    onChange={e => update(index, { to: e.target.value as 'outside' | 'super' })}
                  >
                    <option value="outside">Outside (liquid)</option>
                    <option value="super">Super (locked)</option>
                  </select>
                </label>

                <button
                  style={removeButtonStyle}
                  onClick={() => remove(index)}
                  title="Remove this inflow"
                >
                  ✕
                </button>
              </div>

              {inflow.amount > 0 && inflow.ageYou > 0 && (
                <div style={{
                  fontSize: 12,
                  color: '#059669',
                  marginTop: 8,
                  fontWeight: 500,
                }}>
                  ✓ {auMoney0(inflow.amount)} at age {inflow.ageYou} → {inflow.to || 'outside'}
                </div>
              )}

              {inflow.to === 'super' && inflow.ageYou < 60 && (
                <div style={{
                  fontSize: 11,
                  color: '#dc2626',
                  marginTop: 4,
                  fontStyle: 'italic'
                }}>
                  Note: Super inflows before age 60 are locked and may delay retirement if bridge period is tight
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        style={{
          ...addButtonStyle,
          marginTop: 12,
          width: 'auto',
        }}
        onClick={add}
      >
        + Add inflow
      </button>

      {hasValidInflows && (
        <div style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#ecfdf5',
          borderRadius: 8,
          border: '1px solid #d1fae5',
          fontSize: 12,
          color: '#059669',
        }}>
          <strong>Summary:</strong>
          {value.filter(inf => inf.amount > 0 && inf.ageYou > 0).map((inf, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              • {auMoney0(inf.amount)} at age {inf.ageYou} → {inf.to || 'outside'}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}