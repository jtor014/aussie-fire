import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis,
  ReferenceLine, ReferenceArea, Legend
} from "recharts";

type ChartRow = {
  age: number;
  accumulation: number | null;
  retirement: number | null;
  bridge: number | null;
  // hold total for fallback/tooltip
  total?: number;
};

export default function WealthChart(
  { path, lifeExp, retireAge }: { path: any[]; lifeExp: number; retireAge?: number }
) {
  if (!Array.isArray(path) || path.length < 2) return null;

  // Helpers to normalise various solver shapes
  const getAge = (p: any) =>
    Number(p?.age ?? p?.endAge ?? p?.t ?? 0);

  const getBalances = (p: any) => {
    if (p?.balances) {
      return {
        outside: Number(p.balances.outside ?? 0),
        super: Number(p.balances.super ?? p.balances.superBal ?? 0),
      };
    }
    return {
      outside: Number(p.outside ?? p.nonSuper ?? 0),
      super: Number(p.super ?? p.superBal ?? 0),
    };
  };

  const getTotal = (p: any) => {
    if (Number.isFinite(Number(p?.total))) return Number(p.total);
    const b = getBalances(p);
    return (b.outside || 0) + (b.super || 0);
  };

  const getLifePhase = (p: any): 'accum' | 'bridge' | 'retire' | null => {
    const lc = p?.lifecyclePhase;
    const ph = p?.phase;
    if (lc === 'accum' || lc === 'bridge' || lc === 'retire') return lc;
    if (ph === 'accum' || ph === 'bridge' || ph === 'retire') return ph;
    if (Number.isFinite(retireAge)) {
      const a = getAge(p);
      // Heuristic: before retireAge = accum, after = retire (we won't guess bridge)
      return a < (retireAge as number) ? 'accum' : 'retire';
    }
    return null;
  };

  // Bridge window for shading (prefer explicit markers; otherwise use retireAge as start)
  const bridge = path.filter((p) => p?.lifecyclePhase === 'bridge' || p?.phase === 'bridge');
  const bridgeStart = bridge[0]?.age;
  const bridgeEnd = bridge.length ? bridge[bridge.length - 1]?.age : undefined;

  // Canonical transform -> stable keys; compute total when missing
  const rows: ChartRow[] = path.map((p) => {
    const age = getAge(p);
    const total = getTotal(p);
    const life = getLifePhase(p);
    return {
      age,
      accumulation: life === 'accum' ? total : null,
      retirement: life === 'retire' ? total : null,
      bridge: life === 'bridge' ? total : null,
      total,
    };
  });

  // If we failed to classify phases at all, fall back to a single "Total" line
  const noPhases = rows.every(r => r.accumulation == null && r.retirement == null && r.bridge == null);
  const data: ChartRow[] = noPhases
    ? rows.map(({ age, total }) => ({ age, accumulation: total ?? 0, retirement: null, bridge: null }))
    : rows;

  // Compute Y bounds with some headroom
  const vals = rows.map(r => r.total ?? 0);
  const minY = Math.min(0, ...vals);
  const maxY = Math.max(...vals);
  const pad = Math.max(1, (maxY - minY) * 0.05);

  return (
    <div className="w-full" style={{ minHeight: 360 }}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" />
          <YAxis domain={[minY - pad, maxY + pad]} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
          <Legend />
          <Tooltip formatter={(v: any) => (typeof v === 'number' ? `$${v.toLocaleString()}` : v)} />

          {/* Series */}
          <Line name="Accumulation" type="monotone" dataKey="accumulation" dot={false} isAnimationActive={false} stroke="#8884d8" strokeWidth={2} />
          <Line name="Retirement" type="monotone" dataKey="retirement" dot={false} isAnimationActive={false} stroke="#82ca9d" strokeWidth={2} />
          <Line name="Bridge Period" type="monotone" dataKey="bridge" dot={false} isAnimationActive={false} stroke="#ff7c7c" strokeWidth={2} />

          {/* Retire marker */}
          {Number.isFinite(retireAge) && (
            <ReferenceLine 
              x={retireAge as number} 
              strokeDasharray="4 4" 
              stroke="#999"
              label={{ value: 'Retire', position: 'insideTop', offset: 6, fill: '#555' }}
            />
          )}

          {/* Bridge shading */}
          {(Number.isFinite(bridgeStart as any) && Number.isFinite(bridgeEnd as any)) ? (
            <ReferenceArea 
              x1={bridgeStart as number} 
              x2={(bridgeEnd as number) + 0.99} 
              fillOpacity={0.12} 
              fill="#ff7c7c"
              label={{ value: "Bridge Period", position: "insideTopLeft" }}
            />
          ) : (Number.isFinite(retireAge as any) && (
            <ReferenceArea 
              x1={retireAge as number} 
              x2={(retireAge as number) + 0.99} 
              fillOpacity={0.08} 
              fill="#ccc"
            />
          ))}

          <ReferenceLine x={lifeExp} strokeDasharray="4 4" stroke="#ccc" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}