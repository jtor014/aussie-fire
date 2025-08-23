import React from 'react';

/**
 * Summary chips showing key calculator settings in a compact format
 * Displays income shape, returns, and market assumptions as clickable chips
 * 
 * @param {Object} props
 * @param {boolean} props.ageBandsEnabled - Whether age-banded spending is enabled
 * @param {Object} props.ageBandSettings - Age band thresholds and multipliers
 * @param {number} props.lifeExpectancy - Life expectancy age for age band calculation
 * @param {number} props.expectedReturn - Expected return percentage
 * @param {number} props.inflationRate - Inflation rate percentage
 * @param {number} props.investmentFees - Investment fees percentage
 * @param {Function} props.onOpenAdvanced - Callback to open Advanced drawer
 * @returns {JSX.Element} Summary chips component
 */
export function SummaryChips({ 
  ageBandsEnabled,
  ageBandSettings,
  lifeExpectancy,
  expectedReturn,
  inflationRate,
  investmentFees,
  onOpenAdvanced
}) {
  const chipStyle = {
    display: 'inline-block',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
    marginRight: '8px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  };

  const chipHoverStyle = {
    backgroundColor: '#e5e7eb',
    borderColor: '#9ca3af'
  };

  // Format income shape chip text
  const incomeShapeText = ageBandsEnabled 
    ? `Age-banded (${ageBandSettings.gogoTo}/${ageBandSettings.slowTo}/${lifeExpectancy} · ${ageBandSettings.gogoMult}×/${ageBandSettings.slowMult}×/${ageBandSettings.nogoMult}×)`
    : 'Flat (1.00×)';

  // Calculate real return: (nominal - inflation) / (1 + inflation)
  const realReturn = ((expectedReturn - inflationRate) / (1 + inflationRate/100)).toFixed(1);

  const returnsText = `Returns: ${realReturn}% real (fees ${investmentFees}%)`;

  return (
    <div style={{ marginTop: '12px' }}>
      <div 
        style={chipStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, chipHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, chipStyle)}
        onClick={onOpenAdvanced}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenAdvanced();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Income shape settings - click to edit in Advanced panel"
      >
        {incomeShapeText}
      </div>
      
      <div 
        style={chipStyle}
        onMouseEnter={(e) => Object.assign(e.target.style, chipHoverStyle)}
        onMouseLeave={(e) => Object.assign(e.target.style, chipStyle)}
        onClick={onOpenAdvanced}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenAdvanced();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Market assumptions - click to edit in Advanced panel"
      >
        {returnsText}
      </div>
    </div>
  );
}