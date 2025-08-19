import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import auRules from './data/au_rules.json';
import { calcIncomeTax, getMarginalRate } from './core/tax';
import { calcSuperContribs } from './core/super';
import { assessBridge } from './core/bridge';
import { getPreservationAge } from './core/preservation';
import { mkPartner, mkHousehold } from './models/shapes';
import { projectCouple } from './core/household';
import { dwzFromSingleState, maxSpendDWZSingle, earliestFireAgeDWZSingle, getAtRetirementBalances } from './core/dwz_single.js';
import { dwzPersonFromState, maxSpendDWZCouple, earliestFireAgeDWZCouple, getCoupleAtRetirementBalances } from './core/dwz_couples.js';

// === DWZ helpers (real dollars) ===
const EPS = 1e-6;
const grow1y = (B, r) => B * (1 + r);

// simulate residual wealth at life expectancy for a SINGLE person
function residualSingle({ outAtR, supAtR, rOut, rSup, P }, R, L, W) {
  let age = R, out = outAtR, sup = supAtR;

  // 1) bridge: spend from outside only until P (or L if sooner)
  const stop1 = Math.min(P, L);
  while (age < stop1) {
    out = grow1y(out, rOut) - W;     // spending from OUTSIDE only
    sup = grow1y(sup, rSup);         // super grows untouched
    age++;
  }

  // 2) retirement with access: spend from combined bucket until L
  age = Math.max(P, R);
  while (age < L) {
    out = grow1y(out, rOut);
    sup = grow1y(sup, rSup);

    const fromOut = Math.min(out, W);
    out -= fromOut;
    sup -= (W - fromOut);            // take rest from super

    age++;
  }

  return out + sup; // residual wealth at life expectancy (real $)
}

// binary-search the sustainable real annual spend W
function solveWForSingle(p, R, L) {
  let lo = 0;
  let hi = 1;

  // grow upper bound until we overshoot (residual <= 0)
  while (residualSingle(p, R, L, hi) > 0 && hi < 1e9) hi *= 2;

  // bisect
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const res = residualSingle(p, R, L, mid);
    if (res > 0) lo = mid; else hi = mid;
  }
  return lo;
}

// return a yearly series for the chart using DWZ W
function seriesSingle({ outAtR, supAtR, rOut, rSup, P }, R, L, W) {
  const points = [];
  let age = R, out = outAtR, sup = supAtR;

  const stop1 = Math.min(P, L);
  while (age < stop1) {
    out = grow1y(out, rOut) - W;
    sup = grow1y(sup, rSup);
    points.push({ age, out: Math.max(0, out), sup: Math.max(0, sup) });
    age++;
  }

  age = Math.max(P, R);
  while (age < L) {
    out = grow1y(out, rOut);
    sup = grow1y(sup, rSup);
    const fromOut = Math.min(out, W);
    out -= fromOut;
    sup -= (W - fromOut);
    points.push({ age, out: Math.max(0, out), sup: Math.max(0, sup) });
    age++;
  }
  return points;
}

// Utility for accumulation phase (pre-FIRE)
function simulateAccumToAge({ startAge, endAge, out0, sup0, annualSavings, netSuperContribution, r }) {
  const pts = [];
  let age = startAge;
  let out = out0;
  let sup = sup0;
  while (age < endAge) {
    if (annualSavings > 0) out += annualSavings;
    sup += netSuperContribution;
    out *= (1 + r);
    sup *= (1 + r);
    pts.push({ age, outside: Math.max(out, 0), super: Math.max(sup, 0) });
    age++;
  }
  return { pts, out, sup };
}

function PartnerSuperPanel({
  label, income, extra, onExtraChange,
  hasInsurance, onHasInsurance, premiums, onPremiumsChange, rules,
  showLabel = true  // Show partner label (true for couples, false for single)
}) {
  const cap = rules.concessional_cap ?? 30000;
  const { employer, additional, total } = calcSuperContribs(income, extra, 0, rules);
  const capPct = Math.min(100, (total / cap) * 100);
  const overCap = total > cap;
  const remaining = Math.max(0, cap - total);
  const prem = hasInsurance ? (premiums.life + premiums.tpd + premiums.income) : 0;

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  };

  return (
    <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:16 }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>
        🦘 {showLabel ? `${label} — Super Strategy` : 'Super Strategy'}
      </div>

      <div style={{ fontSize:13, background:'#f3f4f6', padding:8, borderRadius:6, marginBottom:12 }}>
        <div>Employer: <strong>${employer.toLocaleString('en-AU')}</strong></div>
        <div>Your extra: <strong>${additional.toLocaleString('en-AU')}</strong></div>
        <div>Total: <strong style={{ color: overCap ? '#dc2626' : '#059669' }}>
          ${total.toLocaleString('en-AU')}/yr{overCap && ' ⚠️ OVER CAP'}
        </strong></div>
        {!overCap && remaining > 0 && (
          <div style={{ fontSize:12, color:'#6b7280' }}>(${remaining.toLocaleString('en-AU')} remaining)</div>
        )}
        <div style={{ marginTop:8 }}>
          <div style={{ height:8, background:'#e5e7eb', borderRadius:4 }}>
            <div style={{
              height:'100%', width:`${capPct}%`, borderRadius:4,
              background: overCap ? '#dc2626' : (capPct>83 ? '#f59e0b' : '#10b981')
            }}/>
          </div>
        </div>
      </div>

      <label style={{ display:'block', fontWeight:600, marginBottom:6 }}>
        Additional Super: ${extra.toLocaleString('en-AU')}/yr
      </label>
      <input type="range" min="0" max={cap} step="1000" value={extra}
             onChange={(e)=>onExtraChange(parseInt(e.target.value)||0)} 
             style={{ width: '100%', marginBottom: 8 }} />
      <input type="number" min={0} max={cap} step={1000} value={extra} 
             onChange={(e)=>onExtraChange(parseInt(e.target.value)||0)}
             style={{ ...inputStyle, width:'100%' }} />

      <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #e5e7eb' }}>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={hasInsurance}
                 onChange={(e)=>onHasInsurance(e.target.checked)}/>
          Insurance through Super
        </label>
        {hasInsurance && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8 }}>
            {['life','tpd','income'].map(k=>(
              <div key={k}>
                <label style={{ fontSize:12, fontWeight:600, display:'block' }}>
                  {k[0].toUpperCase()+k.slice(1)} ${premiums[k]||0}/yr
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={premiums[k]||0}
                  onChange={(e)=>onPremiumsChange({...premiums, [k]: +e.target.value||0})}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        )}
        {hasInsurance && prem>2000 && (
          <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:6, padding:8, marginTop:8, fontSize:12 }}>
            💸 Insurance impact could be material over time.
          </div>
        )}
      </div>
    </div>
  );
}


