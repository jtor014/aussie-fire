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


  return (
    <div style={cardStyle} className="space-y-4">
      <h3 style={titleStyle}>{title}</h3>

      {/* 1) General info */}
      <Panel
        title="General info"
        subtitle="Your age and income. Tax & Benefits panel sits here (coming soon)."
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
        <div className="col-span-2">
          <div className="mt-1 text-xs text-gray-500 border rounded px-2 py-1 bg-gray-50">
            Tax &amp; Benefits panel (coming soon)
          </div>
        </div>
      </Panel>

      {/* 2) Assets */}
      <Panel
        title="Assets"
        subtitle="Starting balances. Extendable later for other assets / lump sums."
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