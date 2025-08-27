import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis,
  ReferenceLine, ReferenceArea, Legend
} from "recharts";
import type { PathPoint } from "dwz-core";

type ChartRow = {
  age: number;
  accumulation: number | null;
  retirement: number | null;
  bridge: number | null;
};

export default function WealthChart(
  { path, lifeExp, retireAge }: { path: PathPoint[]; lifeExp: number; retireAge?: number }
) {
  if (!Array.isArray(path) || path.length < 2) {
    console.log('[WealthChart] No valid path data:', { pathLength: path?.length, path });
    return null;
  }

  // Debug: log the first few path points to understand the structure
  console.log('[WealthChart] First 3 path points:', path.slice(0, 3));

  // Bridge window for shading - use lifecyclePhase if available, fallback to phase mapping
  const bridge = path.filter(p => p.lifecyclePhase === "bridge" || p.phase === "bridge");
  const bridgeStart = bridge[0]?.age;
  const bridgeEnd = bridge.length ? bridge[bridge.length - 1]?.age : undefined;

  // Helper to determine lifecycle phase with fallback
  const getLifecyclePhase = (p: PathPoint): 'accum' | 'bridge' | 'retire' | null => {
    if (p.lifecyclePhase) return p.lifecyclePhase;
    // Fallback mapping from phase to lifecycle (if needed)
    if (p.phase === "accum") return "accum";
    if (p.phase === "bridge") return "bridge";  
    if (p.phase === "retire") return "retire";
    // If we can't determine, try to infer from age patterns
    return null;
  };

  // Canonical transform -> stable keys for Recharts
  const data: ChartRow[] = path.map(p => {
    const lifecycle = getLifecyclePhase(p);
    return {
      age: p.age,
      accumulation: lifecycle === "accum"  ? p.total : null,
      retirement:   lifecycle === "retire" ? p.total : null,
      bridge:       lifecycle === "bridge" ? p.total : null
    };
  });

  // Debug: check if we have any non-null values
  const hasAccum = data.some(d => d.accumulation !== null);
  const hasRetire = data.some(d => d.retirement !== null);
  const hasBridge = data.some(d => d.bridge !== null);
  console.log('[WealthChart] Data check:', { hasAccum, hasRetire, hasBridge, dataLength: data.length });

  // If no lifecycle phases detected, fall back to showing all as accumulation
  const fallbackData: ChartRow[] = data.every(d => d.accumulation === null && d.retirement === null && d.bridge === null)
    ? path.map(p => ({ age: p.age, accumulation: p.total, retirement: null, bridge: null }))
    : data;

  // Compute Y bounds with some headroom
  const vals = path.map(p => p.total);
  const minY = Math.min(0, ...vals);
  const maxY = Math.max(...vals);
  const pad = Math.max(1, (maxY - minY) * 0.05);

  return (
    <div className="w-full" style={{ minHeight: 360 }}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={fallbackData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
          {Number.isFinite(bridgeStart) && Number.isFinite(bridgeEnd) && (
            <ReferenceArea 
              x1={bridgeStart as number} 
              x2={(bridgeEnd as number) + 0.99} 
              fillOpacity={0.12} 
              fill="#ff7c7c"
              label={{ value: "Bridge Period", position: "insideTopLeft" }}
            />
          )}

          <ReferenceLine x={lifeExp} strokeDasharray="4 4" stroke="#ccc" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}