function PersonSituationCard({
  label,                         // "You" | "Partner"
  age, onAge,                    // numbers + setters
  retireAge, onRetireAge,
  income, onIncome,
  savings, onSavings,            // outside super
  superBalance, onSuperBalance,
  hasPrivateHealth, onHasPrivateHealth,
  hecsDebt, onHecsDebt,
  rules
}) {
  // styles (match existing look)
  const box = { background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:16 };
  const row = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12 };
  const input = { width:'100%', padding:'10px', border:'2px solid #e5e7eb', borderRadius:8, fontSize:16 };
  const slider = { ...input, padding:'8px' };
  const labelCss = { display:'block', fontSize:14, fontWeight:600, color:'#374151', marginBottom:8 };

  // live tax summary (keeps parity with A's header strip)
  const tax = calcIncomeTax(income, { hasPrivateHealth, hecsDebt }, rules);
  const afterTax = Math.max(0, income - tax);
  const employerSuper = calcSuperContribs(income, 0, 0, rules).employer;

  return (
    <div style={box}>
      <div style={{ fontWeight:700, marginBottom:8 }}>{label} — Details</div>

      {/* Age & Retire Age */}
      <div style={row}>
        <div>
          <label style={labelCss}>Current Age: <strong>{age}</strong></label>
          <input type="range" min={18} max={75} value={age}
                 onChange={e=>onAge(parseInt(e.target.value)||age)} style={slider}/>
        </div>
        <div>
          <label style={labelCss}>Target Retirement Age: <strong>{retireAge}</strong></label>
          <input type="range" min={30} max={80} value={retireAge}
                 onChange={e=>onRetireAge(parseInt(e.target.value)||retireAge)} style={slider}/>
        </div>
      </div>

      {/* Income */}
      <div style={{ marginTop:16 }}>
        <label style={labelCss}>Annual Income (pre-tax)</label>
        <input type="number" value={income} onChange={e=>onIncome(parseFloat(e.target.value)||0)} style={input}/>
        <div style={{ marginTop:8, fontSize:13, background:'#f3f4f6', padding:'8px', borderRadius:6, color:'#374151' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
            <span>After tax: <strong>${afterTax.toLocaleString()}</strong></span>
            <span>Tax: <strong>${tax.toLocaleString()}</strong></span>
            <span>Super: <strong>${employerSuper.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Wealth */}
      <div style={row}>
        <div>
          <label style={labelCss}>Savings (outside super)</label>
          <input type="number" value={savings} onChange={e=>onSavings(parseFloat(e.target.value)||0)} style={input}/>
        </div>
        <div>
          <label style={labelCss}>Superannuation Balance</label>
          <input type="number" value={superBalance} onChange={e=>onSuperBalance(parseFloat(e.target.value)||0)} style={input}/>
        </div>
      </div>

      {/* Quick HECS and Health toggles */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
        <div>
          <label style={labelCss}>HECS/HELP Debt</label>
          <input type="number" value={hecsDebt} onChange={e=>onHecsDebt(parseFloat(e.target.value)||0)} style={input}/>
        </div>
        <label style={{ ...labelCss, display:'flex', alignItems:'center', gap:8, margin:0 }}>
          <input type="checkbox" checked={hasPrivateHealth} onChange={e=>onHasPrivateHealth(e.target.checked)} />
          Private Health Insurance
        </label>
      </div>
    </div>
  );
}

const AustralianFireCalculator = () => {
  // Initial single defaults (placeholders) - Phase 4
  const DEFAULTS = {
    currentAge: 30,
    retireAge: 50,
    income: 100000,
    liquidStart: 50000,
    superStart: 100000,
    longevity: 90
  };

  // Basic inputs
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(DEFAULTS.retireAge);
  const [currentSavings, setCurrentSavings] = useState(DEFAULTS.liquidStart);
  const [annualIncome, setAnnualIncome] = useState(DEFAULTS.income);
  const [annualExpenses, setAnnualExpenses] = useState(40000);
  const [currentSuper, setCurrentSuper] = useState(DEFAULTS.superStart);
  const [dieWithZeroMode, setDieWithZeroMode] = useState(false);
  const [lifeExpectancy, setLifeExpectancy] = useState(DEFAULTS.longevity);

  // Assumptions Panel
  const [showAssumptions, setShowAssumptions] = useState(() => {
    const saved = localStorage.getItem('aussie-fire-assumptions-open');
    return saved ? JSON.parse(saved) : false;
  });
  const [expectedReturn, setExpectedReturn] = useState(8.5);
  const [investmentFees, setInvestmentFees] = useState(0.5);
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState(3.5);
  const [adjustForInflation, setAdjustForInflation] = useState(true);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [showInTodaysDollars, setShowInTodaysDollars] = useState(true);
  const [hecsDebt, setHecsDebt] = useState(0);
  const [hasPrivateHealth, setHasPrivateHealth] = useState(false);

  // Planning mode
  const [planningAs, setPlanningAs] = useState('single'); // 'single' | 'couple'

  // DWZ Feature flags (Phase 0 - safe switches)
  const [flags] = useState({
    dwzEnabled: true,           // flip off if anything feels risky
    dwzShowEarliestFire: true,  // UI gate for earliest FIRE output
  });

  // Partner B (using same defaults as Person A - Phase 4)
  const [partnerB, setPartnerB] = useState({
    name: 'Partner',
    currentAge: DEFAULTS.currentAge,
    retireAge: DEFAULTS.retireAge,
    income: DEFAULTS.income,
    extraSuper: 0,  // renamed for consistency
    liquidStart: DEFAULTS.liquidStart,
    superStart: DEFAULTS.superStart,
    hasPrivateHealth: false,
    hecsBalance: 0,
    dob: '', // optional
    longevity: DEFAULTS.longevity,
    hasInsuranceInSuper: false,
    insurancePremiums: { life: 0, tpd: 0, income: 0 }
  });

  // Collapsible subsections within Your Situation
  const [showTaxSection, setShowTaxSection] = useState(false);
  const [showSuperSection, setShowSuperSection] = useState(false);

  // Advanced Super Strategy
  const [showAdvancedSuper, setShowAdvancedSuper] = useState(() => {
    const saved = localStorage.getItem('aussie-fire-advanced-super-open');
    return saved ? JSON.parse(saved) : false;
  });
  const [additionalSuperContributions, setAdditionalSuperContributions] = useState(0);
  const [hasInsuranceInSuper, setHasInsuranceInSuper] = useState(false);
  const [insurancePremiums, setInsurancePremiums] = useState({
    life: 0,
    tpd: 0,
    income: 0
  });
  const [showItemizedInsurance, setShowItemizedInsurance] = useState(false);

  // Spacing constants for consistent layout
  const spacing = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  };

  // Calculated assumptions
  const netReturn = (expectedReturn - investmentFees) / 100;
  const realReturn = adjustForInflation ? ((1 + netReturn) / (1 + inflationRate / 100)) - 1 : netReturn;
  const fireMultiplier = 100 / safeWithdrawalRate;
  const fireNumber = annualExpenses * fireMultiplier;

  // Preset scenarios
  const presets = {
    optimistic: { return: 10, fees: 0.3, swr: 4, inflation: 2 },
    balanced: { return: 8.5, fees: 0.5, swr: 3.5, inflation: 2.5 },
    pessimistic: { return: 6, fees: 0.8, swr: 3, inflation: 3 },
    gfc: { return: 4, fees: 1.2, swr: 2.5, inflation: 4 }
  };

  const applyPreset = (preset) => {
    setExpectedReturn(presets[preset].return);
    setInvestmentFees(presets[preset].fees);
    setSafeWithdrawalRate(presets[preset].swr);
    setInflationRate(presets[preset].inflation);
  };

  // Save/Load functionality
  const saveToLocalStorage = () => {
    const settings = {
      currentAge, retirementAge, currentSavings, annualIncome, annualExpenses, currentSuper,
      dieWithZeroMode, lifeExpectancy, expectedReturn, investmentFees, safeWithdrawalRate,
      adjustForInflation, inflationRate, showInTodaysDollars, hecsDebt, hasPrivateHealth,
      showAdvancedSuper, additionalSuperContributions, hasInsuranceInSuper, insurancePremiums, showItemizedInsurance
    };
    localStorage.setItem('aussie-fire-settings', JSON.stringify(settings));
    alert('Settings saved! 💾');
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('aussie-fire-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setCurrentAge(settings.currentAge || 30);
        setRetirementAge(settings.retirementAge || 50);
        setCurrentSavings(settings.currentSavings || 50000);
        setAnnualIncome(settings.annualIncome || 100000);
        setAnnualExpenses(settings.annualExpenses || 40000);
        setCurrentSuper(settings.currentSuper || 100000);
        setDieWithZeroMode(settings.dieWithZeroMode || false);
        setLifeExpectancy(settings.lifeExpectancy || 90);
        setExpectedReturn(settings.expectedReturn || 8.5);
        setInvestmentFees(settings.investmentFees || 0.5);
        setSafeWithdrawalRate(settings.safeWithdrawalRate || 3.5);
        setAdjustForInflation(settings.adjustForInflation ?? true);
        setInflationRate(settings.inflationRate || 2.5);
        setShowInTodaysDollars(settings.showInTodaysDollars ?? true);
        setHecsDebt(settings.hecsDebt || 0);
        setHasPrivateHealth(settings.hasPrivateHealth || false);
        setShowAdvancedSuper(settings.showAdvancedSuper || false);
        setAdditionalSuperContributions(settings.additionalSuperContributions || 0);
        setHasInsuranceInSuper(settings.hasInsuranceInSuper || false);
        setInsurancePremiums(settings.insurancePremiums || { life: 0, tpd: 0, income: 0 });
        setShowItemizedInsurance(settings.showItemizedInsurance || false);
        alert('Settings loaded! 📂');
      } else {
        alert('No saved settings found.');
      }
    } catch (error) {
      alert('Error loading settings.');
    }
  };

  const generateShareLink = () => {
    const params = new URLSearchParams({
      age: currentAge,
      retire: retirementAge,
      savings: currentSavings,
      income: annualIncome,
      expenses: annualExpenses,
      super: currentSuper,
      dzm: dieWithZeroMode ? '1' : '0',
      life: lifeExpectancy,
      return: expectedReturn,
      fees: investmentFees,
      swr: safeWithdrawalRate,
      inflation: adjustForInflation ? '1' : '0',
      inflationRate: inflationRate,
      todayDollars: showInTodaysDollars ? '1' : '0',
      hecs: hecsDebt,
      health: hasPrivateHealth ? '1' : '0',
      advSuper: showAdvancedSuper ? '1' : '0',
      addSuper: additionalSuperContributions,
      insSuper: hasInsuranceInSuper ? '1' : '0',
      insLife: insurancePremiums.life,
      insTpd: insurancePremiums.tpd,
      insIncome: insurancePremiums.income
    });
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard! 🔗');
    }).catch(() => {
      prompt('Copy this share link:', shareUrl);
    });
  };

  const resetToDefaults = () => {
    setCurrentAge(30);
    setRetirementAge(50);
    setCurrentSavings(50000);
    setAnnualIncome(100000);
    setAnnualExpenses(40000);
    setCurrentSuper(100000);
    setDieWithZeroMode(false);
    setLifeExpectancy(90);
    setExpectedReturn(8.5);
    setInvestmentFees(0.5);
    setSafeWithdrawalRate(3.5);
    setAdjustForInflation(true);
    setInflationRate(2.5);
    setShowInTodaysDollars(true);
    setHecsDebt(0);
    setHasPrivateHealth(false);
    setShowAdvancedSuper(false);
    setAdditionalSuperContributions(0);
    setHasInsuranceInSuper(false);
    setInsurancePremiums({ life: 0, tpd: 0, income: 0 });
    setShowItemizedInsurance(false);
    alert('Reset to default settings! 🔄');
  };

  // Load from URL params on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('age')) {
      setCurrentAge(parseInt(urlParams.get('age')) || 30);
      setRetirementAge(parseInt(urlParams.get('retire')) || 50);
      setCurrentSavings(parseFloat(urlParams.get('savings')) || 50000);
      setAnnualIncome(parseFloat(urlParams.get('income')) || 100000);
      setAnnualExpenses(parseFloat(urlParams.get('expenses')) || 40000);
      setCurrentSuper(parseFloat(urlParams.get('super')) || 100000);
      setDieWithZeroMode(urlParams.get('dzm') === '1');
      setLifeExpectancy(parseInt(urlParams.get('life')) || 90);
      setExpectedReturn(parseFloat(urlParams.get('return')) || 8.5);
      setInvestmentFees(parseFloat(urlParams.get('fees')) || 0.5);
      setSafeWithdrawalRate(parseFloat(urlParams.get('swr')) || 3.5);
      setAdjustForInflation(urlParams.get('inflation') !== '0');
      setInflationRate(parseFloat(urlParams.get('inflationRate')) || 2.5);
      setShowInTodaysDollars(urlParams.get('todayDollars') !== '0');
      setHecsDebt(parseFloat(urlParams.get('hecs')) || 0);
      setHasPrivateHealth(urlParams.get('health') === '1');
      setShowAdvancedSuper(urlParams.get('advSuper') === '1');
      setAdditionalSuperContributions(parseFloat(urlParams.get('addSuper')) || 0);
      setHasInsuranceInSuper(urlParams.get('insSuper') === '1');
      setInsurancePremiums({
        life: parseFloat(urlParams.get('insLife')) || 0,
        tpd: parseFloat(urlParams.get('insTpd')) || 0,
        income: parseFloat(urlParams.get('insIncome')) || 0
      });
    }
  }, []);

  // Save advanced super accordion state to localStorage
  useEffect(() => {
    localStorage.setItem('aussie-fire-advanced-super-open', JSON.stringify(showAdvancedSuper));
  }, [showAdvancedSuper]);

  // Save assumptions accordion state to localStorage
  useEffect(() => {
    localStorage.setItem('aussie-fire-assumptions-open', JSON.stringify(showAssumptions));
  }, [showAssumptions]);


  const calculations = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge;
    const isAlreadyRetired = yearsToRetirement <= 0;
    const tax = calcIncomeTax(annualIncome, {
      hasPrivateHealth,
      hecsDebt
    }, auRules);
    const afterTaxIncome = annualIncome - tax;
    const annualSavings = afterTaxIncome - annualExpenses;
    const savingsRate = afterTaxIncome > 0 ? (annualSavings / afterTaxIncome) * 100 : 0;
    const effectiveTaxRate = (tax / annualIncome) * 100;

    // Super contributions using core function
    const totalInsurancePremiums = hasInsuranceInSuper ? 
      (insurancePremiums.life + insurancePremiums.tpd + insurancePremiums.income) : 0;
    
    const {
      employer: employerSuperContribution,
      total: totalAnnualSuperContribution,
      net: netSuperContribution,
      remainingCap,
      isOverCap,
      cap: concessionalCap
    } = calcSuperContribs(
      annualIncome,
      additionalSuperContributions,
      totalInsurancePremiums,
      auRules
    );
    
    // Salary sacrifice tax benefits
    const marginalTaxRate = getMarginalRate(annualIncome, auRules);
    const superTaxRate = 0.15;
    const salSacTaxBenefit = additionalSuperContributions * (marginalTaxRate - superTaxRate);
    const salSacNetCost = additionalSuperContributions - salSacTaxBenefit;

    // Use dynamic return rate
    const returnRate = showInTodaysDollars ? realReturn : netReturn;
    
    let totalWealth;
    
    if (yearsToRetirement <= 0) {
      totalWealth = currentSavings + currentSuper;
    } else {
      const futureSavings = currentSavings * Math.pow(1 + returnRate, yearsToRetirement);
      const futureAnnualSavings = annualSavings > 0
        ? annualSavings * (Math.pow(1 + returnRate, yearsToRetirement) - 1) / returnRate
        : 0;
      const futureCurrentSuper = currentSuper * Math.pow(1 + returnRate, yearsToRetirement);
      const futureSuperContributions = netSuperContribution * (Math.pow(1 + returnRate, yearsToRetirement) - 1) / returnRate;

      totalWealth = futureSavings + futureAnnualSavings + futureCurrentSuper + futureSuperContributions;
    }

    // Use dynamic withdrawal rate
    const withdrawalAmount = totalWealth * (safeWithdrawalRate / 100);
    
    // Die with zero calculation
    let spendToZeroAmount = 0;
    if (dieWithZeroMode && !isAlreadyRetired) {
      const retirementYears = lifeExpectancy - retirementAge;
      if (retirementYears > 0) {
        const r = returnRate;
        const n = retirementYears;
        if (r > 0) {
          spendToZeroAmount = totalWealth * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
          spendToZeroAmount = totalWealth / n;
        }
      }
    } else if (dieWithZeroMode && isAlreadyRetired) {
      const yearsLeft = lifeExpectancy - currentAge;
      if (yearsLeft > 0) {
        const r = returnRate;
        const n = yearsLeft;
        if (r > 0) {
          spendToZeroAmount = totalWealth * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
          spendToZeroAmount = totalWealth / n;
        }
      }
    }
    
    // PRESERVATION AGE BRIDGE PERIOD VALIDATION
    const preservationAge =
      /* keep static for now; when you capture DOB: getPreservationAge(dob, auRules) */ 60;

    const bridge = assessBridge({
      currentAge,
      retirementAge,
      preservationAge,
      currentOutsideSuper: currentSavings,
      annualOutsideSavings: annualSavings,
      annualExpenseNeed: annualExpenses,
      returnRate: returnRate,
      dieWithZero: dieWithZeroMode,
      spendToZeroAnnual: spendToZeroAmount
    });

    const bridgePeriodFeasible = bridge.feasible;
    const bridgePeriodShortfall = bridge.shortfall;
    const bridgePeriodDetails = bridge;

    // Update retirement feasibility based on bridge period
    const effectiveWithdrawal = dieWithZeroMode ? spendToZeroAmount : withdrawalAmount;
    const basicRetirementFeasible = effectiveWithdrawal >= annualExpenses;
    const canRetire = basicRetirementFeasible && bridgePeriodFeasible;
    
    // Calculate total shortfall (basic retirement + bridge period)
    const basicShortfall = basicRetirementFeasible ? 0 : (annualExpenses - effectiveWithdrawal) / (safeWithdrawalRate / 100);
    const totalShortfall = basicShortfall + bridgePeriodShortfall;

    return {
      savingsRate,
      totalWealth,
      withdrawalAmount,
      spendToZeroAmount,
      effectiveWithdrawal,
      canRetire,
      shortfall: totalShortfall,
      annualSavings,
      returnRate,
      tax,
      afterTaxIncome,
      annualSuperContribution: totalAnnualSuperContribution,
      isAlreadyRetired,
      // Legacy spendingBonus calculation removed
      effectiveTaxRate,
      netReturn,
      realReturn,
      fireNumber,
      bridgePeriodFeasible,
      bridgePeriodShortfall,
      bridgePeriodDetails,
      basicRetirementFeasible,
      // Advanced Super calculations
      employerSuperContribution,
      totalAnnualSuperContribution,
      netSuperContribution,
      salSacTaxBenefit,
      salSacNetCost,
      totalInsurancePremiums,
      marginalTaxRate,
      // Optimization insights (now from core function)
      maxConcessionalCap: concessionalCap,
      remainingCap,
      isOverCap
    };
  }, [currentAge, retirementAge, currentSavings, annualIncome, annualExpenses, currentSuper, 
      dieWithZeroMode, lifeExpectancy, expectedReturn, investmentFees, safeWithdrawalRate, 
      adjustForInflation, inflationRate, showInTodaysDollars, hecsDebt, hasPrivateHealth,
      additionalSuperContributions, hasInsuranceInSuper, insurancePremiums]);

  const coupleProjection = useMemo(() => {
    if (planningAs !== 'couple') return null;

    // Partner A mirrors your existing single inputs
    const A = mkPartner({
      name: 'You',
      currentAge,
      retireAge: retirementAge,
      income: annualIncome,
      extraSuper: additionalSuperContributions,
      liquidStart: currentSavings,
      superStart: currentSuper,
      hasPrivateHealth,
      hecsBalance: hecsDebt,
      dob: '' // hook up later if/when you collect DOB
    });

    const B = mkPartner(partnerB);

    const household = mkHousehold({
      partners: [A, B],
      annualExpenses,
      dieWithZero: dieWithZeroMode,
      lifeExpectancy
    });

    const assumptions = {
      returnRate: showInTodaysDollars ? realReturn : netReturn,
      swr: safeWithdrawalRate,
      showInTodaysDollars
    };

    return projectCouple({ household, assumptions, rules: auRules });
  }, [
    planningAs, currentAge, retirementAge, annualIncome, additionalSuperContributions,
    currentSavings, currentSuper, hasPrivateHealth, hecsDebt,
    partnerB, annualExpenses, dieWithZeroMode, lifeExpectancy,
    showInTodaysDollars, realReturn, netReturn, safeWithdrawalRate
  ]);

  // DWZ calculations (Phase 2) - new robust version
  const dwzOutputs = useMemo(() => {
    if (!dieWithZeroMode) return null;

    // real returns
    const rOut = (expectedReturn / 100) - (inflationRate / 100);
    const rSup = rOut; // (use separate if you later support different super return)

    // flows during work years (real $)
    const tax = calcIncomeTax(annualIncome, { hasPrivateHealth, hecsDebt }, auRules);
    const afterTaxIncome = Math.max(0, annualIncome - tax);
    const realSavings = Math.max(0, afterTaxIncome - annualExpenses); // outside flow

    const { employer, additional: yourExtra = 0 } =
      calcSuperContribs(annualIncome, additionalSuperContributions || 0, 0, auRules);
    const realSuperFlow = employer + yourExtra; // simple, in real dollars

    // project balances from current age to a given retirement age (real)
    const projectTo = (R) => {
      let out = currentSavings;
      let sup = currentSuper;
      for (let a = currentAge; a < R; a++) {
        out = grow1y(out, rOut) + realSavings;
        sup = grow1y(sup, rSup) + realSuperFlow;
      }
      return { outAtR: out, supAtR: sup };
    };

    const P = getPreservationAge(currentAge, auRules);
    const L = lifeExpectancy;

    // balances at current retirement age
    const { outAtR, supAtR } = projectTo(retirementAge);
    const p = { outAtR, supAtR, rOut, rSup, P };
    const W = solveWForSingle(p, retirementAge, L);

    // earliest FIRE age (binary search)
    let earliest = null;
    if (flags.dwzShowEarliestFire) {
      let lo = currentAge + 1;
      let hi = Math.min(L - 1, 75);  // reasonable upper bound
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const { outAtR: outM, supAtR: supM } = projectTo(mid);
        const pM = { outAtR: outM, supAtR: supM, rOut, rSup, P };
        const WM = solveWForSingle(pM, mid, L);
        if (WM + EPS >= annualExpenses) {
          earliest = mid;
          hi = mid - 1; // search earlier
        } else {
          lo = mid + 1;
        }
      }
    }

    // series for the chart (so chart = panel truth)
    const series = seriesSingle(p, retirementAge, L, W);

    return { mode: 'single', W, earliest, L, p, series };
    // eslint-disable-next-line
  }, [
    dieWithZeroMode, flags.dwzEnabled,
    // inputs:
    currentAge, retirementAge, lifeExpectancy,
    currentSavings, currentSuper,
    annualIncome, annualExpenses, additionalSuperContributions,
    hasPrivateHealth, hecsDebt, expectedReturn, inflationRate, auRules
  ]);

  // Derived FIRE ages (DWZ takes precedence when enabled)
  const dwzEarliestAge =
    dieWithZeroMode && flags.dwzEnabled && dwzOutputs?.earliest != null
      ? dwzOutputs.earliest
      : null;

  const fireAgeForUi = dwzEarliestAge ?? retirementAge;
  const yearsToFreedom = Math.max(0, fireAgeForUi - currentAge);

  // Chart data generation
  const chartDataSingle = useMemo(() => {
    const data = [];

    // Stable guard using DWZ earliest age
    const dwzOn = dieWithZeroMode && flags.dwzEnabled && Number.isFinite(dwzOutputs?.earliest);
    
    if (dwzOn && dwzOutputs?.W) {
      const realR = (expectedReturn/100 - inflationRate/100);
      const pAge   = getPreservationAge(currentAge, auRules);

      // use the *DWZ earliest* age for the splice point
      const Rchart = dwzEarliestAge ?? retirementAge;

      // 1) pre-FIRE accumulation using existing savings + super contributions
      const tax = calcIncomeTax(annualIncome, { hasPrivateHealth, hecsDebt }, auRules);
      const afterTaxIncome = Math.max(0, annualIncome - tax);
      const annualSavings = Math.max(0, afterTaxIncome - annualExpenses);
      const { netSuperContribution } = calculations; // this is already computed

      const pre = simulateAccumToAge({
        startAge: currentAge,
        endAge: Rchart,
        out0: currentSavings,
        sup0: currentSuper,
        annualSavings,
        netSuperContribution,
        r: realR
      });

      pre.pts.forEach(pt => {
        data.push({
          age: pt.age,
          outsideSuper: pt.outside,
          superBalance: pt.super,
          totalWealth: pt.outside + pt.super,
          spendToZeroWealth: pt.outside + pt.super,
          fireNumber: calculations.fireNumber
        });
      });

      // 2) post-FIRE DWZ drawdown from Rchart → life expectancy
      const pts = seriesSingle(
        { outAtR: pre.out, supAtR: pre.sup, rOut: realR, rSup: realR, P: pAge },
        Rchart,
        lifeExpectancy,
        annualExpenses
      );

      pts.forEach(pt => {
        data.push({
          age: pt.age,
          outsideSuper: pt.out,
          superBalance: pt.sup,
          totalWealth: pt.out + pt.sup,
          spendToZeroWealth: pt.out + pt.sup,
          fireNumber: calculations.fireNumber
        });
      });

      return data;
    }

    // legacy path (DWZ disabled)
    data.length = 0; // clear the array
    const { returnRate, netSuperContribution, fireNumber } = calculations;
    const tax = calcIncomeTax(annualIncome, { hasPrivateHealth, hecsDebt }, auRules);
    const afterTaxIncome = annualIncome - tax;
    const annualSavings = afterTaxIncome - annualExpenses;

    let outsideSuper = currentSavings;
    let superBalance = currentSuper;
    let spendToZeroOutside = currentSavings;
    let spendToZeroSuper = currentSuper;

    const initial4PercentWithdrawal = calculations.totalWealth * (safeWithdrawalRate / 100);
    const initialSpendToZeroWithdrawal = calculations.spendToZeroAmount;

    for (let age = currentAge; age <= Math.max(90, lifeExpectancy + 5); age++) {
      
      if (age < retirementAge) {
        if (annualSavings > 0) {
          outsideSuper += annualSavings;
          spendToZeroOutside += annualSavings;
        }
        superBalance += netSuperContribution;
        spendToZeroSuper += netSuperContribution;

        outsideSuper *= (1 + returnRate);
        superBalance *= (1 + returnRate);
        spendToZeroOutside *= (1 + returnRate);
        spendToZeroSuper *= (1 + returnRate);
      }
      else if (age >= retirementAge) {
        
        const totalWealthStandard = outsideSuper + superBalance;
        if (totalWealthStandard > 0 && initial4PercentWithdrawal > 0) {
          let withdrawal = initial4PercentWithdrawal;
          
          if (age < 60) {
            const maxOutsideWithdrawal = Math.min(withdrawal, outsideSuper);
            outsideSuper -= maxOutsideWithdrawal;
          } else {
            const outsideRatio = outsideSuper / totalWealthStandard;
            const superRatio = superBalance / totalWealthStandard;
            outsideSuper = Math.max(0, outsideSuper - (withdrawal * outsideRatio));
            superBalance = Math.max(0, superBalance - (withdrawal * superRatio));
          }

          outsideSuper *= (1 + returnRate);
          superBalance *= (1 + returnRate);
        }

        if (dieWithZeroMode) {
          const totalWealthSpendToZero = spendToZeroOutside + spendToZeroSuper;
          if (totalWealthSpendToZero > 0 && initialSpendToZeroWithdrawal > 0) {
            let withdrawal = initialSpendToZeroWithdrawal;
            
            if (age < 60) {
              const maxOutsideWithdrawal = Math.min(withdrawal, spendToZeroOutside);
              spendToZeroOutside -= maxOutsideWithdrawal;
            } else {
              const outsideRatio = spendToZeroOutside / totalWealthSpendToZero;
              const superRatio = spendToZeroSuper / totalWealthSpendToZero;
              spendToZeroOutside = Math.max(0, spendToZeroOutside - (withdrawal * outsideRatio));
              spendToZeroSuper = Math.max(0, spendToZeroSuper - (withdrawal * superRatio));
            }

            spendToZeroOutside *= (1 + returnRate);
            spendToZeroSuper *= (1 + returnRate);
          }
        }
      }

      data.push({
        age,
        outsideSuper: Math.max(0, outsideSuper),
        superBalance: Math.max(0, superBalance),
        totalWealth: Math.max(0, outsideSuper + superBalance),
        spendToZeroWealth: dieWithZeroMode ? Math.max(0, spendToZeroOutside + spendToZeroSuper) : (outsideSuper + superBalance),
        fireNumber
      });
    }

    return data;
  }, [
    dieWithZeroMode, flags.dwzEnabled, dwzOutputs?.earliest, dwzOutputs?.W, dwzOutputs?.L,
    calculations, currentAge, currentSavings, currentSuper, annualExpenses, 
    retirementAge, lifeExpectancy, annualIncome, safeWithdrawalRate, hasPrivateHealth, hecsDebt, auRules
  ]);

  const chartDataCouple = useMemo(() => {
    // COUPLE: Switch to DWZ simulation when DWZ mode is enabled
    if (dieWithZeroMode && flags.dwzEnabled && dwzOutputs?.W && dwzOutputs?.params?.pA && dwzOutputs?.params?.pB) {
      try {
        const { pA, pB, Lh } = dwzOutputs.params;
        
        // Additional validation
        if (!pA || !pB || typeof pA.outAtR !== 'number' || typeof pB.outAtR !== 'number') {
          console.warn('Invalid pA or pB data in chartDataCouple, falling back to old path');
          if (!coupleProjection) return null;
          return coupleProjection.series.map(s => ({
            age: s.age,
            outsideSuper: s.outsideSuper,
            superBalance: s.superBalances.reduce((a, b) => a + b, 0),
            totalWealth: s.totalWealth,
          }));
        }
        
        const params = {
          outA: pA.outAtR, supA: pA.supAtR,
          outB: pB.outAtR, supB: pB.supAtR,
          rOut: pA.rRetOut, rSup: pA.rRetSup,
          PA: pA.P, PB: pB.P
        };
        const pts = simulateDwzCouple(params, retirementAge, Lh, dwzOutputs.W);
        return pts.map(pt => ({
          age: pt.age,
          outsideSuper: pt.outside,
          superBalance: pt.super,
          totalWealth: pt.outside + pt.super,
        }));
      } catch (error) {
        console.error('Error in DWZ couples chart simulation:', error);
        // Fall back to old path
        if (!coupleProjection) return null;
        return coupleProjection.series.map(s => ({
          age: s.age,
          outsideSuper: s.outsideSuper,
          superBalance: s.superBalances.reduce((a, b) => a + b, 0),
          totalWealth: s.totalWealth,
        }));
      }
    } else {
      // OLD PATH: existing couple projection
      if (!coupleProjection) return null;
      return coupleProjection.series.map(s => ({
        age: s.age,
        outsideSuper: s.outsideSuper,
        superBalance: s.superBalances.reduce((a, b) => a + b, 0),
        totalWealth: s.totalWealth,
      }));
    }
  }, [dieWithZeroMode, flags.dwzEnabled, dwzOutputs?.W, dwzOutputs?.params?.pA, dwzOutputs?.params?.pB, currentAge, currentSavings, currentSuper,
      partnerB, expectedReturn, inflationRate, retirementAge, lifeExpectancy, auRules, coupleProjection]);

  const chartData = planningAs === 'couple' ? (chartDataCouple || []) : chartDataSingle;

  // Assert that DWZ chart really ends at ~0 (debugging aid)
  useEffect(() => {
    if (dieWithZeroMode && dwzOutputs?.series?.length) {
      const last = dwzOutputs.series[dwzOutputs.series.length - 1];
      const residual = (last.out + last.sup);
      if (Math.abs(residual) > 500) {
        console.warn('DWZ residual at life expectancy (should ~0 real):', residual);
      }
    }
  }, [dieWithZeroMode, dwzOutputs?.series]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Styling
  const cardStyle = {
    maxWidth: '1200px',
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

  const sectionStyle = {
    marginBottom: '24px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#fafafa',
  };

  const inputGroupStyle = {
    marginBottom: '16px',
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
    padding: '10px',
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

  const buttonStyle = {
    padding: '8px 16px',
    margin: '4px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#6366f1',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  };

  const resultStyle = {
    backgroundColor: '#f8fafc',
    padding: '24px',
    borderRadius: '12px',
    marginTop: '24px',
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

  const savingsRateColor = calculations.savingsRate >= 20 ? '#059669' : calculations.savingsRate >= 10 ? '#d97706' : '#dc2626';

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
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{`Age: ${label}`}</p>
          {payload.map((entry, index) => {
            const label = 
              dieWithZeroMode && flags.dwzEnabled
                ? (entry.name === 'totalWealth' ? 'DWZ total (real)' : entry.name)
                : entry.name;
            return (
              <p key={index} style={{ margin: '4px 0', color: entry.color }}>
                {`${label}: ${formatCurrency(entry.value)}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const chartStyle = {
    backgroundColor: '#f8fafc',
    padding: '24px',
    borderRadius: '12px',
    margin: '20px 0', // Remove auto margins for full width
  };

  return (
    <div style={cardStyle}>
      <h1 style={titleStyle}>🇦🇺 Australian FIRE Calculator</h1>
      


      {/* Your Situation - PayCalculator Style */}
      <div style={{
        ...sectionStyle,
        padding: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#374151', marginBottom: 20, fontSize: 18, fontWeight: 600 }}>👤 Your Situation</h3>
          <div style={{ fontSize: 13 }}>
            Planning as:&nbsp;
            <label><input type="radio" checked={planningAs==='single'} onChange={()=>setPlanningAs('single')} /> Single</label>
            &nbsp;&nbsp;
            <label><input type="radio" checked={planningAs==='couple'} onChange={()=>setPlanningAs('couple')} /> Couple</label>
          </div>
        </div>

        {/* Unified person cards */}
        <div style={{ display:'grid', gridTemplateColumns: planningAs==='couple' ? '1fr 1fr' : '1fr', gap:16 }}>
          {/* Person A */}
          <PersonSituationCard
            label="You"
            age={currentAge}                 onAge={setCurrentAge}
            retireAge={retirementAge}        onRetireAge={setRetirementAge}
            income={annualIncome}            onIncome={setAnnualIncome}
            savings={currentSavings}         onSavings={setCurrentSavings}
            superBalance={currentSuper}      onSuperBalance={setCurrentSuper}
            hasPrivateHealth={hasPrivateHealth}  onHasPrivateHealth={setHasPrivateHealth}
            hecsDebt={hecsDebt}              onHecsDebt={setHecsDebt}
            rules={auRules}
          />

          {/* Person B (only when Couple) */}
          {planningAs === 'couple' && (
            <PersonSituationCard
              label="Partner"
              age={partnerB.currentAge}            onAge={v=>setPartnerB(p=>({ ...p, currentAge:v }))}
              retireAge={partnerB.retireAge}       onRetireAge={v=>setPartnerB(p=>({ ...p, retireAge:v }))}
              income={partnerB.income}             onIncome={v=>setPartnerB(p=>({ ...p, income:v }))}
              savings={partnerB.liquidStart}       onSavings={v=>setPartnerB(p=>({ ...p, liquidStart:v }))}
              superBalance={partnerB.superStart}   onSuperBalance={v=>setPartnerB(p=>({ ...p, superStart:v }))}
              hasPrivateHealth={partnerB.hasPrivateHealth}
              onHasPrivateHealth={v=>setPartnerB(p=>({ ...p, hasPrivateHealth:v }))}
              hecsDebt={partnerB.hecsBalance}      onHecsDebt={v=>setPartnerB(p=>({ ...p, hecsBalance:v }))}
              rules={auRules}
            />
          )}
        </div>

        {/* Annual Expenses - separate input */}
        <div style={{ marginTop: 16 }}>
          <label style={{ ...labelStyle, marginBottom: spacing.sm }}>
            Annual Household Expenses
          </label>
          <input
            type="number"
            value={annualExpenses}
            onChange={(e) => setAnnualExpenses(parseFloat(e.target.value) || 0)}
            style={{ ...inputStyle, fontSize: '18px', fontWeight: '500', width: '100%' }}
            placeholder="40000"
          />
          {/* Savings rate below expenses */}
          {calculations.savingsRate > 0 && (
            <div style={{ 
              marginTop: spacing.sm,
              fontSize: '13px',
              color: calculations.savingsRate > 50 ? '#059669' : calculations.savingsRate > 20 ? '#f59e0b' : '#dc2626',
              fontWeight: '600'
            }}>
              Household savings rate: {calculations.savingsRate.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Tax & Deductions - Collapsible */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: spacing.md,
          overflow: 'hidden'
        }}>
          <div 
            onClick={() => setShowTaxSection(!showTaxSection)}
            style={{ 
              padding: `14px ${spacing.xl}`,
              cursor: 'pointer',
              backgroundColor: showTaxSection ? '#f9fafb' : '#ffffff',
              borderBottom: showTaxSection ? '1px solid #e5e7eb' : 'none',
              transition: 'background-color 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: '16px', color: '#6b7280' }}>
                  {showTaxSection ? '−' : '+'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Tax & Deductions
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Available for future tax optimization features
                </span>
              </div>
            </div>
          </div>
          
{showTaxSection && (
  <div style={{ padding: spacing.xl }}>
    <div style={{ 
      textAlign: 'center', 
      color: '#6b7280', 
      fontSize: '14px',
      padding: '32px 16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px dashed #d1d5db'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontWeight: '600', marginBottom: '8px' }}>Tax Optimization Features Coming Soon</div>
      <div style={{ lineHeight: '1.4' }}>
        Future features may include salary sacrifice optimization,<br/>
        franking credit calculations, and tax-effective investment strategies.
      </div>
      <div style={{ fontSize: '12px', marginTop: '12px', fontStyle: 'italic' }}>
        HECS/HELP debt and Private Health Insurance are now configured in the person details above.
      </div>
    </div>
  </div>
)}
        </div>

        <div>
        {/* Superannuation Strategy - Collapsible */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: spacing.md,
          overflow: 'hidden'
        }}>
          <div 
            onClick={() => setShowSuperSection(!showSuperSection)}
            style={{ 
              padding: `14px ${spacing.xl}`,
              cursor: 'pointer',
              backgroundColor: showSuperSection ? '#f9fafb' : '#ffffff',
              borderBottom: showSuperSection ? '1px solid #e5e7eb' : 'none',
              transition: 'background-color 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: '16px', color: '#6b7280' }}>
                  {showSuperSection ? '−' : '+'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Superannuation Strategy
                </span>
                {/* Status indicators */}
                {!showSuperSection && (
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600', marginLeft: spacing.sm }}>
                    Total: ${calculations.annualSuperContribution.toLocaleString()}/yr
                    {calculations.isOverCap && 
                      <span style={{ color: '#dc2626' }}> (over cap!)</span>
                    }
                  </span>
                )}
                {showSuperSection && additionalSuperContributions > 0 && <span style={{ color: '#059669', fontSize: '12px' }}>• ${additionalSuperContributions.toLocaleString()}/yr</span>}
                {showSuperSection && hasInsuranceInSuper && <span style={{ color: '#dc2626', fontSize: '12px' }}>• Insurance active</span>}
              </div>
            </div>
          </div>
          {showSuperSection && (
            <div style={{ padding: spacing.xl }}>
              {planningAs === 'single' ? (
                // Use same PartnerSuperPanel for consistency
                <PartnerSuperPanel
                  label="You"
                  income={annualIncome}
                  extra={additionalSuperContributions}
                  onExtraChange={setAdditionalSuperContributions}
                  hasInsurance={hasInsuranceInSuper}
                  onHasInsurance={setHasInsuranceInSuper}
                  premiums={insurancePremiums}
                  onPremiumsChange={setInsurancePremiums}
                  rules={auRules}
                  showLabel={false}
                />
              ) : (
                // Couples dual super panels
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  <PartnerSuperPanel
                    label="You"
                    income={annualIncome}
                    extra={additionalSuperContributions}
                    onExtraChange={setAdditionalSuperContributions}
                    hasInsurance={hasInsuranceInSuper}
                    onHasInsurance={setHasInsuranceInSuper}
                    premiums={insurancePremiums}
                    onPremiumsChange={setInsurancePremiums}
                    rules={auRules}
                  />
                  
                  <PartnerSuperPanel
                    label="Partner"
                    income={partnerB.income}
                    extra={partnerB.extraSuper ?? 0}
                    onExtraChange={(v)=>setPartnerB(p=>({ ...p, extraSuper: v }))}
                    hasInsurance={partnerB.hasInsuranceInSuper ?? false}
                    onHasInsurance={(v)=>setPartnerB(p=>({ ...p, hasInsuranceInSuper: v }))}
                    premiums={partnerB.insurancePremiums ?? { life:0, tpd:0, income:0 }}
                    onPremiumsChange={(p)=>setPartnerB(s=>({ ...s, insurancePremiums: p }))}
                    rules={auRules}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        </div>

      {/* Results Box - PayCalculator Style (prominent placement) */}
      {/* Results section will be moved here for better UX */}

      {/* Assumptions Panel */}
      <div style={{ 
        ...sectionStyle, 
        border: '2px solid #8b5cf6', 
        backgroundColor: showAssumptions ? '#faf5ff' : '#f9fafb',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: showAssumptions ? '20px' : '0',
          cursor: 'pointer'
        }} onClick={() => setShowAssumptions(!showAssumptions)}>
          <div>
            <h3 style={{ color: '#6b46c1', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showAssumptions ? '▼' : '▶'} Market Assumptions & Returns
              <span style={{ 
                backgroundColor: '#8b5cf6', 
                color: 'white', 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: '500' 
              }}>
                Advanced
              </span>
            </h3>
            <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
              Adjust market returns, withdrawal rates, and inflation assumptions
            </div>
          </div>
        </div>
        
        {showAssumptions && (
          <>
            {/* Investment Returns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  Expected Return: {expectedReturn}%
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>
                    {' '}(Historical: ASX ~10%, Global ~8%, Balanced portfolio ~8.5%)
                  </span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="0.5"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  Investment Fees: {investmentFees}%
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>
                    {' '}(ETFs 0.2-0.3%, Industry Super 0.6-0.8%, Retail Super 1-2%)
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={investmentFees}
                  onChange={(e) => setInvestmentFees(parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            </div>
            
            <div style={{ ...detailStyle, textAlign: 'center', fontWeight: '600', color: '#059669', marginBottom: '20px' }}>
              Net Return: {(expectedReturn - investmentFees).toFixed(1)}% 
              {adjustForInflation && ` | Real Return: ${(realReturn * 100).toFixed(1)}%`}
            </div>

            {/* Withdrawal Strategy */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                Safe Withdrawal Rate: {safeWithdrawalRate}%
                <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>
                  {' '}(US studies suggest 4%, Australian FIRE community uses 3.5% for our market)
                </span>
              </label>
              <input
                type="range"
                min="2.5"
                max="5"
                step="0.25"
                value={safeWithdrawalRate}
                onChange={(e) => setSafeWithdrawalRate(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ ...detailStyle, textAlign: 'center', marginTop: '8px' }}>
                Need {fireMultiplier.toFixed(1)}x expenses = {formatCurrency(fireNumber)}
              </div>
            </div>

            {/* Inflation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={adjustForInflation}
                    onChange={(e) => setAdjustForInflation(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Adjust for inflation
                </label>
                {adjustForInflation && (
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Inflation Rate: {inflationRate}%</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                      style={sliderStyle}
                    />
                  </div>
                )}
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={showInTodaysDollars}
                    onChange={(e) => setShowInTodaysDollars(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Show results in today's purchasing power
                </label>
              </div>
            </div>

          </>
        )}
      </div>


      {/* Advanced Super Strategy Section - REMOVED: Now integrated into Your Situation */}
      <div style={{ 
        display: 'none'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: showAdvancedSuper ? '20px' : '0',
          cursor: 'pointer'
        }} onClick={() => setShowAdvancedSuper(!showAdvancedSuper)}>
          <div>
            <h3 style={{ color: '#6b46c1', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showAdvancedSuper ? '▼' : '▶'} Advanced Super Strategy 
              <span style={{ 
                backgroundColor: '#8b5cf6', 
                color: 'white', 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: '500' 
              }}>
                Advanced
              </span>
            </h3>
            <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
              Optimize salary sacrifice and insurance impact
            </div>
          </div>
          <button 
            style={{ ...buttonStyle, backgroundColor: '#8b5cf6', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowAdvancedSuper(!showAdvancedSuper);
            }}
          >
            {showAdvancedSuper ? 'Collapse' : 'Expand'}
          </button>
        </div>
        
        {showAdvancedSuper && (
          <div style={{ 
            opacity: showAdvancedSuper ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            
            {/* Salary Sacrifice Panel */}
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '8px', 
              border: '1px solid #86efac' 
            }}>
              <h4 style={{ color: '#15803d', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Salary Sacrifice & Additional Contributions
              </h4>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  Additional Super Contributions: {formatCurrency(additionalSuperContributions)}/year
                </label>
                <input
                  type="range"
                  min="0"
                  max={auRules.concessional_cap}
                  step="1000"
                  value={additionalSuperContributions}
                  onChange={(e) => setAdditionalSuperContributions(parseInt(e.target.value))}
                  style={sliderStyle}
                />
                <input
                  type="number"
                  value={additionalSuperContributions}
                  onChange={(e) => setAdditionalSuperContributions(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, marginTop: '8px' }}
                  placeholder="0"
                />
              </div>

              {/* Super Contributions Summary */}
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'white', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Employer contribution:</strong> {formatCurrency(calculations.employerSuperContribution)}</div>
                  <div><strong>Your additional:</strong> {formatCurrency(additionalSuperContributions)}</div>
                  <div><strong>Total:</strong> {formatCurrency(calculations.totalAnnualSuperContribution)}</div>
                  <div><strong>Concessional cap:</strong> {formatCurrency(auRules.concessional_cap)}</div>
                </div>
                
                {calculations.isOverCap && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    backgroundColor: '#fef2f2', 
                    borderRadius: '4px', 
                    color: '#dc2626', 
                    fontSize: '14px', 
                    fontWeight: '600' 
                  }}>
                    ⚠️ Warning: Over concessional cap by {formatCurrency(calculations.totalAnnualSuperContribution - auRules.concessional_cap)}
                  </div>
                )}
                
                {additionalSuperContributions > 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '6px', 
                    border: '1px solid #86efac' 
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>
                      💡 Tax Benefits
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                      <div><strong>Tax saved:</strong> {formatCurrency(calculations.salSacTaxBenefit)}/year</div>
                      <div><strong>Net cost to you:</strong> {formatCurrency(calculations.salSacNetCost)}/year</div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                      <strong>Extra at preservation age:</strong> {formatCurrency(
                        additionalSuperContributions * Math.pow(1 + calculations.netReturn, Math.max(0, 60 - currentAge))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Insurance in Super Panel */}
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '8px', 
              border: '1px solid #f59e0b' 
            }}>
              <h4 style={{ color: '#92400e', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛡️ Insurance Premiums (reduces super growth)
              </h4>
              
              <div style={inputGroupStyle}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={hasInsuranceInSuper}
                    onChange={(e) => setHasInsuranceInSuper(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  I have insurance in super
                </label>
              </div>

              {hasInsuranceInSuper && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showItemizedInsurance}
                        onChange={(e) => setShowItemizedInsurance(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Show itemized premiums
                    </label>
                  </div>

                  {!showItemizedInsurance ? (
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Combined annual premium</label>
                      <input
                        type="number"
                        value={calculations.totalInsurancePremiums}
                        onChange={(e) => {
                          const total = parseFloat(e.target.value) || 0;
                          setInsurancePremiums({ life: total, tpd: 0, income: 0 });
                        }}
                        style={inputStyle}
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Life Insurance</label>
                        <input
                          type="number"
                          value={insurancePremiums.life}
                          onChange={(e) => setInsurancePremiums(prev => ({ 
                            ...prev, 
                            life: parseFloat(e.target.value) || 0 
                          }))}
                          style={inputStyle}
                          placeholder="0"
                        />
                      </div>
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>TPD Insurance</label>
                        <input
                          type="number"
                          value={insurancePremiums.tpd}
                          onChange={(e) => setInsurancePremiums(prev => ({ 
                            ...prev, 
                            tpd: parseFloat(e.target.value) || 0 
                          }))}
                          style={inputStyle}
                          placeholder="0"
                        />
                      </div>
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Income Protection</label>
                        <input
                          type="number"
                          value={insurancePremiums.income}
                          onChange={(e) => setInsurancePremiums(prev => ({ 
                            ...prev, 
                            income: parseFloat(e.target.value) || 0 
                          }))}
                          style={inputStyle}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {calculations.totalInsurancePremiums > 0 && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      backgroundColor: 'white', 
                      borderRadius: '6px', 
                      border: '1px solid #d1d5db' 
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                        📊 30-Year Insurance Impact
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        <div><strong>Total premiums:</strong> {formatCurrency(calculations.totalInsurancePremiums * 30)}</div>
                        <div><strong>Lost growth opportunity:</strong> {formatCurrency(
                          calculations.totalInsurancePremiums * (Math.pow(1 + calculations.netReturn, 30) - 1) / calculations.netReturn - 
                          calculations.totalInsurancePremiums * 30
                        )}</div>
                        <div style={{ fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                          <strong>Total impact:</strong> {formatCurrency(
                            calculations.totalInsurancePremiums * (Math.pow(1 + calculations.netReturn, 30) - 1) / calculations.netReturn
                          )}
                        </div>
                      </div>
                      {calculations.totalInsurancePremiums > 2000 && (
                        <div style={{ 
                          marginTop: '8px', 
                          fontSize: '13px', 
                          color: '#f59e0b', 
                          fontWeight: '600' 
                        }}>
                          💡 Consider external insurance to preserve super growth
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optimization Insights Panel */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px', 
              border: '1px solid #60a5fa' 
            }}>
              <h4 style={{ color: '#1d4ed8', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎯 Your Optimal Strategy
              </h4>
              
              {/* Personalized Recommendations */}
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                {calculations.marginalTaxRate > 0.32 && additionalSuperContributions === 0 && (
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
                    <strong>💡 Tax Opportunity:</strong> You could save {formatCurrency(calculations.remainingCap * (calculations.marginalTaxRate - 0.15))} 
                    in tax annually with salary sacrifice up to the cap.
                  </div>
                )}
                
                {calculations.totalInsurancePremiums > 2000 && (
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                    <strong>⚠️ Insurance Cost:</strong> Your insurance is costing {formatCurrency(
                      calculations.totalInsurancePremiums * (Math.pow(1 + calculations.netReturn, 30) - 1) / calculations.netReturn
                    )} in lost retirement funds over 30 years.
                  </div>
                )}
                
                {calculations.bridgePeriodDetails.needsBridge && additionalSuperContributions > 10000 && (
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                    <strong>⚠️ Bridge Strategy:</strong> Balance salary sacrifice carefully - you need {formatCurrency(calculations.bridgePeriodDetails.fundsNeeded)} 
                    outside super for bridge years to age 60.
                  </div>
                )}
                
                {/* Optimal Strategy Recommendation */}
                {calculations.marginalTaxRate > 0.32 && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>
                      🚀 Recommended Strategy
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      <strong>Optimal additional super:</strong> {formatCurrency(
                        calculations.bridgePeriodDetails.needsBridge 
                          ? Math.min(calculations.remainingCap, Math.max(0, calculations.remainingCap - 5000)) 
                          : calculations.remainingCap
                      )}
                      <br />
                      <strong>Reason:</strong> {calculations.bridgePeriodDetails.needsBridge 
                        ? 'Maximizes tax benefits while preserving bridge funds' 
                        : 'Uses full concessional cap for maximum tax efficiency'}
                    </div>
                  </div>
                )}
                
                {/* Visual Summary */}
                {(additionalSuperContributions > 0 || calculations.totalInsurancePremiums > 0) && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8', marginBottom: '12px' }}>
                      📊 Strategy Impact Comparison
                    </div>
                    
                    {/* Simple Bar Chart Comparison */}
                    <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          <span>Super at Age 60</span>
                          <span>{formatCurrency(currentSuper * Math.pow(1 + calculations.netReturn, Math.max(0, 60 - currentAge)) + calculations.employerSuperContribution * (Math.pow(1 + calculations.netReturn, Math.max(0, 60 - currentAge)) - 1) / calculations.netReturn)} → {formatCurrency(currentSuper * Math.pow(1 + calculations.netReturn, Math.max(0, 60 - currentAge)) + calculations.netSuperContribution * (Math.pow(1 + calculations.netReturn, Math.max(0, 60 - currentAge)) - 1) / calculations.netReturn)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', height: '20px' }}>
                          <div style={{ 
                            backgroundColor: '#e5e7eb', 
                            flex: '1', 
                            borderRadius: '4px',
                            position: 'relative'
                          }}>
                            <div style={{ 
                              backgroundColor: '#10b981', 
                              height: '100%', 
                              borderRadius: '4px',
                              width: '70%'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>vs</span>
                          <div style={{ 
                            backgroundColor: '#e5e7eb', 
                            flex: '1', 
                            borderRadius: '4px'
                          }}>
                            <div style={{ 
                              backgroundColor: '#8b5cf6', 
                              height: '100%', 
                              borderRadius: '4px',
                              width: additionalSuperContributions > 0 ? '85%' : '70%'
                            }}></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          <span>Current Strategy</span>
                          <span>Advanced Strategy</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          <span>Annual Tax Paid</span>
                          <span>{formatCurrency(calculations.tax)} → {formatCurrency(calculations.tax - calculations.salSacTaxBenefit)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', height: '16px' }}>
                          <div style={{ 
                            backgroundColor: '#fca5a5', 
                            flex: '1', 
                            borderRadius: '4px'
                          }}></div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>vs</span>
                          <div style={{ 
                            backgroundColor: '#86efac', 
                            flex: '1', 
                            borderRadius: '4px',
                            width: calculations.salSacTaxBenefit > 0 ? '85%' : '100%'
                          }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          <span>Higher Tax</span>
                          <span>Tax Optimized</span>
                        </div>
                      </div>

                      {calculations.bridgePeriodDetails.needsBridge && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                            <span>Bridge Period Risk</span>
                            <span>{calculations.bridgePeriodFeasible ? 'Low' : 'High'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', height: '16px' }}>
                            <div style={{ 
                              backgroundColor: calculations.bridgePeriodFeasible ? '#86efac' : '#fca5a5', 
                              flex: '1', 
                              borderRadius: '4px'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            {calculations.bridgePeriodFeasible ? 'Sufficient accessible funds' : 'May need to work longer'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Die with Zero Mode */}
      <div style={{ ...sectionStyle, border: '2px solid #8b5cf6', backgroundColor: '#f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <label style={{ ...labelStyle, margin: 0, flex: 1 }}>
            <span style={{ fontSize: '16px', fontWeight: '700' }}>Die with Zero mode 💀</span>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>
              Spend it all - you can't take it with you!
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dieWithZeroMode}
              onChange={(e) => setDieWithZeroMode(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Enable</span>
          </label>
        </div>
        
        {dieWithZeroMode && (
          <>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Life expectancy: {lifeExpectancy}</label>
              <input
                type="range"
                min="75"
                max="100"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(parseInt(e.target.value))}
                style={sliderStyle}
              />
            </div>

            {/* DWZ Insights Panel (Phase 3) - New reactive version */}
            {dieWithZeroMode && dwzOutputs && (
              <div style={{marginTop:12, padding:12, border:'1px solid #e5e7eb', borderRadius:8}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12}}>
                  <div>
                    <div style={{fontSize:13, color:'#4b5563'}}>Sustainable spend (real)</div>
                    <div style={{fontSize:20, fontWeight:700}}>
                      ${Math.round(dwzOutputs.W).toLocaleString()}/yr
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:13, color:'#4b5563'}}>Your plan spend</div>
                    <div style={{fontSize:20, fontWeight:700}}>
                      ${Math.round(annualExpenses).toLocaleString()}/yr
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:13, color:'#4b5563'}}>Status vs plan</div>
                    <div style={{fontSize:20, fontWeight:700, color: dwzOutputs.W >= annualExpenses ? '#059669' : '#dc2626'}}>
                      {dwzOutputs.W >= annualExpenses ? 'OK' : 'Shortfall'}
                    </div>
                  </div>
                  {dwzOutputs.earliest != null && (
                    <div>
                      <div style={{fontSize:13, color:'#4b5563'}}>Earliest FIRE age (same spend)</div>
                      <div style={{fontSize:20, fontWeight:700}}>
                        {dwzOutputs.earliest}
                        {dwzOutputs.earliest < retirementAge &&
                          <span style={{marginLeft:8, fontSize:14, color:'#059669'}}>
                            ({retirementAge - dwzOutputs.earliest} yrs earlier)
                          </span>
                        }
                      </div>
                    </div>
                  )}
                </div>
                <div style={{marginTop:8, fontSize:12, color:'#6b7280'}}>
                  Real (today's) dollars. Outside money covers the bridge until super unlocks at preservation age. Life expectancy set to {lifeExpectancy}.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Results */}
      <div style={resultStyle}>
        {planningAs === 'couple' && coupleProjection ? (
          (() => {
            const s = coupleProjection.summary;
            const wealthAtRet = s.wealthAtRetirement;
            const canRetire = s.canRetire;
            const earliest = s.earliestRetirement;
            const bridge = s.bridge;
            return canRetire ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>
                    ✅ You can retire (earliest) at {earliest}!
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', padding: '24px', background: '#f9fafb', borderRadius: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#059669' }}>{formatCurrency(wealthAtRet)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Wealth at earliest retirement</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#6366f1' }}>{safeWithdrawalRate}%</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>SWR used</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{lifeExpectancy - Math.min(currentAge, partnerB.currentAge)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Years horizon (approx.)</div>
                  </div>
                </div>
                {bridge.needsBridge && (
                  <div style={{ padding: 16, backgroundColor: bridge.feasible ? '#f0fdf4' : '#fef2f2', borderLeft: `4px solid ${bridge.feasible ? '#10b981' : '#ef4444'}`, borderRadius: 4, marginTop: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Bridge to Preservation: {bridge.feasible ? 'Covered' : 'Short'}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Need {formatCurrency(bridge.fundsNeeded)} outside super; have {formatCurrency(bridge.fundsAvailable)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
                  ❌ Cannot retire at earliest target {earliest}
                </div>
                {bridge.needsBridge && !bridge.feasible && (
                  <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: 14, color: '#7f1d1d' }}>
                    Main issue: Insufficient outside-super to bridge to preservation age
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          // existing single-person results block
          annualExpenses <= 0 ? (
            <div style={errorStyle}>
              ⚠️ Please enter your annual expenses to calculate retirement
            </div>
          ) : calculations.canRetire ? (
          <div>
            {/* Main Message - Big and Clear */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
                ✅ You can retire at {fireAgeForUi}!
              </div>
            </div>
            
            {/* Key Metrics - Clean Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '32px',
              padding: '24px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>
                  {formatCurrency(calculations.totalWealth)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Wealth at retirement
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1' }}>
                  {calculations.savingsRate.toFixed(0)}%
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Savings rate
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
                  {yearsToFreedom} years
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Years to freedom
                </div>
              </div>
            </div>

            {/* Bridge Alert - Only if retiring before 60 */}
            {calculations.bridgePeriodDetails.needsBridge && retirementAge < 60 && (
              <div style={{ 
                padding: '16px', 
                backgroundColor: calculations.bridgePeriodFeasible ? '#f0fdf4' : '#fef2f2',
                borderLeft: `4px solid ${calculations.bridgePeriodFeasible ? '#10b981' : '#ef4444'}`,
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {calculations.bridgePeriodFeasible ? '✅' : '⚠️'}
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      Bridge to Age 60: {calculations.bridgePeriodFeasible ? 'Covered' : 'Short'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Need ${(calculations.bridgePeriodDetails.fundsNeeded/1000).toFixed(0)}k outside super for {calculations.bridgePeriodDetails.bridgeYears} years
                      {calculations.bridgePeriodFeasible 
                        ? ` (have ${(calculations.bridgePeriodDetails.fundsAvailable/1000).toFixed(0)}k)`
                        : ` (only have ${(calculations.bridgePeriodDetails.fundsAvailable/1000).toFixed(0)}k)`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Assumptions - Very Subtle */}
            <div style={{ 
              fontSize: '11px', 
              color: '#9ca3af', 
              textAlign: 'center',
              marginTop: '16px'
            }}>
              {(calculations.netReturn * 100).toFixed(1)}% returns • {safeWithdrawalRate}% withdrawal
              {adjustForInflation && ` • ${inflationRate}% inflation`}
            </div>
          </div>
        ) : (
          // FAILURE STATE - Also simplified
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626', marginBottom: '12px' }}>
                ❌ Cannot retire at {retirementAge}
              </div>
              <div style={{ fontSize: '20px', color: '#374151' }}>
                Need <span style={{ fontWeight: '700', color: '#dc2626' }}>
                  {formatCurrency(calculations.shortfall)}
                </span> more
              </div>
            </div>
            
            {/* Quick reason why */}
            {calculations.bridgePeriodDetails.needsBridge && !calculations.bridgePeriodFeasible && (
              <div style={{ 
                textAlign: 'center',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#7f1d1d'
              }}>
                Main issue: Not enough funds outside super to bridge to age 60
              </div>
            )}
          </div>
        )
        )}
      </div>

      {/* Legacy DWZ bonus banner — disabled */}
      {false && (
        <div> ... old banner ... </div>
      )}

      {/* Chart */}
      <div style={chartStyle}>
        <h3 style={{ marginBottom: '20px', color: '#374151', fontSize: '18px', fontWeight: '600' }}>
          Wealth Projection {showInTodaysDollars ? '(Today\'s Dollars)' : '(Future Dollars)'}
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
              domain={[currentAge, (dieWithZeroMode && dwzOutputs?.L) || Math.max(90, lifeExpectancy + 5)]}
              type="number"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value).replace('.00', '')}
            />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine 
              x={retirementAge} 
              stroke="#6b7280" 
              strokeDasharray="5 5"
              label={{ value: `Retirement: ${retirementAge}`, position: "top" }}
            />
            {dwzEarliestAge != null && (
              <ReferenceLine
                x={dwzEarliestAge}
                stroke="#059669"
                strokeDasharray="4 3"
                label={{ value: 'Earliest FIRE (DWZ)', position: 'top', fill: '#059669', fontSize: 12 }}
              />
            )}
            <ReferenceLine 
              y={calculations.fireNumber} 
              stroke="#dc2626" 
              strokeDasharray="3 3"
              label={{ value: `FIRE Number (${fireMultiplier.toFixed(1)}x)`, position: "topRight" }}
            />
            {dieWithZeroMode && (
              <ReferenceLine 
                x={lifeExpectancy} 
                stroke="#f59e0b" 
                strokeDasharray="8 4"
                label={{ value: `Life Expectancy: ${lifeExpectancy}`, position: "topLeft" }}
              />
            )}

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
              name={`Total Wealth (${safeWithdrawalRate}% Rule)`}
              dot={false}
            />
            {dieWithZeroMode && (
              <Line 
                type="monotone" 
                dataKey="spendToZeroWealth" 
                stroke="#f59e0b" 
                strokeWidth={3}
                strokeDasharray="8 4"
                name="Spend to Zero Wealth"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Save/Load Controls - Subtle Bottom Section */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '1px solid #e5e7eb', 
        color: '#6b7280',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <button 
            style={{ 
              ...buttonStyle, 
              backgroundColor: '#6b7280', 
              fontSize: '11px', 
              padding: '4px 12px',
              opacity: 0.8
            }} 
            onClick={saveToLocalStorage}
          >
            💾 Save
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              backgroundColor: '#6b7280', 
              fontSize: '11px', 
              padding: '4px 12px',
              opacity: 0.8
            }} 
            onClick={loadFromLocalStorage}
          >
            📂 Load
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              backgroundColor: '#6b7280', 
              fontSize: '11px', 
              padding: '4px 12px',
              opacity: 0.8
            }} 
            onClick={generateShareLink}
          >
            🔗 Share
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              backgroundColor: '#6b7280', 
              fontSize: '11px', 
              padding: '4px 12px',
              opacity: 0.8
            }} 
            onClick={resetToDefaults}
          >
            🔄 Reset
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#9ca3af' }}>
          Save settings locally or generate shareable links
        </div>
      </div>
    </div>
  );
};

export default AustralianFireCalculator;