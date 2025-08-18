import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const AustralianFireCalculator = () => {
  // Basic inputs
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(50);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [annualIncome, setAnnualIncome] = useState(100000);
  const [annualExpenses, setAnnualExpenses] = useState(40000);
  const [currentSuper, setCurrentSuper] = useState(100000);
  const [dieWithZeroMode, setDieWithZeroMode] = useState(false);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);

  // Assumptions Panel
  const [showAssumptions, setShowAssumptions] = useState(true);
  const [expectedReturn, setExpectedReturn] = useState(8.5);
  const [investmentFees, setInvestmentFees] = useState(0.5);
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState(3.5);
  const [adjustForInflation, setAdjustForInflation] = useState(true);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [showInTodaysDollars, setShowInTodaysDollars] = useState(true);
  const [hecsDebt, setHecsDebt] = useState(0);
  const [hasPrivateHealth, setHasPrivateHealth] = useState(false);

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

  // HECS calculation function
  const calculateHecs = (income) => {
    if (hecsDebt <= 0) return 0;
    
    const thresholds = [
      { min: 151200, rate: 10 },
      { min: 142647, rate: 9.5 },
      { min: 134568, rate: 9 },
      { min: 126950, rate: 8.5 },
      { min: 119764, rate: 8 },
      { min: 112985, rate: 7.5 },
      { min: 106590, rate: 7 },
      { min: 100557, rate: 6.5 },
      { min: 94865, rate: 6 },
      { min: 89498, rate: 5.5 },
      { min: 84432, rate: 5 },
      { min: 79653, rate: 4.5 },
      { min: 75140, rate: 4 },
      { min: 70888, rate: 3.5 },
      { min: 66875, rate: 3 },
      { min: 63090, rate: 2.5 },
      { min: 59519, rate: 2 },
      { min: 51550, rate: 1 },
      { min: 0, rate: 0 }
    ];
    
    const bracket = thresholds.find(t => income >= t.min);
    return Math.min(income * bracket.rate / 100, hecsDebt);
  };

  // Australian tax brackets 2024-25 with Medicare Levy
  const calculateTax = (income) => {
    let tax = 0;
    
    // Income tax
    if (income <= 18200) tax = 0;
    else if (income <= 45000) tax = (income - 18200) * 0.19;
    else if (income <= 120000) tax = 5092 + (income - 45000) * 0.325;
    else if (income <= 180000) tax = 29467 + (income - 120000) * 0.37;
    else tax = 51667 + (income - 180000) * 0.45;
    
    // Medicare Levy (2%)
    if (income > 29207) {
      tax += income * 0.02;
    }
    
    // Medicare Levy Surcharge (1% if no private health and income > threshold)
    if (!hasPrivateHealth && income > 97000) {
      tax += income * 0.01;
    }
    
    // HECS repayment
    tax += calculateHecs(income);
    
    return tax;
  };

  const calculations = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge;
    const isAlreadyRetired = yearsToRetirement <= 0;
    const tax = calculateTax(annualIncome);
    const afterTaxIncome = annualIncome - tax;
    const annualSavings = afterTaxIncome - annualExpenses;
    const savingsRate = afterTaxIncome > 0 ? (annualSavings / afterTaxIncome) * 100 : 0;
    const effectiveTaxRate = (tax / annualIncome) * 100;

    // Super contributions (12% of pre-tax income + additional)
    const maxSuperBase = 260280;
    const employerSuperContribution = Math.min(annualIncome, maxSuperBase) * 0.12;
    const totalAnnualSuperContribution = employerSuperContribution + additionalSuperContributions;
    
    // Salary sacrifice tax benefits
    const marginalTaxRate = annualIncome > 180000 ? 0.47 : 
                           annualIncome > 120000 ? 0.39 : 
                           annualIncome > 45000 ? 0.345 : 0.19;
    const superTaxRate = 0.15;
    const salSacTaxBenefit = additionalSuperContributions * (marginalTaxRate - superTaxRate);
    const salSacNetCost = additionalSuperContributions - salSacTaxBenefit;
    
    // Insurance premiums impact
    const totalInsurancePremiums = hasInsuranceInSuper ? 
      (insurancePremiums.life + insurancePremiums.tpd + insurancePremiums.income) : 0;
    
    // Net super contribution after insurance
    const netSuperContribution = totalAnnualSuperContribution - totalInsurancePremiums;

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
    const preservationAge = 60;
    let bridgePeriodFeasible = true;
    let bridgePeriodShortfall = 0;
    let bridgePeriodDetails = {
      needsBridge: false,
      bridgeYears: 0,
      fundsNeeded: 0,
      fundsAvailable: 0,
      shortfall: 0
    };

    // Calculate bridge period needs if retiring before preservation age
    if (!isAlreadyRetired && retirementAge < preservationAge) {
      const bridgeYears = preservationAge - retirementAge;
      bridgePeriodDetails.needsBridge = true;
      bridgePeriodDetails.bridgeYears = bridgeYears;
      
      // Calculate funds available outside super at retirement
      const futureOutsideSuper = currentSavings * Math.pow(1 + returnRate, yearsToRetirement) +
        (annualSavings > 0 ? annualSavings * (Math.pow(1 + returnRate, yearsToRetirement) - 1) / returnRate : 0);
      
      bridgePeriodDetails.fundsAvailable = futureOutsideSuper;
      
      // Calculate funds needed for bridge period (expenses during bridge years with growth)
      // This uses the present value of annuity formula for the bridge period
      let annualNeed = annualExpenses;
      if (dieWithZeroMode) {
        // For die-with-zero, calculate the portion needed just for the bridge period
        annualNeed = Math.min(annualExpenses, spendToZeroAmount);
      }
      
      // Calculate present value of bridge period expenses at retirement
      if (returnRate > 0) {
        bridgePeriodDetails.fundsNeeded = annualNeed * (1 - Math.pow(1 + returnRate, -bridgeYears)) / returnRate;
      } else {
        bridgePeriodDetails.fundsNeeded = annualNeed * bridgeYears;
      }
      
      bridgePeriodDetails.shortfall = Math.max(0, bridgePeriodDetails.fundsNeeded - bridgePeriodDetails.fundsAvailable);
      bridgePeriodFeasible = bridgePeriodDetails.shortfall === 0;
      bridgePeriodShortfall = bridgePeriodDetails.shortfall;

      // Console logging for verification
      console.log('=== PRESERVATION AGE BRIDGE VALIDATION ===');
      console.log(`Retirement age: ${retirementAge}, Preservation age: ${preservationAge}`);
      console.log(`Bridge period needed: ${bridgeYears} years`);
      console.log(`Annual expenses during bridge: ${annualNeed}`);
      console.log(`Funds needed for bridge period: ${bridgePeriodDetails.fundsNeeded}`);
      console.log(`Funds available outside super at retirement: ${bridgePeriodDetails.fundsAvailable}`);
      console.log(`Bridge feasible: ${bridgePeriodFeasible}`);
      console.log(`Bridge shortfall: ${bridgePeriodDetails.shortfall}`);
    } else if (isAlreadyRetired && currentAge < preservationAge) {
      // Handle case where user is already retired but under preservation age
      const bridgeYears = preservationAge - currentAge;
      bridgePeriodDetails.needsBridge = true;
      bridgePeriodDetails.bridgeYears = bridgeYears;
      bridgePeriodDetails.fundsAvailable = currentSavings; // Current outside super balance
      
      let annualNeed = annualExpenses;
      if (dieWithZeroMode) {
        annualNeed = Math.min(annualExpenses, spendToZeroAmount);
      }
      
      if (returnRate > 0) {
        bridgePeriodDetails.fundsNeeded = annualNeed * (1 - Math.pow(1 + returnRate, -bridgeYears)) / returnRate;
      } else {
        bridgePeriodDetails.fundsNeeded = annualNeed * bridgeYears;
      }
      
      bridgePeriodDetails.shortfall = Math.max(0, bridgePeriodDetails.fundsNeeded - bridgePeriodDetails.fundsAvailable);
      bridgePeriodFeasible = bridgePeriodDetails.shortfall === 0;
      bridgePeriodShortfall = bridgePeriodDetails.shortfall;

      console.log('=== ALREADY RETIRED - BRIDGE VALIDATION ===');
      console.log(`Current age: ${currentAge}, Preservation age: ${preservationAge}`);
      console.log(`Bridge years remaining: ${bridgeYears}`);
      console.log(`Current outside super funds: ${bridgePeriodDetails.fundsAvailable}`);
      console.log(`Bridge feasible: ${bridgePeriodFeasible}`);
      console.log(`Bridge shortfall: ${bridgePeriodDetails.shortfall}`);
    }

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
      annualSuperContribution,
      isAlreadyRetired,
      spendingBonus: Math.max(0, spendToZeroAmount - withdrawalAmount),
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
      // Optimization insights
      maxConcessionalCap: 30000,
      remainingCap: Math.max(0, 30000 - totalAnnualSuperContribution),
      isOverCap: totalAnnualSuperContribution > 30000
    };
  }, [currentAge, retirementAge, currentSavings, annualIncome, annualExpenses, currentSuper, 
      dieWithZeroMode, lifeExpectancy, expectedReturn, investmentFees, safeWithdrawalRate, 
      adjustForInflation, inflationRate, showInTodaysDollars, hecsDebt, hasPrivateHealth,
      additionalSuperContributions, hasInsuranceInSuper, insurancePremiums]);

  // Chart data generation
  const chartData = useMemo(() => {
    const data = [];
    const { returnRate, netSuperContribution } = calculations;
    const tax = calculateTax(annualIncome);
    const afterTaxIncome = annualIncome - tax;
    const annualSavings = afterTaxIncome - annualExpenses;

    let outsideSuper = currentSavings;
    let superBalance = currentSuper;
    let spendToZeroOutside = currentSavings;
    let spendToZeroSuper = currentSuper;

    const initial4PercentWithdrawal = calculations.totalWealth * (safeWithdrawalRate / 100);
    const initialSpendToZeroWithdrawal = calculations.spendToZeroAmount;

    // Add logging for chart simulation
    console.log('=== CHART SIMULATION START ===');
    console.log(`Initial outside super: ${outsideSuper}`);
    console.log(`Initial super balance: ${superBalance}`);
    console.log(`Retirement age: ${retirementAge}`);
    console.log(`Initial withdrawal amount: ${initial4PercentWithdrawal}`);

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
            // Log critical bridge period info
            if (age === retirementAge || age === 59) {
              console.log(`AGE ${age} (PRE-PRESERVATION): Outside=${outsideSuper.toFixed(0)}, Super=${superBalance.toFixed(0)}, Withdrawal attempted=${withdrawal.toFixed(0)}, Actual withdrawal=${maxOutsideWithdrawal.toFixed(0)}`);
            }
          } else {
            const outsideRatio = outsideSuper / totalWealthStandard;
            const superRatio = superBalance / totalWealthStandard;
            outsideSuper = Math.max(0, outsideSuper - (withdrawal * outsideRatio));
            superBalance = Math.max(0, superBalance - (withdrawal * superRatio));
            // Log preservation age access
            if (age === 60 || age === 61) {
              console.log(`AGE ${age} (POST-PRESERVATION): Outside=${outsideSuper.toFixed(0)}, Super=${superBalance.toFixed(0)}, Full withdrawal=${withdrawal.toFixed(0)}`);
            }
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
  }, [currentAge, currentSavings, currentSuper, annualExpenses, calculations, dieWithZeroMode, 
      lifeExpectancy, retirementAge, annualIncome, safeWithdrawalRate]);

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
    maxWidth: '800px',
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
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
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
      
      {/* Preset Scenarios */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', color: '#374151' }}>Quick Scenarios</h3>
        <button style={buttonStyle} onClick={() => applyPreset('optimistic')}>
          Optimistic (10%/4%)
        </button>
        <button style={buttonStyle} onClick={() => applyPreset('balanced')}>
          Balanced (8.5%/3.5%)
        </button>
        <button style={buttonStyle} onClick={() => applyPreset('pessimistic')}>
          Pessimistic (6%/3%)
        </button>
        <button style={buttonStyle} onClick={() => applyPreset('gfc')}>
          GFC Stress (4%/2.5%)
        </button>
      </div>

      {/* Save/Load Controls */}
      <div style={{ textAlign: 'center', marginBottom: '20px', padding: '16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
        <h4 style={{ marginBottom: '12px', color: '#374151', fontSize: '14px' }}>💾 Save & Share</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          <button style={{ ...buttonStyle, backgroundColor: '#10b981' }} onClick={saveToLocalStorage}>
            💾 Save Settings
          </button>
          <button style={{ ...buttonStyle, backgroundColor: '#3b82f6' }} onClick={loadFromLocalStorage}>
            📂 Load Settings
          </button>
          <button style={{ ...buttonStyle, backgroundColor: '#8b5cf6' }} onClick={generateShareLink}>
            🔗 Copy Share Link
          </button>
          <button style={{ ...buttonStyle, backgroundColor: '#f59e0b' }} onClick={resetToDefaults}>
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* Assumptions Panel */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#374151', margin: 0 }}>📊 Assumptions</h3>
          <button 
            style={{ ...buttonStyle, backgroundColor: '#6b7280' }}
            onClick={() => setShowAssumptions(!showAssumptions)}
          >
            {showAssumptions ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
        
        {showAssumptions && (
          <>
            {/* Investment Returns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  Expected Return: {expectedReturn}%
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>
                    {' '}(ASX200 ~10%, Global ~8%, Balanced ~8.5%)
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
                    {' '}(ETFs ~0.2%, Industry Super ~0.8%, Retail ~1.5%)
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
                  {' '}(Trinity Study suggests 4%, Aussie consensus is 3.5% for safety)
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

            {/* Tax Complexity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>HECS/HELP Debt</label>
                <input
                  type="number"
                  value={hecsDebt}
                  onChange={(e) => setHecsDebt(parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={hasPrivateHealth}
                    onChange={(e) => setHasPrivateHealth(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Private Health Insurance
                  <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
                    (avoids Medicare Levy Surcharge)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ ...detailStyle, textAlign: 'center', marginTop: '16px' }}>
              Effective Tax Rate: <span style={{ fontWeight: '600', color: '#dc2626' }}>
                {calculations.effectiveTaxRate.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Basic Inputs */}
      <div style={sectionStyle}>
        <h3 style={{ color: '#374151', marginBottom: '16px' }}>👤 Your Situation</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Current Age: {currentAge}</label>
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
            <label style={labelStyle}>Retirement Target Age: {retirementAge}</label>
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
              onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)}
              style={inputStyle}
              placeholder="50000"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Annual Pre-tax Income</label>
            <input
              type="number"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
              style={inputStyle}
              placeholder="100000"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Annual Expenses</label>
            <input
              type="number"
              value={annualExpenses}
              onChange={(e) => setAnnualExpenses(parseFloat(e.target.value) || 0)}
              style={inputStyle}
              placeholder="40000"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Current Super Balance</label>
            <input
              type="number"
              value={currentSuper}
              onChange={(e) => setCurrentSuper(parseFloat(e.target.value) || 0)}
              style={inputStyle}
              placeholder="100000"
            />
          </div>
        </div>
      </div>

      {/* Advanced Super Strategy Section */}
      <div style={{ 
        ...sectionStyle, 
        border: '2px solid #8b5cf6', 
        backgroundColor: showAdvancedSuper ? '#faf5ff' : '#f9fafb',
        transition: 'all 0.3s ease'
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
                  max="30000"
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
                  <div><strong>Concessional cap:</strong> {formatCurrency(30000)}</div>
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
                    ⚠️ Warning: Over concessional cap by {formatCurrency(calculations.totalAnnualSuperContribution - 30000)}
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
        )}
      </div>

      {/* Enhanced Results */}
      <div style={resultStyle}>
        {annualExpenses <= 0 ? (
          <div style={errorStyle}>
            ⚠️ Please enter your annual expenses to calculate retirement
          </div>
        ) : calculations.isAlreadyRetired ? (
          <div>
            <div style={successStyle}>
              🎯 You're already at/past your target retirement age!
            </div>
            <div style={detailStyle}>
              <strong>Current wealth:</strong> {formatCurrency(calculations.totalWealth)}
            </div>
            <div style={detailStyle}>
              <strong>Need for retirement:</strong> {formatCurrency(calculations.fireNumber)} (expenses × {fireMultiplier.toFixed(1)})
            </div>
            {calculations.canRetire ? (
              <div style={{ ...detailStyle, color: '#059669', fontWeight: '600' }}>
                ✅ You have enough to retire now!
              </div>
            ) : (
              <div style={{ ...detailStyle, color: '#dc2626', fontWeight: '600' }}>
                ❌ You need {formatCurrency(calculations.shortfall)} more to retire
              </div>
            )}
          </div>
        ) : calculations.canRetire ? (
          <div>
            <div style={successStyle}>
              ✅ You can retire at {retirementAge}!
            </div>
            
            {/* Show bridge period success info if applicable */}
            {calculations.bridgePeriodDetails.needsBridge && calculations.bridgePeriodFeasible && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '8px', 
                border: '1px solid #86efac' 
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', marginBottom: '8px' }}>
                  ✅ Bridge to preservation age 60 is feasible
                </div>
                <div style={{ ...detailStyle, color: '#166534', marginBottom: '4px', fontSize: '14px' }}>
                  <strong>Bridge period:</strong> {calculations.bridgePeriodDetails.bridgeYears} years (age {retirementAge} to 60)
                </div>
                <div style={{ ...detailStyle, color: '#166534', marginBottom: '4px', fontSize: '14px' }}>
                  <strong>Funds needed:</strong> {formatCurrency(calculations.bridgePeriodDetails.fundsNeeded)}
                </div>
                <div style={{ ...detailStyle, color: '#166534', fontSize: '14px' }}>
                  <strong>Available outside super:</strong> {formatCurrency(calculations.bridgePeriodDetails.fundsAvailable)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={errorStyle}>
              ❌ Cannot retire at {retirementAge}
            </div>
            
            {/* Basic retirement shortfall */}
            {!calculations.basicRetirementFeasible && (
              <div style={{ ...detailStyle, color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
                Need {formatCurrency(calculations.shortfall - calculations.bridgePeriodShortfall)} more for basic retirement
              </div>
            )}
            
            {/* Bridge period shortfall */}
            {calculations.bridgePeriodDetails.needsBridge && !calculations.bridgePeriodFeasible && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: '#fef2f2', 
                borderRadius: '8px', 
                border: '1px solid #fca5a5' 
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                  ⚠️ Insufficient funds outside super to bridge to preservation age 60
                </div>
                <div style={{ ...detailStyle, color: '#7f1d1d', marginBottom: '4px' }}>
                  <strong>Bridge period:</strong> {calculations.bridgePeriodDetails.bridgeYears} years (age {retirementAge} to 60)
                </div>
                <div style={{ ...detailStyle, color: '#7f1d1d', marginBottom: '4px' }}>
                  <strong>Funds needed for bridge:</strong> {formatCurrency(calculations.bridgePeriodDetails.fundsNeeded)}
                </div>
                <div style={{ ...detailStyle, color: '#7f1d1d', marginBottom: '4px' }}>
                  <strong>Funds available outside super:</strong> {formatCurrency(calculations.bridgePeriodDetails.fundsAvailable)}
                </div>
                <div style={{ ...detailStyle, color: '#dc2626', fontWeight: '600' }}>
                  <strong>Need {formatCurrency(calculations.bridgePeriodShortfall)} more in accessible investments</strong>
                </div>
              </div>
            )}

            {/* Show total shortfall */}
            <div style={{ ...detailStyle, color: '#dc2626', fontWeight: '600', marginTop: '8px' }}>
              <strong>Total additional funds needed: {formatCurrency(calculations.shortfall)}</strong>
            </div>
          </div>
        )}

        {annualExpenses > 0 && !calculations.isAlreadyRetired && (
          <>
            <div style={detailStyle}>
              <strong>Projected wealth at retirement:</strong> {formatCurrency(calculations.totalWealth)}
            </div>
            <div style={{ ...detailStyle, fontSize: '14px', fontStyle: 'italic', marginTop: '8px' }}>
              Based on {(calculations.netReturn * 100).toFixed(1)}% net returns, {safeWithdrawalRate}% withdrawal rate
              {adjustForInflation && `, ${inflationRate}% inflation`}
              {showInTodaysDollars && ' (in today\'s purchasing power)'}
            </div>
          </>
        )}

        {calculations.annualSavings < 0 ? (
          <div style={{ ...detailStyle, color: '#dc2626', fontWeight: '600', marginTop: '12px' }}>
            ⚠️ Negative savings rate! Your expenses exceed income by {formatCurrency(Math.abs(calculations.annualSavings))}
          </div>
        ) : annualExpenses > 0 && (
          <div style={detailStyle}>
            <strong>Savings rate:</strong>
            <span style={{ color: savingsRateColor, fontWeight: '600' }}>
              {' '}{calculations.savingsRate.toFixed(1)}%
            </span>
          </div>
        )}

        {dieWithZeroMode && annualExpenses > 0 && (
          <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
              💰 Withdrawal Strategies Comparison
            </div>
            <div style={{ ...detailStyle, marginBottom: '4px' }}>
              <strong>Safe perpetual withdrawal ({safeWithdrawalRate}%):</strong> {formatCurrency(calculations.withdrawalAmount)}/year
            </div>
            <div style={{ ...detailStyle, marginBottom: '8px' }}>
              <strong>Spend to zero by age {lifeExpectancy}:</strong> {formatCurrency(calculations.spendToZeroAmount)}/year
            </div>
            {calculations.spendingBonus > 0 && (
              <div style={{ ...detailStyle, color: '#059669', fontWeight: '600' }}>
                🎉 <strong>Spend to Zero bonus:</strong> Extra {formatCurrency(calculations.spendingBonus)} per year to actually enjoy!
                <br />
                <span style={{ fontSize: '14px' }}>
                  That's {Math.round(calculations.spendingBonus / 5000)} extra holidays, or {Math.round(calculations.spendingBonus / 100)} bottles of wine per year! 🍷
                </span>
              </div>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default AustralianFireCalculator;