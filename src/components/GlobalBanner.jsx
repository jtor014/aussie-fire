import React from 'react';

/**
 * Global banner that displays retirement decision status (T-011 updated copy).
 * Shows real-time results directly under page title for DWZ mode.
 * 
 * @param {Object} props
 * @param {Object} props.decision - Decision object from decisionFromState
 * @param {string} props.dwzPlanningMode - 'earliest' | 'pinned'
 * @param {number} props.lifeExpectancy - Life expectancy for display
 * @param {number} props.bequest - Bequest amount for display
 * @returns {JSX.Element} Global banner component
 */
export function GlobalBanner({ decision, dwzPlanningMode, lifeExpectancy, bequest = 0 }) {
  if (!decision) {
    return null;
  }

  const { canRetireAtTarget, targetAge, earliestFireAge, kpis } = decision;
  
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
    backgroundColor: canRetireAtTarget ? '#dcfce7' : '#fef3c7',
    borderColor: canRetireAtTarget ? '#16a34a' : '#f59e0b',
    color: canRetireAtTarget ? '#166534' : '#92400e'
  };

  const detailStyle = {
    fontSize: '14px',
    fontWeight: '400',
    marginTop: '8px',
    opacity: 0.9
  };

  // Generate main message based on planning mode and viability (T-011R fixed)
  let mainMessage;
  let secondaryMessage = null;

  if (dwzPlanningMode === 'earliest') {
    if (canRetireAtTarget) {
      const desiredSpend = formatMoney(kpis.planSpend || kpis.S_pre || kpis.S_post || 0);
      mainMessage = (
        <>
          🎯 Earliest you can retire: <strong>{targetAge}</strong> at <strong>${desiredSpend}/yr</strong> (L={lifeExpectancy}, Bequest=${formatMoney(bequest)})
        </>
      );
    } else {
      mainMessage = <>❌ Cannot achieve retirement with current settings</>;
    }
  } else {
    // Pinned mode (T-011R: improved copy)
    if (canRetireAtTarget) {
      if (earliestFireAge && earliestFireAge < targetAge) {
        mainMessage = (
          <>
            ✅ On track to retire at <strong>{targetAge}</strong> (Earliest possible today: {earliestFireAge})
          </>
        );
      } else {
        mainMessage = <>✅ On track to retire at <strong>{targetAge}</strong></>;
      }
    } else {
      if (earliestFireAge) {
        mainMessage = (
          <>
            ❌ Cannot retire at age <strong>{targetAge}</strong> (pinned). Earliest possible today: {earliestFireAge}.
          </>
        );
      } else {
        mainMessage = <>❌ Cannot retire at age <strong>{targetAge}</strong> (pinned)</>;
      }
    }
  }

  // Secondary line: sustainable spending details (T-011R fixed)
  if (kpis.S_pre && kpis.S_post) {
    const preSpend = formatMoney(kpis.S_pre);
    const postSpend = formatMoney(kpis.S_post);
    if (Math.abs(kpis.S_pre - kpis.S_post) > 1000) {
      secondaryMessage = (
        <>
          Sustainable (DWZ): <strong>${preSpend}/yr before super</strong> • <strong>${postSpend}/yr after super</strong>
        </>
      );
    } else {
      secondaryMessage = (
        <>
          Sustainable (DWZ): <strong>${preSpend}/yr</strong>
        </>
      );
    }
  }

  return (
    <div style={bannerStyle} aria-live="polite">
      <div>{mainMessage}</div>
      {secondaryMessage && <div style={detailStyle}>{secondaryMessage}</div>}
    </div>
  );
}