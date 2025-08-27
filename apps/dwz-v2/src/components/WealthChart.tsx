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
  if (!Array.isArray(path) || path.length < 2) return null;

  // Bridge window for shading
  const bridge = path.filter(p => p.lifecyclePhase === "bridge");
  const bridgeStart = bridge[0]?.age;
  const bridgeEnd = bridge.length ? bridge[bridge.length - 1]?.age : undefined;

  // Canonical transform -> stable keys for Recharts
  const data: ChartRow[] = path.map(p => ({
    age: p.age,
    accumulation: p.lifecyclePhase === "accum"  ? p.total : null,
    retirement:   p.lifecyclePhase === "retire" ? p.total : null,
    bridge:       p.lifecyclePhase === "bridge" ? p.total : null
  }));

  // Compute Y bounds with some headroom
  const vals = path.map(p => p.total);
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