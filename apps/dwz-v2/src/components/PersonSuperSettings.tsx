import React from 'react';
import { auMoney0 } from '../lib/format';
import { splitSalarySacrifice } from '../lib/suggestSalarySacrifice';

interface PersonSuperSettingsProps {
  index: number;
  salary: number; // Now represents income (read-only display)
  sgRate: number; // 0 means using ATO default
  atoSGRate: number; // Current ATO SG rate
  capPerPerson: number;
  onSGRateChange: (value: number) => void;
  // Optimizer data
  autoOptimize: boolean;
  optimizerData?: { recommendedPct: number } | null;
  annualSavings: number;
  // For splitting recommendation across people
  allRemainingCaps: number[];
}

export default function PersonSuperSettings({
  index,
  salary,
  sgRate,
  atoSGRate,
  capPerPerson,
  onSGRateChange,
  autoOptimize,
  optimizerData,
  annualSavings,
  allRemainingCaps
}: PersonSuperSettingsProps) {
  
  // Calculate derived values
  const effectiveSGRate = sgRate || atoSGRate;
  const employerSGGross = Math.max(0, Math.round(salary * effectiveSGRate));
  const employerSGNet = Math.round(employerSGGross * 0.85); // After 15% contributions tax
  const remainingCap = Math.max(0, capPerPerson - employerSGGross);
  
  // Calculate optimizer suggestion for this person
  const householdRecommendedGross = autoOptimize && optimizerData?.recommendedPct != null
    ? Math.max(0, Math.round(annualSavings * optimizerData.recommendedPct))
    : 0;
    
  const splitRecommendations = splitSalarySacrifice(householdRecommendedGross, allRemainingCaps);
  const recommendedForThisPerson = splitRecommendations[index] || 0;

  const containerStyle: React.CSSProperties = {
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    border: '2px solid #E5E7EB',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.2s ease',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: '1px solid #F3F4F6',
    fontSize: 15,
    color: '#111827',
    letterSpacing: '0.025em',
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        Super Settings
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 12,
        fontSize: 13
      }}>
        <div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Salary (from Income)</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{auMoney0(salary)}</div>
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
            This mirrors the Income field above.
          </div>
        </div>
        
        <label style={{
          display: 'block',
          color: '#6b7280'
        }}>
          SG rate (%)
          <input 
            type="number" 
            step="0.1"
            value={sgRate ? (sgRate * 100).toFixed(1) : ''}
            placeholder={`ATO default (${(atoSGRate * 100).toFixed(1)}%)`}
            onChange={e => onSGRateChange(Math.max(0, Math.min(1, (Number(e.target.value) || 0) / 100)))}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              marginTop: 4
            }}
          />
        </label>
        
        <div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Employer SG (gross)</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{auMoney0(employerSGGross)}</div>
          {employerSGGross > 0 && (
            <div style={{ color: '#9ca3af', fontSize: 11 }}>
              Net: {auMoney0(employerSGNet)}
            </div>
          )}
        </div>
        
        <div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Remaining concessional cap</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>
            {auMoney0(remainingCap)} 
            <span style={{ color: '#9ca3af', fontSize: 11 }}> of {auMoney0(capPerPerson)}</span>
          </div>
          {employerSGGross >= capPerPerson && (
            <div style={{ color: '#f59e0b', fontSize: 11 }}>
              Cap fully used by employer SG
            </div>
          )}
          
          {/* Visual cap usage bar */}
          <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af' }}>
            <div style={{ marginBottom: 2 }}>Cap usage:</div>
            <div style={{ 
              width: '100%', 
              height: 8, 
              background: '#f1f5f9', 
              borderRadius: 4, 
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* SG portion */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${Math.min(100, (employerSGGross / capPerPerson) * 100)}%`,
                background: '#3b82f6',
                borderRadius: '4px 0 0 4px'
              }} />
              {/* Suggested SS portion */}
              {recommendedForThisPerson > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${Math.min(100, (employerSGGross / capPerPerson) * 100)}%`,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(100 - (employerSGGross / capPerPerson) * 100, (recommendedForThisPerson / capPerPerson) * 100)}%`,
                  background: '#10b981',
                  borderRadius: employerSGGross === 0 ? '4px 0 0 4px' : '0'
                }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9 }}>
              <span>SG: {auMoney0(employerSGGross)}</span>
              <span>SS: {recommendedForThisPerson > 0 ? auMoney0(recommendedForThisPerson) : '—'}</span>
              <span>Cap: {auMoney0(capPerPerson)}</span>
            </div>
          </div>
        </div>
        
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Optimizer suggested salary-sacrifice (gross)</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>
            {recommendedForThisPerson > 0 ? auMoney0(recommendedForThisPerson) : '—'}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
            {autoOptimize 
              ? 'Suggested amount respects remaining cap. Household split may change with inputs.'
              : 'Turn on Auto-optimise to see a suggestion.'
            }
          </div>
        </div>
      </div>
    </div>
  );
}