import { useMemo, useState, useEffect } from "react";
import { type Household, type Assumptions } from "dwz-core";
import { useDecision } from "./lib/useDecision";
import { useSavingsSplitOptimizer } from "./lib/useSavingsSplitOptimizer";
import { useSavingsSplitForPlan } from "./lib/useSavingsSplitForPlan";
import { usePlanFirstSolver } from "./lib/usePlanFirstSolver";
import { useConcessionalCap, useATORates, useAutoMarginalTaxRate } from "./lib/useATORates";
import { calculateMarginalTaxRate } from "./lib/auRates";
import { splitSalarySacrifice } from "./lib/suggestSalarySacrifice";
import { auMoney0 } from "./lib/format";
import WealthChart from "./components/WealthChart";
import SensitivityChart from "./components/SensitivityChart";
import PlanSpendInput from "./components/PlanSpendInput";
import PersonCard from "./components/PersonCard";
import { COUPLES_PLAN_DEFAULT, SINGLE_PLAN_DEFAULT } from "./constants/defaults";

export default function App() {
  // Couples-first defaults
  const [p1Age, setP1Age] = useState(30);
  const [p2Age, setP2Age] = useState(30);
  const [income1, setIncome1] = useState(120000);
  const [income2, setIncome2] = useState(120000);
  const [out1, setOut1] = useState(50000);
  const [out2, setOut2] = useState(50000);
  const [sup1, setSup1] = useState(100000);
  const [sup2, setSup2] = useState(100000);
  const [annualSavings, setAnnualSavings] = useState(50000);
  const [lifeExp, setLifeExp] = useState(90);
  
  // SG rate for super guarantee calculations (salary now derived from income)
  const [sgRate1, setSgRate1] = useState(0); // 0 means use ATO default
  const [sgRate2, setSgRate2] = useState(0); // 0 means use ATO default
  
  // Savings split optimization
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [manualSplitPct, setManualSplitPct] = useState(0.5);
  const capPerPerson = useConcessionalCap(); // ATO-derived, no user override
  const atoRates = useATORates(); // For displaying current FY info
  
  // Auto-MTR with advanced override
  const [useAdvancedTaxRate, setUseAdvancedTaxRate] = useState(false);
  const [manualTaxRate, setManualTaxRate] = useState(0.32);
  const autoTaxRate = useAutoMarginalTaxRate(income1, income2);
  const outsideTaxRate = useAdvancedTaxRate ? manualTaxRate : autoTaxRate;
  
  // Auto-derive eligible people from cap headroom
  const calculateEligiblePeople = () => {
    const effectiveSGRate1 = sgRate1 || atoRates.superGuaranteeRate;
    const effectiveSGRate2 = sgRate2 || atoRates.superGuaranteeRate;
    const p1RemainingCap = Math.max(0, capPerPerson - Math.round(income1 * effectiveSGRate1));
    const p2RemainingCap = Math.max(0, capPerPerson - Math.round(income2 * effectiveSGRate2));
    
    let eligible = 0;
    if (p1RemainingCap > 0) eligible++;
    if (income2 > 0 && p2RemainingCap > 0) eligible++;
    return Math.max(1, eligible); // At least 1 for single person households
  };
  const eligiblePeople = calculateEligiblePeople();
  
  // Plan-first solver with default
  const [planSpend, setPlanSpend] = useState<number | null>(null);
  
  // Compute default plan based on household size
  const computeDefaultPlan = (peopleCount: number): number => {
    return peopleCount >= 2 ? COUPLES_PLAN_DEFAULT : SINGLE_PLAN_DEFAULT;
  };
  
  // Set default plan on first load if not already set
  useEffect(() => {
    if (planSpend === null) {
      const peopleCount = 2; // For now, assume couples (can be made dynamic later)
      setPlanSpend(computeDefaultPlan(peopleCount));
    }
  }, []); // Only run once on mount

  const assumptions = useMemo<Assumptions>(() => ({
    realReturn: 0.059,
    fees: 0.005,
    bequest: 0,
    bands: [
      { from: 0, to: 60, m: 1.10 },
      { from: 60, to: 75, m: 1.00 },
      { from: 75, to: 200, m: 0.85 }
    ]
  }), []);

  const optimizerPolicy = useMemo(() => ({
    capPerPerson,
    eligiblePeople,
    contribTaxRate: 0.15,
    outsideTaxRate: Math.max(0, Math.min(0.65, outsideTaxRate)), // clamp 0..65%
    maxPct: 1.0
  }), [capPerPerson, eligiblePeople, outsideTaxRate]);

  const optimizerOpts = useMemo(() => ({
    gridPoints: 21,
    refineIters: 2, 
    window: 0.15
  }), []);

  // Create a basic household for the optimizer (without savings split)
  const baseHousehold = useMemo<Household>(() => ({
    p1: { 
      age: p1Age, 
      income: income1, 
      outside: out1, 
      superBal: sup1, 
      preserveAge: 60, 
      superPrem: 0,
      // Salary now mirrors the Income field
      salary: Math.max(0, Number(income1 ?? 0)),
      sgRate: sgRate1 || atoRates.superGuaranteeRate
    },
    p2: { 
      age: p2Age, 
      income: income2, 
      outside: out2, 
      superBal: sup2, 
      preserveAge: 60, 
      superPrem: 0,
      // Salary now mirrors the Income field
      salary: Math.max(0, Number(income2 ?? 0)),
      sgRate: sgRate2 || atoRates.superGuaranteeRate
    },
    targetSpend: 65000, // placeholder - solver will determine actual sustainable spending
    annualSavings,
    lifeExp
  }), [p1Age, p2Age, income1, income2, out1, out2, sup1, sup2, sgRate1, sgRate2, annualSavings, lifeExp, atoRates.superGuaranteeRate]);
  
  // Use plan-first optimizer when plan is set, otherwise fall back to generic optimizer
  const { data: genericOptimizerData, loading: genericOptimizerLoading } = useSavingsSplitOptimizer(
    baseHousehold, 
    assumptions, 
    optimizerPolicy, 
    autoOptimize && annualSavings > 0 && !planSpend
  );
  
  const { data: planOptimizerData, loading: planOptimizerLoading } = useSavingsSplitForPlan(
    baseHousehold,
    assumptions,
    optimizerPolicy,
    planSpend,
    optimizerOpts,
    autoOptimize && annualSavings > 0 && !!planSpend
  );
  
  // Select which optimizer result to use
  const optimizerData = planSpend ? planOptimizerData : genericOptimizerData;
  const optimizerLoading = planSpend ? planOptimizerLoading : genericOptimizerLoading;
  
  const household = useMemo<Household>(() => {
    // Determine effective split percentage
    const effectiveSplitPct = autoOptimize && optimizerData ? 
      optimizerData.recommendedPct : 
      manualSplitPct;
    
    // Include savings split in household if we have annual savings
    const preFireSavingsSplit = annualSavings > 0 ? {
      toSuperPct: effectiveSplitPct,
      capPerPerson,
      eligiblePeople,
      contribTaxRate: 0.15,
      outsideTaxRate: Math.max(0, Math.min(0.65, outsideTaxRate)),
      // Always use grossDeferral mode when autoOptimize is on, regardless of whether optimizerData exists yet
      mode: autoOptimize ? 'grossDeferral' as const : 'netFixed' as const
    } : undefined;
    
    return {
      ...baseHousehold,
      preFireSavingsSplit
    };
  }, [baseHousehold, autoOptimize, optimizerData, manualSplitPct, capPerPerson, eligiblePeople, annualSavings, outsideTaxRate]);

  // Use the SAME household for plan-first solver to ensure consistency
  const { data: planFirstData, loading: planFirstLoading } = usePlanFirstSolver(
    household,  // Use same household as decision solver!
    assumptions,
    planSpend,
    true
  );

  // Pass the earliest age from plan-first solver to ensure consistency
  // Only call solver if we have an achievable plan (earliest age is not null)
  const shouldSolve = planSpend && planFirstData && planFirstData.earliestAge !== null;
  const { data, loading } = useDecision(
    household, 
    assumptions, 
    shouldSolve && planFirstData.earliestAge !== null ? planFirstData.earliestAge : undefined,
    shouldSolve  // Pass enabled flag to prevent solver call when not achievable
  );

  // Calculate remaining caps and per-person MTRs for optimizer suggestion splitting
  const { remainingCaps, personalMTRs } = useMemo(() => {
    const effectiveSGRate1 = sgRate1 || atoRates.superGuaranteeRate;
    const effectiveSGRate2 = sgRate2 || atoRates.superGuaranteeRate;
    // Salary now derived from income (same as engine uses)
    const effectiveSalary1 = Math.max(0, Number(income1 ?? 0));
    const effectiveSalary2 = Math.max(0, Number(income2 ?? 0));
    const sgGross1 = Math.max(0, Math.round(effectiveSalary1 * effectiveSGRate1));
    const sgGross2 = Math.max(0, Math.round(effectiveSalary2 * effectiveSGRate2));
    
    const caps = [
      Math.max(0, capPerPerson - sgGross1),
      Math.max(0, capPerPerson - sgGross2)
    ];
    
    // Calculate per-person MTRs (use advanced override if set, otherwise auto)
    const mtrs = useAdvancedTaxRate 
      ? [manualTaxRate, manualTaxRate] // Use manual rate for both if override is set
      : [
          calculateMarginalTaxRate(income1, atoRates.taxBrackets),
          calculateMarginalTaxRate(income2, atoRates.taxBrackets)
        ];
    
    return { remainingCaps: caps, personalMTRs: mtrs };
  }, [income1, income2, sgRate1, sgRate2, capPerPerson, atoRates.superGuaranteeRate, atoRates.taxBrackets, useAdvancedTaxRate, manualTaxRate]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Australian FIRE Calculator — DWZ v2 (Couples-first)</h1>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        <PersonCard
          title="You"
          index={0}
          age={p1Age}
          income={income1}
          outside={out1}
          super={sup1}
          salary={income1}
          sgRate={sgRate1}
          onAgeChange={setP1Age}
          onIncomeChange={setIncome1}
          onOutsideChange={setOut1}
          onSuperChange={setSup1}
          onSGRateChange={setSgRate1}
          atoSGRate={atoRates.superGuaranteeRate}
          capPerPerson={capPerPerson}
          autoOptimize={autoOptimize}
          optimizerData={optimizerData}
          annualSavings={annualSavings}
          allRemainingCaps={remainingCaps}
          personalMTRs={personalMTRs}
        />
        <PersonCard
          title="Partner"
          index={1}
          age={p2Age}
          income={income2}
          outside={out2}
          super={sup2}
          salary={income2}
          sgRate={sgRate2}
          onAgeChange={setP2Age}
          onIncomeChange={setIncome2}
          onOutsideChange={setOut2}
          onSuperChange={setSup2}
          onSGRateChange={setSgRate2}
          atoSGRate={atoRates.superGuaranteeRate}
          capPerPerson={capPerPerson}
          autoOptimize={autoOptimize}
          optimizerData={optimizerData}
          annualSavings={annualSavings}
          allRemainingCaps={remainingCaps}
          personalMTRs={personalMTRs}
        />
      </section>

      <section style={{ 
        marginTop: 20, 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: 20,
        padding: '16px 0'
      }}>
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 500,
          color: '#374151'
        }}>
          Savings / yr (combined)
          <input 
            type="number" 
            value={annualSavings} 
            onChange={e=>setAnnualSavings(+e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              marginTop: 4,
              fontFamily: 'inherit'
            }}
          />
        </label>
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 500,
          color: '#374151'
        }}>
          Life expectancy
          <input 
            type="number" 
            value={lifeExp} 
            onChange={e=>setLifeExp(+e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              marginTop: 4,
              fontFamily: 'inherit'
            }}
          />
        </label>
      </section>

      <PlanSpendInput 
        planSpend={planSpend}
        onPlanSpendChange={setPlanSpend}
        result={planFirstData}
        loading={planFirstLoading}
      />


      <details style={{ marginTop: 16 }}>
        <summary>Pre-FIRE Savings Split (Super vs Outside)</summary>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label>
              <input 
                type="checkbox" 
                checked={autoOptimize} 
                onChange={e => setAutoOptimize(e.target.checked)}
              />
              {' '}Auto-optimize {planSpend ? `for earliest age at ${auMoney0(planSpend)}/yr` : 'for earliest retirement'}
            </label>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4, marginBottom: 8 }}>
              This optimizer treats your savings as <strong>pre-tax salary you can direct</strong>. Outside is taxed at your marginal rate; super is taxed at 15% (concessional).
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                Using ATO marginal rate: <strong>{(outsideTaxRate * 100).toFixed(1)}%</strong>
                {' '}(based on ${Math.max(income1, income2 || 0).toLocaleString()} income + Medicare levy)
              </div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: "#666" }}>
                <input 
                  type="checkbox" 
                  checked={useAdvancedTaxRate}
                  onChange={e => setUseAdvancedTaxRate(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Advanced → Override:
                {useAdvancedTaxRate && (
                  <input 
                    type="number" 
                    min="0" 
                    max="65" 
                    step="0.5"
                    value={(manualTaxRate * 100).toFixed(1)} 
                    onChange={e => setManualTaxRate(Math.max(0, Math.min(0.65, (+e.target.value || 0) / 100)))}
                    style={{
                      width: '70px',
                      padding: '2px 4px',
                      border: '1px solid #d1d5db',
                      borderRadius: 3,
                      fontSize: 12,
                      marginLeft: 6
                    }}
                  />
                )}
                {useAdvancedTaxRate && '%'}
              </label>
            </div>
            {!autoOptimize && (
              <div style={{ marginTop: 8 }}>
                <label>Manual split to super: 
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={Math.round(manualSplitPct * 100)} 
                    onChange={e => setManualSplitPct(+e.target.value / 100)}
                  />%
                </label>
              </div>
            )}
          </div>
          <div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '4px 8px', 
                borderRadius: 16, 
                backgroundColor: '#f3f4f6', 
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <span>ATO</span>
                <span>FY {atoRates.financialYear}</span>
                <span>Cap {auMoney0(atoRates.concessionalCap)}</span>
                <span>SG {(atoRates.superGuaranteeRate * 100).toFixed(1)}%</span>
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              Eligible people: <strong>{eligiblePeople}</strong>
              {' '}(auto-derived from cap headroom)
            </div>
            <div style={{ marginTop: 12, padding: 8, background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#495057' }}>
                Optimizer Policy:
              </div>
              <div style={{ fontSize: 12, color: '#6c757d', lineHeight: 1.4 }}>
                <strong>Maximize salary-sacrifice to concessional caps</strong> unless that would push your earliest viable age later. 
                If bridge needs outside funds, we allocate just enough outside and put the rest to super.
              </div>
            </div>
          </div>
        </div>
        
        {optimizerLoading && <p style={{ marginTop: 8, color: "#666" }}>Optimizing savings split...</p>}
        {optimizerData && autoOptimize && (
          <div style={{ marginTop: 12, padding: 8, background: "#f0f8ff", borderRadius: 4 }}>
            <strong>Optimizer Result:</strong> {Math.round(optimizerData.recommendedPct * 100)}% to super 
            → {planSpend 
                ? `earliest age ${Number.isFinite(optimizerData.earliestAge) ? optimizerData.earliestAge : '—'} for ${auMoney0(planSpend)}/yr plan`
                : `retire at age ${optimizerData.earliestAge}`}
            {optimizerData && 'explanation' in optimizerData && optimizerData.explanation && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 6, fontStyle: "italic" }}>
                {optimizerData.explanation}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Cap binding: {optimizerData.constraints.capBindingAtOpt ? "Yes" : "No"} | 
              Evaluations: {optimizerData.evals}
            </div>
            
            {(() => {
              // Calculate per-person salary sacrifice split
              const householdRecommendedGross = Math.max(0, Math.round(annualSavings * optimizerData.recommendedPct));
              const splitAmounts = splitSalarySacrifice(householdRecommendedGross, remainingCaps, personalMTRs);
              const totalSplit = splitAmounts.reduce((sum, amt) => sum + amt, 0);
              
              if (totalSplit > 0) {
                return (
                  <div style={{ fontSize: 12, color: "#333", marginTop: 6, padding: 4, background: "#fff3cd", borderRadius: 3, border: "1px solid #ffeaa7" }}>
                    <strong>Salary-sacrifice this year: {auMoney0(totalSplit)} total</strong>
                    {' — '}You {auMoney0(splitAmounts[0] || 0)} • Partner {auMoney0(splitAmounts[1] || 0)}
                    <span style={{ color: "#856404", fontSize: 11 }}> (by MTR & cap)</span>
                  </div>
                );
              }
              return null;
            })()}
            
            {data && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#555", padding: 6, background: "#f8f9fa", borderRadius: 3 }}>
                <div><strong>Bridge Analysis:</strong></div>
                <div>Bridge PV needed: <strong>${Math.round(data.bridge.need).toLocaleString()}</strong></div>
                <div>Outside PV provided: <strong>${Math.round(data.bridge.have).toLocaleString()}</strong></div>
                {data.bridge.status === "short" && (
                  <div style={{ color: "#e67e22" }}>
                    Bridge binding: allocated ${Math.round(data.bridge.need - data.bridge.have).toLocaleString()}/yr outside; remainder to super.
                  </div>
                )}
                {data.bridge.status === "covered" && (
                  <div style={{ color: "#27ae60" }}>
                    Bridge covered: {data.bridge.have >= data.bridge.need ? "sufficient outside funds" : "super accessible"}
                  </div>
                )}
              </div>
            )}
            
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14 }}>Sensitivity Analysis</summary>
              <div style={{ marginTop: 8 }}>
                <SensitivityChart 
                  sensitivity={optimizerData.sensitivity} 
                  recommendedPct={optimizerData.recommendedPct}
                />
                <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  Red dot shows optimal split. Chart shows how retirement age varies with super allocation percentage.
                </p>
              </div>
            </details>
          </div>
        )}
      </details>

      <hr style={{ margin: "24px 0" }} />

      {/* Show not achievable message when plan is set but not viable */}
      {planSpend && planFirstData && planFirstData.earliestAge === null && (
        <div style={{ padding: 16, borderRadius: 8, background: "#fee2e2", border: "1px solid #f87171", marginBottom: 12 }}>
          <strong style={{ fontSize: 18 }}>
            Plan not achievable under current assumptions
          </strong>
          <ul style={{ marginTop: 8, marginLeft: 20, marginBottom: 0, color: "#78716c", fontSize: 14 }}>
            <li>Target spend may be too high for your balances & horizon.</li>
            <li>Bridge to preservation might be underfunded (try lower age or more outside savings).</li>
            <li>Increase savings or reduce annual spend to test viability.</li>
          </ul>
        </div>
      )}

      {/* Loading state */}
      {(loading || planFirstLoading) && <p>Calculating…</p>}

      {/* Show results when plan is achievable */}
      {planSpend && planFirstData && planFirstData.earliestAge !== null && data && (
        <>
          <div style={{ padding: 12, borderRadius: 8, background: "#e8f8ef", marginBottom: 12 }}>
            <div>
              <strong>
                At your plan {auMoney0(planSpend)}/yr, earliest viable age is {planFirstData.earliestAge}.
              </strong>
              <div style={{ marginTop: 4 }}>
                DWZ sustainable spending at age {planFirstData.earliestAge}: <strong>{auMoney0(Math.round(planFirstData.atAgeSpend || data.sustainableAnnual))}/yr</strong>
              </div>
            </div>
            
            <div style={{ marginTop: 8 }}>
              Bridge: {data.bridge.status === "covered" ? "✅ Covered" : "⚠️ Short"} — need {auMoney0(Math.round(data.bridge.need))} PV, have {auMoney0(Math.round(data.bridge.have))} for {data.bridge.years} years
            </div>
            
            {household.preFireSavingsSplit && (
              <div>
                Savings split: <strong>{Math.round(household.preFireSavingsSplit.toSuperPct * 100)}%</strong> to super 
                ({autoOptimize ? "auto-optimized" : "manual"})
              </div>
            )}
            
          </div>
        </>
      )}

      {/* Show chart only when plan exists, is achievable, AND we have solve data */}
      {planSpend && planFirstData && planFirstData.earliestAge !== null && data && data.path && data.path.length > 1 && (
        <WealthChart 
          path={data.path} 
          lifeExp={household.lifeExp}
          retireAge={planFirstData.earliestAge}
        />
      )}
    </div>
  );
}
