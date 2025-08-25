import React from 'react';

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
    <details style={{ marginTop: 16 }}>
      <summary>Plan-First: Set Your Target Spending</summary>
      <div style={{ marginTop: 8, padding: 8, background: "#f8f9ff", borderRadius: 4 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <strong>Annual spending target (today's dollars)</strong>
          <input 
            type="text" 
            inputMode="numeric" 
            placeholder="e.g. 100000" 
            value={planSpend ?? ''} 
            onChange={onChange}
            style={{ 
              width: '100%', 
              border: '1px solid #ccc', 
              borderRadius: 4, 
              padding: '6px 8px', 
              marginTop: 4,
              fontSize: 14 
            }}
          />
        </label>
        
        {loading && (
          <p style={{ fontSize: 12, color: "#666", margin: '8px 0' }}>
            Finding earliest age for your plan...
          </p>
        )}
        
        {planSpend && result && !loading && (
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {result.earliestAge !== null ? (
              <div style={{ color: '#059669' }}>
                <strong>✅ At your plan ${planSpend.toLocaleString()}/yr, earliest viable age is {result.earliestAge}.</strong>
                {result.atAgeSpend && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    DWZ sustainable spending at that age: ${Math.round(result.atAgeSpend).toLocaleString()}/yr
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#dc2626' }}>
                <strong>❌ Your plan ${planSpend.toLocaleString()}/yr is not achievable under current assumptions.</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Try reducing expenses, increasing savings, or adjusting other parameters.
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              Analysis completed in {result.evaluations} evaluations
            </div>
          </div>
        )}
        
        <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.4 }}>
          <strong>How it works:</strong> Enter your target annual spending. We'll find the earliest age 
          where you can retire and sustain that spending level while still depleting to ~$0 at life expectancy 
          (true DWZ methodology).
        </div>
      </div>
    </details>
  );
}