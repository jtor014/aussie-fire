import React from 'react';
import { auMoney0 } from '../lib/format';
import { splitSalarySacrifice } from '../lib/suggestSalarySacrifice';

interface PersonSuperSettingsProps {
  index: number;
  salary: number;
  sgRate: number; // 0 means using ATO default
  atoSGRate: number; // Current ATO SG rate
  capPerPerson: number;
  onSalaryChange: (value: number) => void;
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
  onSalaryChange,
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

  return (
    <div style={{
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ 
        fontWeight: 500, 
        marginBottom: 12,
        fontSize: 14,
        color: '#374151'
      }}>
        Super Settings
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 12,
        fontSize: 13
      }}>
        <label style={{
          display: 'block',
          color: '#6b7280'
        }}>
          Salary (gross, A$)
          <input 
            type="number" 
            step="1000"
            value={salary || ''} 
            onChange={e => onSalaryChange(Math.max(0, Number(e.target.value) || 0))}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              marginTop: 4
            }}
            placeholder="0"
          />
        </label>
        
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