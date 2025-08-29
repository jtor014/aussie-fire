import { useMemo, useState, useEffect } from "react";
import { type Household, type Assumptions } from "dwz-core";
import { useDecision } from "./lib/useDecision";
import { useSavingsSplitOptimizer } from "./lib/useSavingsSplitOptimizer";
import { useSavingsSplitForPlan } from "./lib/useSavingsSplitForPlan";
import { usePlanFirstSolver } from "./lib/usePlanFirstSolver";
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
  
  // Savings split optimization
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [manualSplitPct, setManualSplitPct] = useState(0.5);
  const [capPerPerson, setCapPerPerson] = useState(30000);
  const [eligiblePeople, setEligiblePeople] = useState(2);
  const [outsideTaxRate, setOutsideTaxRate] = useState(0.32); // default 32% including Medicare
  const [preferSuperTieBreak, setPreferSuperTieBreak] = useState(true);
  const [ageToleranceYears, setAgeToleranceYears] = useState(0);
  
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
    window: 0.15,
    preferSuperTieBreak: preferSuperTieBreak,
    ageToleranceYears: Math.max(0, Math.min(5, ageToleranceYears))
  }), [preferSuperTieBreak, ageToleranceYears]);

  // Create a basic household for the optimizer (without savings split)
  const baseHousehold = useMemo<Household>(() => ({
    p1: { age: p1Age, income: income1, outside: out1, superBal: sup1, preserveAge: 60, superPrem: 0 },
    p2: { age: p2Age, income: income2, outside: out2, superBal: sup2, preserveAge: 60, superPrem: 0 },
    targetSpend: 65000, // placeholder - solver will determine actual sustainable spending
    annualSavings,
    lifeExp
  }), [p1Age, p2Age, income1, income2, out1, out2, sup1, sup2, annualSavings, lifeExp]);
  
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
    shouldSolve ? planFirstData.earliestAge : undefined,
    shouldSolve  // Pass enabled flag to prevent solver call when not achievable
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Australian FIRE Calculator — DWZ v2 (Couples-first)</h1>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        <PersonCard
          title="You"
          age={p1Age}
          income={income1}
          outside={out1}
          super={sup1}
          onAgeChange={setP1Age}
          onIncomeChange={setIncome1}
          onOutsideChange={setOut1}
          onSuperChange={setSup1}
        />
        <PersonCard
          title="Partner"
          age={p2Age}
          income={income2}
          outside={out2}
          super={sup2}
          onAgeChange={setP2Age}
          onIncomeChange={setIncome2}
          onOutsideChange={setOut2}
          onSuperChange={setSup2}
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
            <label style={{ display: 'block', marginTop: 8 }}>
              Marginal tax rate on outside savings (% incl. Medicare):
              <input 
                type="number" 
                min="0" 
                max="65" 
                step="0.5"
                value={(outsideTaxRate * 100).toFixed(1)} 
                onChange={e => setOutsideTaxRate(Math.max(0, Math.min(0.65, (+e.target.value || 0) / 100)))}
                style={{
                  width: '80px',
                  padding: '4px 6px',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: 14,
                  marginLeft: 8
                }}
              />%
            </label>
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
            <label>Concessional cap per person: 
              <input 
                type="number" 
                value={capPerPerson} 
                onChange={e => setCapPerPerson(+e.target.value)}
              />
            </label><br/>
            <label>Eligible people: 
              <select value={eligiblePeople} onChange={e => setEligiblePeople(+e.target.value)}>
                <option value={1}>1 (single)</option>
                <option value={2}>2 (couple)</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input 
                type="checkbox" 
                checked={preferSuperTieBreak} 
                onChange={e => setPreferSuperTieBreak(e.target.checked)}
              />
              Prefer super when start age is the same
            </label>
            <label style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              Tolerance (years):
              <input 
                type="number" 
                min="0" 
                max="5" 
                step="0.5"
                value={ageToleranceYears} 
                onChange={e => setAgeToleranceYears(Math.max(0, Math.min(5, +e.target.value || 0)))}
                style={{
                  width: '60px',
                  padding: '4px 6px',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: 13,
                  marginLeft: 8
                }}
                title="How many years of delay are acceptable while still preferring super"
              />
            </label>
          </div>
        </div>
        
        {optimizerLoading && <p style={{ marginTop: 8, color: "#666" }}>Optimizing savings split...</p>}
        {optimizerData && autoOptimize && (
          <div style={{ marginTop: 12, padding: 8, background: "#f0f8ff", borderRadius: 4 }}>
            <strong>Optimizer Result:</strong> {Math.round(optimizerData.recommendedPct * 100)}% to super 
            → {planSpend 
                ? `earliest age ${Number.isFinite(optimizerData.earliestAge) ? optimizerData.earliestAge : '—'} for ${auMoney0(planSpend)}/yr plan`
                : `retire at age ${optimizerData.earliestAge}`}
            {optimizerData.explanation && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 6, fontStyle: "italic" }}>
                {optimizerData.explanation}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Cap binding: {optimizerData.constraints.capBindingAtOpt ? "Yes" : "No"} | 
              Evaluations: {optimizerData.evals}
            </div>
            
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
