import React from 'react';
import Panel from './Panel';
import PersonSuperSettings from './PersonSuperSettings';

interface PersonCardProps {
  title: string;
  index: number;
  age: number;
  income: number;
  outside: number;
  super: number;
  salary: number;
  sgRate: number;
  onAgeChange: (value: number) => void;
  onIncomeChange: (value: number) => void;
  onOutsideChange: (value: number) => void;
  onSuperChange: (value: number) => void;
  onSalaryChange: (value: number) => void;
  onSGRateChange: (value: number) => void;
  // Super Settings data
  atoSGRate: number;
  capPerPerson: number;
  autoOptimize: boolean;
  optimizerData?: { recommendedPct: number } | null;
  annualSavings: number;
  allRemainingCaps: number[];
}

export default function PersonCard({
  title,
  index,
  age,
  income,
  outside,
  super: superBalance,
  salary,
  sgRate,
  onAgeChange,
  onIncomeChange,
  onOutsideChange,
  onSuperChange,
  onSalaryChange,
  onSGRateChange,
  atoSGRate,
  capPerPerson,
  autoOptimize,
  optimizerData,
  annualSavings,
  allRemainingCaps
}: PersonCardProps) {
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    marginTop: 0,
    color: '#111827'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    color: '#374151'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'inherit'
  };


  const enhancedCardStyle: React.CSSProperties = {
    ...cardStyle,
    background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
    border: '2px solid #E2E8F0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  };

  const sectionDividerStyle: React.CSSProperties = {
    height: 1,
    background: 'linear-gradient(90deg, transparent 0%, #E2E8F0 50%, transparent 100%)',
    margin: '20px 0',
  };

  return (
    <div style={enhancedCardStyle} className="space-y-4">
      <h3 style={titleStyle}>{title}</h3>

      {/* 1) General info */}
      <Panel
        title="General info"
        subtitle="Your age and income."
        help={
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>Key concepts explained:</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• Today's dollars:</strong> All figures are net real (inflation-adjusted). This means values represent purchasing power in today's terms, making it easier to understand what your money will be worth.
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• End-of-year ages:</strong> We advance age at the end of each year after spend → returns/fees cycle. This timing affects when you can access super preservation age benefits.
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• Tax & Benefits soon:</strong> A dedicated panel for HECS/HELP debt, private health insurance rebates, Medicare Levy Surcharge (MLS), and other tax considerations will be added here. This will enable more precise tax calculations and optimization.
            </div>
          </div>
        }
      >
        <div className="col-span-1">
          <label style={labelStyle}>
            Age
            <input 
              type="number" 
              value={age} 
              onChange={e => onAgeChange(+e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <div className="col-span-1">
          <label style={labelStyle}>
            Income
            <input 
              type="number" 
              value={income} 
              onChange={e => onIncomeChange(+e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      </Panel>

      {/* 2) Assets */}
      <Panel
        title="Assets"
        subtitle="Starting balances"
        help={
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>Asset management concepts:</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• Outside vs super:</strong> We track two main asset buckets for different withdrawal strategies and tax implications. Outside assets can be accessed anytime, while super has preservation age restrictions but tax advantages.
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• No contributions after FIRE:</strong> This follows the Die-With-Zero (DWZ) methodology - once you achieve Financial Independence, contributions stop by design. The focus shifts to optimal withdrawal strategies rather than accumulation.
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>• More assets soon:</strong> Future updates will include other asset types (property, bonds, international shares) and one-off lump sums (inheritance, bonuses, asset sales) to provide more comprehensive portfolio modeling.
            </div>
          </div>
        }
      >
        <div className="col-span-1">
          <label style={labelStyle}>
            Outside
            <input 
              type="number" 
              value={outside} 
              onChange={e => onOutsideChange(+e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <div className="col-span-1">
          <label style={labelStyle}>
            Super
            <input 
              type="number" 
              value={superBalance} 
              onChange={e => onSuperChange(+e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      </Panel>

      {/* Visual divider */}
      <div style={sectionDividerStyle}></div>

      {/* 3) Super settings (already implemented) */}
      <PersonSuperSettings
        index={index}
        salary={salary}
        sgRate={sgRate}
        atoSGRate={atoSGRate}
        capPerPerson={capPerPerson}
        onSalaryChange={onSalaryChange}
        onSGRateChange={onSGRateChange}
        autoOptimize={autoOptimize}
        optimizerData={optimizerData}
        annualSavings={annualSavings}
        allRemainingCaps={allRemainingCaps}
      />
    </div>
  );
}