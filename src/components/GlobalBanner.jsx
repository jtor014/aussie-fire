import React from 'react';

/**
 * Global banner that displays retirement decision status (T-015 DWZ-only).
 * Shows earliest retirement age and sustainable spending.
 * 
 * @param {Object} props
 * @param {Object} props.decision - Decision object from decisionFromState
 * @param {number} props.lifeExpectancy - Life expectancy for display
 * @param {number} props.bequest - Bequest amount for display
 * @returns {JSX.Element} Global banner component
 */
export function GlobalBanner({ decision, lifeExpectancy, bequest = 0 }) {
  if (!decision) {
    return null;
  }

  const { canRetireAtTarget, targetAge, earliestFireAge, kpis: decisionKpis } = decision;
  
  // T-022: Check viability - only show green if truly viable (both horizon + bridge)
  const isViable = decisionKpis?.viable && earliestFireAge;
  const bridge = decisionKpis?.bridge || {};
  
  // Helper function to format money values with thousands separators
  const formatMoney = (amount) => {
    return Math.round(amount).toLocaleString();
  };
  
  // T-022: Banner styling based on viability (green only when fully viable)
  const bannerStyle = {
    width: '100%',
    padding: '16px 20px',
    marginBottom: '20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center',
    border: '2px solid',
    backgroundColor: isViable ? '#dcfce7' : '#fef3c7',
    borderColor: isViable ? '#16a34a' : '#f59e0b',
    color: isViable ? '#166534' : '#92400e'
  };

  const detailStyle = {
    fontSize: '14px',
    fontWeight: '400',
    marginTop: '8px',
    opacity: 0.9
  };

  // T-022: Viability-gated messaging
  let mainMessage;
  let secondaryMessage = null;

  if (isViable) {
    // Green message: fully viable retirement
    const desiredSpend = formatMoney(decisionKpis.sustainableAnnual || decisionKpis.planSpend || 0);
    mainMessage = (
      <>
        🎯 You can retire at age <strong>{earliestFireAge}</strong> with Die-With-Zero
      </>
    );
    secondaryMessage = (
      <>
        Sustainable spending: <strong>${desiredSpend}/yr</strong> (L={lifeExpectancy}, Bequest=${formatMoney(bequest)})
      </>
    );
  } else if (decisionKpis?.earliestTheoreticalAge) {
    // Amber message: theoretical age exists but bridge constraint fails
    const theoreticalAge = decisionKpis.earliestTheoreticalAge;
    const shortfall = bridge.shortfall || 0;
    const years = bridge.years || 0;
    const need = bridge.need || 0;
    const have = bridge.have || 0;
    
    mainMessage = (
      <>
        ⚠️ Earliest theoretical age is <strong>{theoreticalAge}</strong>, but bridge is short by <strong>${formatMoney(shortfall)}</strong>
      </>
    );
    secondaryMessage = (
      <>
        Need ${formatMoney(need)} for {years} years, have ${formatMoney(have)}. Increase outside savings or retire later.
      </>
    );
  } else {
    // No viable retirement found
    mainMessage = <>❌ Cannot achieve retirement with current settings</>;
  }

  // T-022: Constraint-specific messaging
  let constraintMessage = null;
  if (isViable && decisionKpis?.limiting) {
    if (decisionKpis.limiting === 'bridge') {
      constraintMessage = `Bridge-limited: outside savings bottleneck until super unlock at age ${decision.preservationAge}.`;
    } else if (decisionKpis.limiting === 'horizon') {
      constraintMessage = `Horizon-limited: total horizon/bequest bottleneck (life expectancy ${lifeExpectancy}).`;
    }
  }

  return (
    <div style={bannerStyle} aria-live="polite">
      <div>{mainMessage}</div>
      {secondaryMessage && <div style={detailStyle}>{secondaryMessage}</div>}
      
      {/* T-022: New constraint messaging */}
      {constraintMessage && (
        <div style={{fontSize: '14px', color: 'rgba(0,0,0,0.6)', marginTop: '4px'}}>
          {constraintMessage}
        </div>
      )}
    </div>
  );
}