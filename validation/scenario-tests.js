#!/usr/bin/env node

import { optimizeSplitSingle, optimizeSplitCouple } from '../src/core/optimizer/split_optimizer.js';

console.log('=== DWZ Contribution Split Optimizer - Scenario Validation ===\n');

// Scenario 1: Single person w/ tight concessional cap
console.log('📊 SCENARIO 1: Single person with tight concessional cap');
console.log('High income professional approaching cap limits\n');

const scenario1 = {
  currentAge: 35,
  targetSpend: 80000,
  annualSavingsBudget: 60000,
  bequest: 0,
  lifeExpectancy: 85,
  currentSavings: 200000,
  currentSuper: 150000,
  annualIncome: 180000, // High income = high SG = less headroom
  rReal: 0.04,
  preservationAge: 60,
  sgRate: 0.115, // $20,700 SG contribution
  concessionalCap: 27500, // Only $6,800 headroom
  superInsurance: 1500,
  contributionsTaxRate: 0.15
};

const result1 = optimizeSplitSingle(scenario1);
console.log('Results:');
if (result1) {
  console.log(`✅ Earliest retirement: Age ${result1.earliestAge}`);
  console.log(`💰 Optimal split: $${result1.sacAmount.toLocaleString()} salary sacrifice (${Math.round(result1.alpha * 100)}%)`);
  console.log(`🏦 Outside investments: $${result1.outsideAmount.toLocaleString()}`);
  console.log(`📈 Cap utilization: ${Math.round(result1.capUse * 100)}%`);
  console.log(`⚠️  Overflow to outside: $${result1.overflow.toLocaleString()}`);
} else {
  console.log('❌ No viable solution found');
}
console.log('\n' + '='.repeat(60) + '\n');

// Scenario 2: Couple w/ different cap headroom
console.log('📊 SCENARIO 2: Couple with asymmetric cap headroom');
console.log('High earner + moderate earner with different headroom\n');

const scenario2 = {
  currentAge: 40,
  targetSpend: 100000,
  annualSavingsBudget: 80000,
  bequest: 0,
  lifeExpectancy: 87,
  currentSavings: 250000,
  currentSuper1: 180000,
  currentSuper2: 120000,
  annualIncome1: 150000, // High income = $17,250 SG = $10,250 headroom
  annualIncome2: 70000,  // Moderate income = $8,050 SG = $19,450 headroom
  rReal: 0.035,
  preservationAge1: 60,
  preservationAge2: 60,
  sgRate: 0.115,
  concessionalCap: 27500,
  superInsurance1: 1200,
  superInsurance2: 800,
  contributionsTaxRate: 0.15
};

const result2 = optimizeSplitCouple(scenario2);
console.log('Results:');
if (result2) {
  console.log(`✅ Earliest retirement: Age ${result2.earliestAge}`);
  console.log(`👤 Person 1 (high earner): $${result2.sac1.toLocaleString()} SAC (${Math.round(result2.capUse1 * 100)}% cap use)`);
  console.log(`👥 Person 2 (moderate earner): $${result2.sac2.toLocaleString()} SAC (${Math.round(result2.capUse2 * 100)}% cap use)`);
  console.log(`🏦 Joint outside investments: $${result2.outside.toLocaleString()}`);
  console.log(`⚠️  Overflow P1: $${result2.overflow1.toLocaleString()}, P2: $${result2.overflow2.toLocaleString()}`);
  
  // Verify asymmetric optimization
  const headroom1 = 27500 - (150000 * 0.115);
  const headroom2 = 27500 - (70000 * 0.115);
  console.log(`📊 Headroom analysis: P1=$${headroom1.toLocaleString()}, P2=$${headroom2.toLocaleString()}`);
  console.log(`🎯 Optimization should favor Person 2's larger headroom`);
} else {
  console.log('❌ No viable solution found');
}
console.log('\n' + '='.repeat(60) + '\n');

// Scenario 3: Heavy insurance drag
console.log('📊 SCENARIO 3: Heavy insurance drag scenario');
console.log('High insurance premiums reducing super effectiveness\n');

const scenario3 = {
  currentAge: 45,
  targetSpend: 70000,
  annualSavingsBudget: 50000,
  bequest: 0,
  lifeExpectancy: 85,
  currentSavings: 180000,
  currentSuper: 160000,
  annualIncome: 100000,
  rReal: 0.04,
  preservationAge: 60,
  sgRate: 0.115,
  concessionalCap: 27500,
  superInsurance: 5000, // Very high insurance = $5k/year drag
  contributionsTaxRate: 0.15
};

const result3 = optimizeSplitSingle(scenario3);
console.log('Results:');
if (result3) {
  console.log(`✅ Earliest retirement: Age ${result3.earliestAge}`);
  console.log(`💰 Optimal split: $${result3.sacAmount.toLocaleString()} salary sacrifice (${Math.round(result3.alpha * 100)}%)`);
  console.log(`🏦 Outside investments: $${result3.outsideAmount.toLocaleString()}`);
  console.log(`📈 Cap utilization: ${Math.round(result3.capUse * 100)}%`);
  console.log(`🚨 Insurance drag: $5,000/year reduces super attractiveness`);
  
  // Test with lower insurance for comparison
  const lowInsuranceScenario = { ...scenario3, superInsurance: 1000 };
  const lowInsuranceResult = optimizeSplitSingle(lowInsuranceScenario);
  if (lowInsuranceResult) {
    const ageDiff = result3.earliestAge - lowInsuranceResult.earliestAge;
    const splitDiff = result3.alpha - lowInsuranceResult.alpha;
    console.log(`📊 Impact analysis: +$4k insurance delays retirement by ${ageDiff} years`);
    console.log(`📊 Split shift: ${splitDiff > 0 ? '+' : ''}${Math.round(splitDiff * 100)}% toward super vs low insurance`);
  }
} else {
  console.log('❌ No viable solution found');
}

console.log('\n' + '='.repeat(60));
console.log('🎯 Validation complete - all scenarios tested');
console.log('='.repeat(60));