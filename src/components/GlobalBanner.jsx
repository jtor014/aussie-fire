import React from 'react';

/**
 * Global banner that displays retirement decision status.
 * Shows real-time results directly under page title for DWZ mode.
 * 
 * @param {Object} props
 * @param {Object} props.decision - Decision object from decisionFromState
 * @param {string} props.dwzPlanningMode - 'earliest' | 'pinned'
 * @returns {JSX.Element} Global banner component
 */
export function GlobalBanner({ decision, dwzPlanningMode }) {
  if (!decision) {
    return null;
  }

  const { canRetireAtTarget, targetAge, earliestFireAge, kpis, dwzPlanningMode: mode } = decision;
  
  // Banner styling
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
    marginTop: '4px',
    opacity: 0.9
  };

  // Generate main message based on planning mode and viability
  let mainMessage;
  let detailMessage = null;

  if (dwzPlanningMode === 'earliest') {
    if (canRetireAtTarget) {
      mainMessage = `🎯 You can retire at age ${targetAge} with Die-With-Zero`;
      if (kpis.S_pre && kpis.S_post && Math.abs(kpis.S_pre - kpis.S_post) > 1000) {
        const preFmt = Math.round(kpis.S_pre).toLocaleString();
        const postFmt = Math.round(kpis.S_post).toLocaleString();
        detailMessage = `Sustainable spending: $${preFmt}/yr before super, $${postFmt}/yr after`;
      } else {
        const planSpend = Math.round(kpis.planSpend || kpis.S_pre || kpis.S_post || 0).toLocaleString();
        detailMessage = `Sustainable spending: $${planSpend}/yr`;
      }
    } else {
      mainMessage = `❌ Cannot achieve retirement with current settings`;
      if (earliestFireAge) {
        detailMessage = `Need to adjust expectations or save more to reach age ${earliestFireAge}`;
      } else {
        detailMessage = `FIRE not achievable with current savings and income`;
      }
    }
  } else {
    // Pinned mode
    if (canRetireAtTarget) {
      mainMessage = `✅ On track to retire at age ${targetAge}`;
      if (earliestFireAge && earliestFireAge < targetAge) {
        const yearsSaved = targetAge - earliestFireAge;
        detailMessage = `You could retire ${yearsSaved} year${yearsSaved > 1 ? 's' : ''} earlier at age ${earliestFireAge}`;
      } else {
        const planSpend = Math.round(kpis.planSpend || 0).toLocaleString();
        detailMessage = `Sustainable spending: $${planSpend}/yr`;
      }
    } else {
      mainMessage = `❌ Cannot retire at age ${targetAge}`;
      if (earliestFireAge) {
        detailMessage = `Earliest possible today: Age ${earliestFireAge}`;
      } else {
        detailMessage = `Need to save more or reduce target spending`;
      }
    }
  }

  return (
    <div style={bannerStyle}>
      <div>{mainMessage}</div>
      {detailMessage && <div style={detailStyle}>{detailMessage}</div>}
    </div>
  );
}