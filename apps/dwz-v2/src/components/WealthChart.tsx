import { LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import type { PathPoint } from "dwz-core";

export default function WealthChart({ path, lifeExp }: { path: PathPoint[]; lifeExp: number }) {
  if (!path?.length) return null;

  // Find bridge window for shading
  const bridgeData = path.filter(p => p.lifecyclePhase === "bridge");
  const bridgeStart = bridgeData[0]?.age;
  const bridgeEnd = bridgeData[bridgeData.length - 1]?.age;

  // Chart data with phase indicators
  const data = path.map(p => ({ 
    age: p.age, 
    outside: p.outside, 
    superBal: p.superBal, 
    total: p.total,
    lifecyclePhase: p.lifecyclePhase,
    // Add markers for styling
    isAccum: p.lifecyclePhase === "accum",
    isRetire: p.lifecyclePhase !== "accum"
  }));

  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" />
          <YAxis tickFormatter={(v) => `${Math.round(v/1000)}k`} />
          <Tooltip 
            formatter={(v: number) => `$${v.toLocaleString()}`}
            labelFormatter={(age) => {
              const point = data.find(d => d.age === age);
              const phaseLabel = point?.lifecyclePhase === "accum" ? " (Accumulating)" : 
                                point?.lifecyclePhase === "bridge" ? " (Bridge)" : 
                                " (Retirement)";
              return `Age ${age}${phaseLabel}`;
            }}
          />
          
          {/* Bridge shading */}
          {bridgeStart && bridgeEnd && (
            <ReferenceArea
              x1={bridgeStart}
              x2={bridgeEnd + 0.99}
              fill="#ff7c7c"
              fillOpacity={0.15}
              label={{ value: "Bridge Period", position: "insideTopLeft" }}
            />
          )}

          {/* Main wealth lines - single continuous lines with conditional styling */}
          <Line 
            type="monotone" 
            dataKey="outside" 
            dot={false} 
            stroke="#8884d8"
            strokeWidth={1.5}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="superBal" 
            dot={false} 
            stroke="#82ca9d"
            strokeWidth={1.5}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            dot={false} 
            strokeWidth={2}
            stroke="#ff7c7c"
            connectNulls={false}
          />
          
          <ReferenceLine x={lifeExp} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend showing phase styling */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "20px", height: "2px", background: "#ff7c7c", borderStyle: "dashed", borderWidth: "1px 0" }}></div>
          <span>Accumulation</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "20px", height: "2px", background: "#ff7c7c" }}></div>
          <span>Retirement</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "20px", height: "8px", background: "#ff7c7c", opacity: 0.15 }}></div>
          <span>Bridge Period</span>
        </div>
      </div>
    </div>
  );
}