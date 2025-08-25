import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SavingsSplitSensitivityPoint } from "dwz-core";

interface SensitivityChartProps {
  sensitivity: SavingsSplitSensitivityPoint[];
  recommendedPct: number;
}

export default function SensitivityChart({ sensitivity, recommendedPct }: SensitivityChartProps) {
  // Convert to chart format
  const data = sensitivity.map(point => ({
    pct: Math.round(point.pct * 100),
    age: point.earliestAge,
    isOptimal: Math.abs(point.pct - recommendedPct) < 0.001
  }));

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="pct" 
            label={{ value: 'Super Split %', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            label={{ value: 'Retirement Age', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value} years`, 'Retirement Age']}
            labelFormatter={(label: number) => `${label}% to Super`}
          />
          <Line 
            type="monotone" 
            dataKey="age" 
            stroke="#2563eb" 
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props: any) => {
              const { cx, cy, payload, key } = props;
              const dotKey = key || `dot-${payload.pct}`;
              return payload.isOptimal ? (
                <circle key={dotKey} cx={cx} cy={cy} r={4} fill="#dc2626" stroke="#dc2626" strokeWidth={2} />
              ) : (
                <circle key={dotKey} cx={cx} cy={cy} r={2} fill="#2563eb" />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}