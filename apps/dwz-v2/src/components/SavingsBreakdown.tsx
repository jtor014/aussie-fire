import React from 'react';
import { auMoney0 } from '../lib/format';

interface SavingsBreakdownProps {
  annualSavings: number;
  autoOptimize: boolean;
  optimizerData?: { recommendedPct: number } | null;
  personalMTRs: number[];
  allRemainingCaps: number[];
}

export default function SavingsBreakdown({
  annualSavings,
  autoOptimize,
  optimizerData,
  personalMTRs,
  allRemainingCaps
}: SavingsBreakdownProps) {
  const S = Math.max(0, Number(annualSavings || 0)); // gross savings capacity
  
  if (S === 0) return null; // Don't show breakdown if no savings
  
  // Total SS gross chosen by optimizer (or 0 if off)
  const ssGross = autoOptimize && optimizerData?.recommendedPct != null 
    ? Math.max(0, Math.round(S * optimizerData.recommendedPct)) 
    : 0;
  const outsideGross = Math.max(0, S - ssGross);

  // Weight remaining gross by income shares to estimate per-person net outside
  // This is a simplified approximation - the exact calculation would need the allocator result
  const weightedMTR = personalMTRs.length > 0 
    ? personalMTRs.reduce((sum, mtr, i) => {
        const weight = allRemainingCaps[i] || 0;
        const totalCap = allRemainingCaps.reduce((s, c) => s + c, 0) || 1;
        return sum + mtr * (weight / totalCap);
      }, 0)
    : 0.32; // fallback MTR
  
  const outsideNet = Math.round(outsideGross * (1 - weightedMTR));

  return (
    <div style={{
      fontSize: 13,
      marginTop: 8,
      padding: 12,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ 
        fontWeight: 600, 
        marginBottom: 8, 
        color: '#374151' 
      }}>
        Savings allocation this year
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>
            {auMoney0(ssGross)}
          </div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            to <strong>super (salary-sacrifice, gross)</strong>
          </div>
        </div>
        
        <div>
          <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>
            {auMoney0(outsideNet)}
          </div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            to <strong>outside (net after tax)</strong>
          </div>
        </div>
      </div>
      
      <div style={{ 
        fontSize: 11, 
        color: '#9ca3af', 
        marginTop: 8,
        borderTop: '1px solid #e5e7eb',
        paddingTop: 6
      }}>
        Employer SG is separate and not deducted from your "Savings" amount.
      </div>
    </div>
  );
}