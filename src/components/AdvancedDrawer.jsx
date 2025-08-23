import React, { useState } from 'react';
import { normalizeBandSettings } from '../lib/validation/ageBands.js';

/**
 * Advanced settings drawer component
 * Houses Income Shape, Market Assumptions, and Manual Strategy Overrides
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the drawer is open
 * @param {Function} props.onClose - Callback to close the drawer
 * @param {Object} props.ageBandState - Age band settings state
 * @param {Object} props.marketState - Market assumptions state  
 * @param {Object} props.strategyState - Manual strategy overrides state
 * @returns {JSX.Element} Advanced drawer component
 */
export function AdvancedDrawer({ 
  isOpen, 
  onClose,
  ageBandState = {},
  marketState = {},
  strategyState = {}
}) {
  const [expandedSections, setExpandedSections] = useState({
    incomeShape: false,
    marketAssumptions: false,
    strategyOverrides: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  const sectionStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
    overflow: 'hidden'
  };

  const headerStyle = {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const contentStyle = {
    padding: '16px'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '14px'
  };

  const sliderStyle = {
    width: '100%',
    margin: '8px 0'
  };

  // Format settings for summary display
  const getIncomeShapeSummary = () => {
    if (!ageBandState.ageBandsEnabled) {
      return "Flat spending: 1.00× throughout retirement";
    }
    const settings = ageBandState.ageBandSettings || {};
    return `Age-banded: ${settings.gogoTo || 60}/${settings.slowTo || 75}/90 • ${(settings.gogoMult || 1.10).toFixed(2)}×/${(settings.slowMult || 1.00).toFixed(2)}×/${(settings.nogoMult || 0.85).toFixed(2)}×`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            ⚙️ Advanced Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Income Shape Section */}
        <div style={sectionStyle}>
          <div 
            style={headerStyle}
            onClick={() => toggleSection('incomeShape')}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>
                📊 Income Shape
              </div>
              {!expandedSections.incomeShape && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  {getIncomeShapeSummary()}
                </div>
              )}
            </div>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {expandedSections.incomeShape ? '▼' : '▶'}
            </span>
          </div>
          
          {expandedSections.incomeShape && (
            <div style={contentStyle}>
              {/* Income shape toggle */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Spending pattern</label>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="incomeShape"
                      checked={!ageBandState.ageBandsEnabled}
                      onChange={() => ageBandState.setAgeBandsEnabled?.(false)}
                    />
                    <span>Flat (1.00× throughout retirement)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="incomeShape"
                      checked={ageBandState.ageBandsEnabled}
                      onChange={() => ageBandState.setAgeBandsEnabled?.(true)}
                    />
                    <span>Age-banded (Go-go/Slow-go/No-go phases)</span>
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
                  Age-banded allows different spending levels across retirement phases. 
                  Higher spending in early "go-go" years, stable in "slow-go", lower in "no-go".
                </div>
              </div>

              {/* Age-banded editor (when enabled) */}
              {ageBandState.ageBandsEnabled && ageBandState.ageBandSettings && (
                <div style={{ 
                  backgroundColor: '#f0fdf4', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Customize age-banded spending:</strong>
                  </div>
                  
                  {/* Age boundaries */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={labelStyle}>Go-go phase ends at: {ageBandState.ageBandSettings.gogoTo}</label>
                      <input
                        type="range"
                        min="55"
                        max="75"
                        value={ageBandState.ageBandSettings.gogoTo}
                        onChange={(e) => ageBandState.setAgeBandSettings?.({
                          ...ageBandState.ageBandSettings,
                          gogoTo: parseInt(e.target.value)
                        })}
                        style={sliderStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Slow-go phase ends at: {ageBandState.ageBandSettings.slowTo}</label>
                      <input
                        type="range"
                        min="65"
                        max="85"
                        value={ageBandState.ageBandSettings.slowTo}
                        onChange={(e) => ageBandState.setAgeBandSettings?.({
                          ...ageBandState.ageBandSettings,
                          slowTo: parseInt(e.target.value)
                        })}
                        style={sliderStyle}
                      />
                    </div>
                  </div>

                  {/* Multipliers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Go-go multiplier: {ageBandState.ageBandSettings.gogoMult?.toFixed(2)}×</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={ageBandState.ageBandSettings.gogoMult}
                        onChange={(e) => ageBandState.setAgeBandSettings?.({
                          ...ageBandState.ageBandSettings,
                          gogoMult: parseFloat(e.target.value)
                        })}
                        style={sliderStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Slow-go multiplier: {ageBandState.ageBandSettings.slowMult?.toFixed(2)}×</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={ageBandState.ageBandSettings.slowMult}
                        onChange={(e) => ageBandState.setAgeBandSettings?.({
                          ...ageBandState.ageBandSettings,
                          slowMult: parseFloat(e.target.value)
                        })}
                        style={sliderStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>No-go multiplier: {ageBandState.ageBandSettings.nogoMult?.toFixed(2)}×</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={ageBandState.ageBandSettings.nogoMult}
                        onChange={(e) => ageBandState.setAgeBandSettings?.({
                          ...ageBandState.ageBandSettings,
                          nogoMult: parseFloat(e.target.value)
                        })}
                        style={sliderStyle}
                      />
                    </div>
                  </div>

                  {/* Warnings */}
                  {ageBandState.bandWarnings?.length > 0 && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '8px 12px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#92400e'
                    }}>
                      {ageBandState.bandWarnings.map((warning, idx) => (
                        <div key={idx}>⚠️ {warning}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Market Assumptions Section */}
        <div style={sectionStyle}>
          <div 
            style={headerStyle}
            onClick={() => toggleSection('marketAssumptions')}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>
                📈 Market Assumptions
              </div>
              {!expandedSections.marketAssumptions && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  Return: {marketState.expectedReturn || 8.5}% • Inflation: {marketState.inflationRate || 2.5}%
                </div>
              )}
            </div>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {expandedSections.marketAssumptions ? '▼' : '▶'}
            </span>
          </div>

          {expandedSections.marketAssumptions && (
            <div style={contentStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>
                    Expected annual return: {marketState.expectedReturn || 8.5}%
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="0.1"
                    value={marketState.expectedReturn || 8.5}
                    onChange={(e) => marketState.setExpectedReturn?.(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Inflation rate: {marketState.inflationRate || 2.5}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.1"
                    value={marketState.inflationRate || 2.5}
                    onChange={(e) => marketState.setInflationRate?.(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Investment fees: {marketState.investmentFees || 0.5}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={marketState.investmentFees || 0.5}
                    onChange={(e) => marketState.setInvestmentFees?.(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Strategy Overrides Section */}
        <div style={sectionStyle}>
          <div 
            style={headerStyle}
            onClick={() => toggleSection('strategyOverrides')}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>
                🎯 Manual Overrides
              </div>
              {!expandedSections.strategyOverrides && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  Override recommended contribution strategy
                </div>
              )}
            </div>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {expandedSections.strategyOverrides ? '▼' : '▶'}
            </span>
          </div>

          {expandedSections.strategyOverrides && (
            <div style={contentStyle}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                  ⚠️ Manual overrides will replace the optimized recommendation
                </div>
                <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                  Only adjust if you have specific constraints or preferences not captured by the optimizer
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>
                    Additional Super Contributions ($/year)
                  </label>
                  <input
                    type="number"
                    value={strategyState.additionalSuperContributions || 0}
                    onChange={(e) => strategyState.setAdditionalSuperContributions?.(parseInt(e.target.value) || 0)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Outside Savings Override ($/year)
                  </label>
                  <input
                    type="number"
                    value={strategyState.outsideSavingsOverride || 0}
                    onChange={(e) => strategyState.setOutsideSavingsOverride?.(parseInt(e.target.value) || 0)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  strategyState.setAdditionalSuperContributions?.(0);
                  strategyState.setOutsideSavingsOverride?.(0);
                }}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                🔄 Reset to recommended
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '16px', 
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}