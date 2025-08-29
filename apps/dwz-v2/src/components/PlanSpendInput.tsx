import React from 'react';
import { auMoney0 } from '../lib/format';

interface PlanSpendInputProps {
  planSpend: number | null;
  onPlanSpendChange: (value: number | null) => void;
  result: { earliestAge: number | null; atAgeSpend?: number; evaluations: number } | null;
  loading: boolean;
}

export default function PlanSpendInput({ planSpend, onPlanSpendChange, result, loading }: PlanSpendInputProps) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const n = Number(value);
    onPlanSpendChange(Number.isFinite(n) && n > 0 ? n : null);
  };

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ padding: 12, background: "#f8f9ff", borderRadius: 8, border: "1px solid #e0e7ff" }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <strong style={{ fontSize: 16 }}>Annual spending target (today's dollars)</strong>
          <input 
            type="text" 
            inputMode="numeric" 
            placeholder="e.g. 95000" 
            value={planSpend ?? ''} 
            onChange={onChange}
            style={{ 
              width: '100%', 
              border: '1px solid #ccc', 
              borderRadius: 6, 
              padding: '10px 12px', 
              marginTop: 6,
              fontSize: 16,
              fontWeight: 500
            }}
          />
        </label>
        
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 8 }}>
          Default is pre-filled based on your household (couples: {auMoney0(95000)}). Adjust to your lifestyle.
        </div>
        
        {loading && (
          <p style={{ fontSize: 12, color: "#666", margin: '8px 0' }}>
            Finding earliest age for your plan...
          </p>
        )}
        
        {planSpend && result && !loading && (
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {result.earliestAge !== null ? (
              <div style={{ color: '#059669' }}>
                <strong>✅ At your plan {auMoney0(planSpend)}/yr, earliest viable age is {result.earliestAge}.</strong>
                {result.atAgeSpend && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    DWZ sustainable spending at that age: {auMoney0(Math.round(result.atAgeSpend))}/yr
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#dc2626' }}>
                <strong>❌ Your plan {auMoney0(planSpend)}/yr is not achievable under current assumptions.</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Try reducing expenses, increasing savings, or adjusting other parameters.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}