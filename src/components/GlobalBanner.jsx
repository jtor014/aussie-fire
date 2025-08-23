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
  
  // Helper function to format money values with thousands separators (T-011)
  const formatMoney = (amount) => {
    return Math.round(amount).toLocaleString();
  };
  
  // Banner styling with aria-live (T-011 accessibility)
  const bannerStyle = {
    width: '100%',
    padding: '16px 20px',
    marginBottom: '20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center',
    border: '2px solid',
    backgroundColor: earliestFireAge ? '#dcfce7' : '#fef3c7',
    borderColor: earliestFireAge ? '#16a34a' : '#f59e0b',
    color: earliestFireAge ? '#166534' : '#92400e'
  };

  const detailStyle = {
    fontSize: '14px',
    fontWeight: '400',
    marginTop: '8px',
    opacity: 0.9
  };

  // T-015: DWZ-only mode - always show earliest retirement age
  let mainMessage;
  let secondaryMessage = null;

  if (earliestFireAge) {
    const desiredSpend = formatMoney(decisionKpis.sustainableAnnual || decisionKpis.planSpend || 0);
    mainMessage = (
      <>
        Earliest you can retire: <strong>{earliestFireAge}</strong> at <strong>${desiredSpend}/yr</strong> (L={lifeExpectancy}, Bequest=${formatMoney(bequest)})
      </>
    );
  } else {
    mainMessage = <>Cannot achieve retirement with current settings</>;
  }

  // T-015: Secondary line with single sustainable spending amount
  if (decisionKpis.sustainableAnnual) {
    const sustainableSpend = formatMoney(decisionKpis.sustainableAnnual);
    secondaryMessage = (
      <>
        Sustainable (DWZ): <strong>${sustainableSpend}/yr</strong>
      </>
    );
  }

  return (
    <div style={bannerStyle} aria-live="polite">
      <div>{mainMessage}</div>
      {secondaryMessage && <div style={detailStyle}>{secondaryMessage}</div>}
    </div>
  );
}