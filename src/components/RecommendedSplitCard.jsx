import React, { useState } from 'react';

/**
 * Recommended contribution split card component
 * Shows read-only strategy recommendation with expandable rationale
 * 
 * @param {Object} props
 * @param {Object} props.strategy - Strategy object from dwzStrategyFromState
 * @param {Function} props.onAdjustStrategy - Callback to open Advanced drawer
 * @returns {JSX.Element} Recommended split card
 */
export function RecommendedSplitCard({ strategy, onAdjustStrategy }) {
  const [showRationale, setShowRationale] = useState(false);

  if (!strategy) {
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
      
      {/* Strategy Summary */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Salary sacrifice: {formatCurrency(strategy.salaryOut || 0)} (cap use {formatPercent(strategy.capUtilization || 0)}) • 
          Outside: {formatCurrency(strategy.outsideOut || 0)}
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {strategy.totalOut ? `Total savings: ${formatCurrency(strategy.totalOut)}/year` : ''}
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
            {strategy.marginalTaxRate > 0.32 && (
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