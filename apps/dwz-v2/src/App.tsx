import { useMemo, useState } from "react";
import { type Household, type Assumptions } from "dwz-core";
import { useDecision } from "./lib/useDecision";
import { useSavingsSplitOptimizer } from "./lib/useSavingsSplitOptimizer";
import { usePlanFirstSolver } from "./lib/usePlanFirstSolver";
import WealthChart from "./components/WealthChart";
import SensitivityChart from "./components/SensitivityChart";
import PlanSpendInput from "./components/PlanSpendInput";

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
  const [spendingCap, setSpendingCap] = useState<number | null>(null); // optional manual cap
  const [lifeExp, setLifeExp] = useState(90);
  
  // Savings split optimization
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [manualSplitPct, setManualSplitPct] = useState(0.5);
  const [capPerPerson, setCapPerPerson] = useState(30000);
  const [eligiblePeople, setEligiblePeople] = useState(2);
  
  // Plan-first solver
  const [planSpend, setPlanSpend] = useState<number | null>(null);

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
    maxPct: 1.0
  }), [capPerPerson, eligiblePeople]);

  // Create a basic household for the optimizer (without savings split)
  const baseHousehold = useMemo<Household>(() => ({
    p1: { age: p1Age, income: income1, outside: out1, superBal: sup1, preserveAge: 60, superPrem: 0 },
    p2: { age: p2Age, income: income2, outside: out2, superBal: sup2, preserveAge: 60, superPrem: 0 },
    targetSpend: 65000, // placeholder - solver will determine actual sustainable spending
    annualSavings,
    lifeExp
  }), [p1Age, p2Age, income1, income2, out1, out2, sup1, sup2, annualSavings, lifeExp]);
  
  const { data: optimizerData, loading: optimizerLoading } = useSavingsSplitOptimizer(
    baseHousehold, 
    assumptions, 
    optimizerPolicy, 
    autoOptimize && annualSavings > 0
  );
  
  const { data: planFirstData, loading: planFirstLoading } = usePlanFirstSolver(
    baseHousehold,
    assumptions,
    planSpend,
    true
  );

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
      contribTaxRate: 0.15
    } : undefined;
    
    return {
      ...baseHousehold,
      preFireSavingsSplit
    };
  }, [baseHousehold, autoOptimize, optimizerData, manualSplitPct, capPerPerson, eligiblePeople, annualSavings]);

  // Pass the earliest age from plan-first solver to ensure consistency
  const { data, loading } = useDecision(
    household, 
    assumptions, 
    planFirstData?.earliestAge ?? undefined
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Australian FIRE Calculator — DWZ v2 (Couples-first)</h1>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3>You</h3>
          <label>Age <input type="number" value={p1Age} onChange={e=>setP1Age(+e.target.value)} /></label><br/>
          <label>Income <input type="number" value={income1} onChange={e=>setIncome1(+e.target.value)} /></label><br/>
          <label>Outside <input type="number" value={out1} onChange={e=>setOut1(+e.target.value)} /></label><br/>
          <label>Super <input type="number" value={sup1} onChange={e=>setSup1(+e.target.value)} /></label>
        </div>
        <div>
          <h3>Partner</h3>
          <label>Age <input type="number" value={p2Age} onChange={e=>setP2Age(+e.target.value)} /></label><br/>
          <label>Income <input type="number" value={income2} onChange={e=>setIncome2(+e.target.value)} /></label><br/>
          <label>Outside <input type="number" value={out2} onChange={e=>setOut2(+e.target.value)} /></label><br/>
          <label>Super <input type="number" value={sup2} onChange={e=>setSup2(+e.target.value)} /></label>
        </div>
      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label>Savings / yr (combined) <input type="number" value={annualSavings} onChange={e=>setAnnualSavings(+e.target.value)} /></label>
        <label>Life expectancy <input type="number" value={lifeExp} onChange={e=>setLifeExp(+e.target.value)} /></label>
      </section>

      <PlanSpendInput 
        planSpend={planSpend}
        onPlanSpendChange={setPlanSpend}
        result={planFirstData}
        loading={planFirstLoading}
      />

      <details style={{ marginTop: 16 }}>
        <summary>Advanced: Spending Cap (Optional)</summary>
        <div style={{ marginTop: 8 }}>
          <label>
            Max spending / yr (leave empty for DWZ optimal): 
            <input 
              type="number" 
              value={spendingCap || ""} 
              onChange={e => setSpendingCap(e.target.value ? +e.target.value : null)} 
              placeholder="Unlimited"
            />
          </label>
        </div>
      </details>

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
              {' '}Auto-optimize for earliest retirement
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
          </div>
        </div>
        
        {optimizerLoading && <p style={{ marginTop: 8, color: "#666" }}>Optimizing savings split...</p>}
        {optimizerData && autoOptimize && (
          <div style={{ marginTop: 12, padding: 8, background: "#f0f8ff", borderRadius: 4 }}>
            <strong>Optimizer Result:</strong> {Math.round(optimizerData.recommendedPct * 100)}% to super 
            → retire at age {optimizerData.earliestAge} (vs manual split)
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

      {/* Plan-first mandatory: Show empty state when no plan */}
      {!planSpend && (
        <div style={{ padding: 16, borderRadius: 8, background: "#fef3c7", border: "1px solid #fbbf24", marginBottom: 12 }}>
          <strong style={{ fontSize: 18 }}>Enter your annual plan spend to begin</strong>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#78716c" }}>
            This calculator finds the earliest age you can retire and sustain that spending 
            while still depleting to ~$0 at life expectancy (true DWZ methodology).
          </p>
        </div>
      )}

      {/* Show not achievable message when plan is set but not viable */}
      {planSpend && planFirstData && planFirstData.earliestAge === null && (
        <div style={{ padding: 16, borderRadius: 8, background: "#fee2e2", border: "1px solid #f87171", marginBottom: 12 }}>
          <strong style={{ fontSize: 18 }}>
            Your plan ${planSpend.toLocaleString()}/yr is not achievable under current assumptions
          </strong>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#78716c" }}>
            Try reducing expenses, increasing savings, or adjusting other parameters.
          </p>
        </div>
      )}

      {/* Loading state */}
      {(loading || (planSpend && planFirstLoading)) && <p>Calculating…</p>}

      {/* Show results only when plan is achievable */}
      {planSpend && planFirstData && planFirstData.earliestAge !== null && data && (
        <>
          <div style={{ padding: 12, borderRadius: 8, background: "#e8f8ef", marginBottom: 12 }}>
            <div>
              <strong>
                At your plan $${planSpend.toLocaleString()}/yr, earliest viable age is {planFirstData.earliestAge}.
              </strong>
              <div style={{ marginTop: 4 }}>
                DWZ sustainable spending at age {planFirstData.earliestAge}: <strong>${Math.round(planFirstData.atAgeSpend || data.sustainableAnnual).toLocaleString()}/yr</strong>
              </div>
            </div>
            
            <div style={{ marginTop: 8 }}>
              Bridge: {data.bridge.status === "covered" ? "✅ Covered" : "⚠️ Short"} — need ${Math.round(data.bridge.need).toLocaleString()} PV, have ${Math.round(data.bridge.have).toLocaleString()} for {data.bridge.years} years
            </div>
            
            {household.preFireSavingsSplit && (
              <div>
                Savings split: <strong>{Math.round(household.preFireSavingsSplit.toSuperPct * 100)}%</strong> to super 
                ({autoOptimize ? "auto-optimized" : "manual"})
              </div>
            )}
            
            {spendingCap && spendingCap < data.sustainableAnnual && (
              <div style={{ color: "#d4a853", marginTop: 4 }}>
                🟡 Under-spending: Capped at ${spendingCap.toLocaleString()}/yr (tail will have surplus)
              </div>
            )}
          </div>

          <WealthChart path={data.path} lifeExp={household.lifeExp} />
        </>
      )}
    </div>
  );
}
