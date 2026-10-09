import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Agent } from "@/types";
import { fmtBytes, fmtDateTime, fmtTime } from "@/lib/format";

const axis = {
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  fill: "var(--color-muted-foreground)",
};

export function Sparkline({
  data,
  dataKey = "v",
  tone = "teal",
  height = 32,
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  tone?: "teal" | "danger" | "warn";
  height?: number;
}) {
  const color =
    tone === "danger"
      ? "var(--color-danger)"
      : tone === "warn"
        ? "var(--color-warning)"
        : "var(--color-primary)";
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.25}
            fill={color}
            fillOpacity={0.08}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-card px-2 py-1.5 shadow-float">
      <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="font-mono text-[11px] text-foreground">
          {p.name}: {fmtBytes(p.value)}
        </div>
      ))}
    </div>
  );
}

export function BaselineChart({ agent, height = 180 }: { agent: Agent; height?: number }) {
  const baselineDaily = agent.baseline.avgSendBytes;
  const data = agent.history.map((d) => ({ day: d.day, sent: d.sent }));
  return (
    <div
      style={{ height }}
      role="img"
      aria-label="Historical outbound training samples in UTC; dashed line is the detector median"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="day"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtTime}
            minTickGap={40}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtBytes(v, 0)}
            width={58}
          />
          <Tooltip
            content={<TipBox />}
            labelFormatter={(label) => fmtDateTime(String(label))}
            cursor={{ fill: "var(--color-muted)" }}
          />
          <ReferenceLine
            y={baselineDaily}
            stroke="var(--color-ink)"
            strokeDasharray="4 3"
            label={{ value: "median / active window", position: "insideTopLeft", ...axis }}
          />
          <Bar
            dataKey="sent"
            name="outbound"
            fill="var(--color-primary)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
            shape={(p: unknown) => {
              const bar = p as {
                x: number;
                y: number;
                width: number;
                height: number;
                value: number;
              };
              return (
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={1.5}
                  fill={
                    bar.value > baselineDaily * 1.8
                      ? "var(--color-danger)"
                      : bar.value > baselineDaily * 1.3
                        ? "var(--color-warning)"
                        : "var(--color-primary)"
                  }
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendArea({
  data,
  height = 120,
}: {
  data: { t: string; bytes: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="t" tick={axis} tickLine={false} axisLine={false} interval={3} />
          <Tooltip content={<TipBox />} />
          <Area
            type="stepAfter"
            dataKey="bytes"
            name="outbound"
            stroke="var(--color-ink)"
            strokeWidth={1.25}
            fill="var(--color-primary)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
