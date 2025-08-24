import { useMemo, useState } from "react";
import { type Household, type Assumptions } from "dwz-core";
import { useDecision } from "./lib/useDecision";
import WealthChart from "./components/WealthChart";

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

  const household = useMemo<Household>(() => ({
    p1: { age: p1Age, income: income1, outside: out1, superBal: sup1, preserveAge: 60, superPrem: 0 },
    p2: { age: p2Age, income: income2, outside: out2, superBal: sup2, preserveAge: 60, superPrem: 0 },
    targetSpend: 65000, // placeholder - solver will determine actual sustainable spending
    annualSavings,
    lifeExp
  }), [p1Age, p2Age, income1, income2, out1, out2, sup1, sup2, annualSavings, lifeExp]);

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

  const { data, loading } = useDecision(household, assumptions);

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

      <hr style={{ margin: "24px 0" }} />

      {loading && <p>Calculating…</p>}
      {data && (
        <>
          <div style={{ padding: 12, borderRadius: 8, background: "#e8f8ef", marginBottom: 12 }}>
            <strong>You can retire at age {data.earliest.viable}</strong> with DWZ.
            <div>Sustainable spending (DWZ): <strong>${Math.round(data.sustainableAnnual).toLocaleString()}/yr</strong></div>
            <div>Bridge: {data.bridge.status === "covered" ? "✅ Covered" : "⚠️ Short"} — need ${Math.round(data.bridge.need).toLocaleString()} PV, have ${Math.round(data.bridge.have).toLocaleString()} for {data.bridge.years} years</div>
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
