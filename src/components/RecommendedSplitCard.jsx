import React, { useState } from 'react';

/**
 * Recommended contribution split card component
 * Shows read-only strategy recommendation with expandable rationale
 * 
 * @param {Object} props
 * @param {Object} props.strategySummary - Normalized strategy summary from selectStrategySummary
 * @param {Function} props.onAdjustStrategy - Callback to open Advanced drawer
 * @param {Function} props.onResetToRecommended - Callback to reset manual overrides
 * @returns {JSX.Element} Recommended split card
 */
export function RecommendedSplitCard({ strategySummary, onAdjustStrategy, onResetToRecommended }) {
  const [showRationale, setShowRationale] = useState(false);

  if (!strategySummary || !strategySummary.viable) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#374151', marginBottom: '16px', fontSize: 18, fontWeight: 600 }}>
          📊 Recommended Contribution Split
        </h3>
        <div style={{ color: '#6b7280' }}>Loading strategy recommendations...</div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const formatPercent = (decimal) => {
    return `${Math.round(decimal * 100)}%`;
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3 style={{ color: '#374151', marginBottom: '16px', fontSize: 18, fontWeight: 600 }}>
        📊 Recommended Contribution Split
      </h3>
      
      {/* Manual Override Pill */}
      {strategySummary.useManual && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '16px',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#92400e',
          marginBottom: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ Manual override active
          <button
            onClick={onResetToRecommended}
            style={{
              background: 'none',
              border: 'none',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0'
            }}
          >
            Reset to recommended
          </button>
        </div>
      )}

      {/* Strategy Summary */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Salary sacrifice: {formatCurrency(strategySummary.display.salarySacrifice)} (cap use {formatPercent(strategySummary.capUsePct)}) • 
          Outside: {formatCurrency(strategySummary.display.outside)}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {strategySummary.totalOut > 0 ? `Total savings: ${formatCurrency(strategySummary.totalOut)}/year` : ''}
        </div>
      </div>

      {/* Why this split? Expander */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowRationale(!showRationale)}
          style={{
            background: 'none',
            border: 'none',
            color: '#059669',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0',
            textDecoration: 'underline'
          }}
        >
          {showRationale ? '▼' : '▶'} Why this split?
        </button>
      </div>

      {/* Rationale (expandable) */}
      {showRationale && (
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            This split optimizes for your earliest possible retirement while respecting:
          </p>
          <ul style={{ margin: '0', paddingLeft: '16px' }}>
            <li>Superannuation contribution caps and tax benefits</li>
            <li>Bridge period funding (outside savings needed until age 60)</li>
            <li>Your target spending and Die-With-Zero horizon</li>
            {strategySummary.display.salarySacrifice > 0 && (
              <li>High marginal tax rate - salary sacrifice provides significant tax savings</li>
            )}
          </ul>
        </div>
      )}

      {/* Adjust Strategy Button */}
      <button
        onClick={onAdjustStrategy}
        style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#e5e7eb';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#f3f4f6';
        }}
      >
        ⚙️ Adjust strategy (Advanced)
      </button>
    </div>
  );
}