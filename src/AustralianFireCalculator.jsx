  import React, { useState, useMemo } from 'react';
  import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine } from 'recharts';

  const AustralianFireCalculator = () => {
    const [currentAge, setCurrentAge] = useState(30);
    const [retirementAge, setRetirementAge] = useState(50);
    const [currentSavings, setCurrentSavings] = useState(50000);
    const [annualIncome, setAnnualIncome] = useState(100000);
    const [annualExpenses, setAnnualExpenses] = useState(40000);
    const [currentSuper, setCurrentSuper] = useState(100000);

    // Australian tax brackets 2024-25
    const calculateTax = (income) => {
      if (income <= 18200) return 0;
      if (income <= 45000) return (income - 18200) * 0.19;
      if (income <= 120000) return 5092 + (income - 45000) * 0.325;
      if (income <= 180000) return 29467 + (income - 120000) * 0.37;
      return 51667 + (income - 180000) * 0.45;
    };

    const calculations = useMemo(() => {
      const yearsToRetirement = retirementAge - currentAge;
      const tax = calculateTax(annualIncome);
      const afterTaxIncome = annualIncome - tax;
      const annualSavings = afterTaxIncome - annualExpenses;
      const savingsRate = (annualSavings / afterTaxIncome) * 100;

      // Super contributions (11.5% of pre-tax income)
      const annualSuperContribution = annualIncome * 0.115;

      // Calculate future values with 7% annual return
      const returnRate = 0.07;

      // Future value of current savings
      const futureSavings = currentSavings * Math.pow(1 + returnRate,
  yearsToRetirement);

      // Future value of annual savings (annuity)
      const futureAnnualSavings = annualSavings > 0
        ? annualSavings * (Math.pow(1 + returnRate, yearsToRetirement) - 1)
   / returnRate
        : 0;

      // Future value of current super
      const futureCurrentSuper = currentSuper * Math.pow(1 + returnRate,
  yearsToRetirement);

      // Future value of super contributions (annuity)
      const futureSuperContributions = annualSuperContribution *
  (Math.pow(1 + returnRate, yearsToRetirement) - 1) / returnRate;

      const totalWealth = futureSavings + futureAnnualSavings +
  futureCurrentSuper + futureSuperContributions;

      // 4% rule check
      const withdrawalAmount = totalWealth * 0.04;
      const canRetire = withdrawalAmount >= annualExpenses;
      const shortfall = canRetire ? 0 : (annualExpenses - withdrawalAmount)
   / 0.04;

      return {
        savingsRate,
        totalWealth,
        withdrawalAmount,
        canRetire,
        shortfall,
        annualSavings,
        returnRate,
        tax,
        afterTaxIncome,
        annualSuperContribution
      };
    }, [currentAge, retirementAge, currentSavings, annualIncome,
  annualExpenses, currentSuper]);

    const chartData = useMemo(() => {
      const data = [];
      const { returnRate, tax, afterTaxIncome, annualSuperContribution } =
  calculations;
      const annualSavings = afterTaxIncome - annualExpenses;
      const fireNumber = annualExpenses * 25;

      for (let age = currentAge; age <= 90; age++) {
        const yearsFromNow = age - currentAge;

        // Calculate outside super wealth (current savings + annual savings)
        let outsideSuper = currentSavings * Math.pow(1 + returnRate,
  yearsFromNow);
        if (annualSavings > 0 && yearsFromNow > 0) {
          outsideSuper += annualSavings * (Math.pow(1 + returnRate,
  yearsFromNow) - 1) / returnRate;
        }

        // Calculate super wealth (current super + contributions)
        let superBalance = currentSuper * Math.pow(1 + returnRate,
  yearsFromNow);
        if (yearsFromNow > 0) {
          superBalance += annualSuperContribution * (Math.pow(1 +
  returnRate, yearsFromNow) - 1) / returnRate;
        }

        const totalWealth = outsideSuper + superBalance;

        data.push({
          age,
          outsideSuper: Math.max(0, outsideSuper),
          superBalance: Math.max(0, superBalance),
          totalWealth: Math.max(0, totalWealth),
          fireNumber
        });
      }

      return data;
    }, [currentAge, currentSavings, currentSuper, annualExpenses,
  calculations]);

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const cardStyle = {
      maxWidth: '600px',
      margin: '20px auto',
      padding: '30px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    };

    const titleStyle = {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a1a1a',
      textAlign: 'center',
      marginBottom: '30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    };

    const inputGroupStyle = {
      marginBottom: '20px',
    };

    const labelStyle = {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    };

    const inputStyle = {
      width: '100%',
      padding: '12px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.2s ease',
      outline: 'none',
    };

    const sliderStyle = {
      ...inputStyle,
      padding: '8px',
    };

    const resultStyle = {
      backgroundColor: '#f8fafc',
      padding: '24px',
      borderRadius: '12px',
      marginTop: '30px',
      textAlign: 'center',
    };

    const successStyle = {
      fontSize: '24px',
      fontWeight: '700',
      color: '#059669',
      marginBottom: '16px',
    };

    const errorStyle = {
      fontSize: '24px',
      fontWeight: '700',
      color: '#dc2626',
      marginBottom: '16px',
    };

    const detailStyle = {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '8px',
    };

    const savingsRateColor = calculations.savingsRate >= 20 ? '#059669' :
  calculations.savingsRate >= 10 ? '#d97706' : '#dc2626';

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{`Age:
  ${label}`}</p>
            {payload.map((entry, index) => (
              <p key={index} style={{ margin: '4px 0', color: entry.color 
  }}>
                {`${entry.name}: ${formatCurrency(entry.value)}`}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    const chartStyle = {
      backgroundColor: '#f8fafc',
      padding: '24px',
      borderRadius: '12px',
      marginTop: '20px',
    };

    return (
      <div style={cardStyle}>
        <h1 style={titleStyle}>🇦🇺 Australian FIRE Calculator</h1>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>
            Current Age: {currentAge}
          </label>
          <input
            type="range"
            min="20"
            max="60"
            value={currentAge}
            onChange={(e) => setCurrentAge(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>
            Retirement Target Age: {retirementAge}
          </label>
          <input
            type="range"
            min="30"
            max="70"
            value={retirementAge}
            onChange={(e) => setRetirementAge(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Current Savings (outside super)</label>
          <input
            type="number"
            value={currentSavings}
            onChange={(e) => setCurrentSavings(parseFloat(e.target.value)
  || 0)}
            style={inputStyle}
            placeholder="50000"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Annual Pre-tax Income</label>
          <input
            type="number"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(parseFloat(e.target.value) ||
  0)}
            style={inputStyle}
            placeholder="100000"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Annual Expenses</label>
          <input
            type="number"
            value={annualExpenses}
            onChange={(e) => setAnnualExpenses(parseFloat(e.target.value)
  || 0)}
            style={inputStyle}
            placeholder="40000"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Current Super Balance</label>
          <input
            type="number"
            value={currentSuper}
            onChange={(e) => setCurrentSuper(parseFloat(e.target.value) ||
  0)}
            style={inputStyle}
            placeholder="100000"
          />
        </div>

        <div style={resultStyle}>
          {calculations.canRetire ? (
            <div style={successStyle}>
              ✅ You can retire at {retirementAge}!
            </div>
          ) : (
            <div style={errorStyle}>
              ❌ You need {formatCurrency(calculations.shortfall)} more
            </div>
          )}

          <div style={detailStyle}>
            <strong>Projected wealth at retirement:</strong>
  {formatCurrency(calculations.totalWealth)}
          </div>

          <div style={detailStyle}>
            <strong>Savings rate:</strong>
            <span style={{ color: savingsRateColor, fontWeight: '600' }}>
              {' '}{calculations.savingsRate.toFixed(1)}%
            </span>
          </div>

          {calculations.annualSavings < 0 && (
            <div style={{ ...detailStyle, color: '#dc2626', fontWeight: 
  '600', marginTop: '12px' }}>
              ⚠️ You're spending more than your after-tax income!
            </div>
          )}
        </div>

        <div style={chartStyle}>
          <h3 style={{ marginBottom: '20px', color: '#374151', fontSize: 
  '18px', fontWeight: '600' }}>
            Wealth Projection
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="age" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) =>
  formatCurrency(value).replace('.00', '')}
              />
              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine 
                x={retirementAge} 
                stroke="#6b7280" 
                strokeDasharray="5 5"
                label={{ value: `Retirement: ${retirementAge}`, position: 
  "top" }}
              />
              <ReferenceLine 
                y={annualExpenses * 25} 
                stroke="#dc2626" 
                strokeDasharray="3 3"
                label={{ value: "FIRE Number", position: "topRight" }}
              />

              <Line 
                type="monotone" 
                dataKey="outsideSuper" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Outside Super"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="superBalance" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Super Balance"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="totalWealth" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Total Wealth"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

export default AustralianFireCalculator;

