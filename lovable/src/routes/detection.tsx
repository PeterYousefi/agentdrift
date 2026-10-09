import { isDemoMode } from "@/api";
import { LiveDetection } from "@/components/LiveDetection";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { pageMeta } from "@/lib/seo";
import { AGENTS, AGENT_BY_ID } from "@/fixtures/agents";
import { BASELINE_EVENTS, CASE_EVENTS } from "@/fixtures/events";
import { INVESTIGATIONS } from "@/fixtures/investigations";
import { levelFor, scoreWindow, THRESHOLDS, WEIGHTS } from "@/lib/detector";
import { MB } from "@/lib/format";
import { Slider } from "@/components/ui/slider";
import {
  Mono,
  PageHeader,
  Panel,
  ProvenanceLabel,
  RiskTag,
  SyntheticBadge,
  Tag,
} from "@/components/design-system/primitives";
import { FeatureBreakdown } from "@/components/investigation/DetectorReadout";

export const Route = createFileRoute("/detection")({
  head: () =>
    pageMeta(
      "Detection lab",
      "How the behavioral detector scores AI-agent movement: features, baselines, sliding windows and thresholds.",
    ),
  component: () => (isDemoMode ? <Lab /> : <LiveDetection />),
});

const axis = {
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  fill: "var(--color-muted-foreground)",
};
const STATIC_RULE = 500 * MB;

function useWindows() {
  return useMemo(() => {
    const normal = AGENTS.flatMap((a) => {
      const byDay = new Map<string, typeof BASELINE_EVENTS>();
      BASELINE_EVENTS.filter((e) => e.agentId === a.id).forEach((e) => {
        const d = e.ts.slice(0, 10);
        byDay.set(d, [...(byDay.get(d) ?? []), e]);
      });
      return [...byDay].map(([day, evts]) => {
        const r = scoreWindow(
          evts.sort((x, y) => x.ts.localeCompare(y.ts)),
          a,
        );
        return {
          x: +r.volumeRatio.toFixed(2),
          y: +((r.features[1].raw + r.features[2].raw) / 2).toFixed(2),
          score: r.score,
          label: `${a.name} · ${day}`,
        };
      });
    });
    const cases = INVESTIGATIONS.map((c) => {
      const evts = CASE_EVENTS.filter((e) => e.caseId === c.id).sort((x, y) =>
        x.ts.localeCompare(y.ts),
      );
      const r = scoreWindow(evts, AGENT_BY_ID[c.agentId]);
      return {
        x: +r.volumeRatio.toFixed(2),
        y: +((r.features[1].raw + r.features[2].raw) / 2).toFixed(2),
        score: r.score,
        label: c.id,
        sent: r.sentBytes,
      };
    });
    return { normal, cases };
  }, []);
}

function useSliding() {
  return useMemo(() => {
    const evts = CASE_EVENTS.filter((e) => e.caseId === "CASE-2041").sort((x, y) =>
      x.ts.localeCompare(y.ts),
    );
    const agent = AGENT_BY_ID["ag-07"];
    return evts.map((e, i) => ({
      t: e.ts.slice(11, 19),
      id: e.id,
      score: +scoreWindow(evts.slice(0, i + 1), agent).score.toFixed(3),
    }));
  }, []);
}

function Lab() {
  const { normal, cases } = useWindows();
  const sliding = useSliding();
  const [review, setReview] = useState<number>(THRESHOLDS.review);
  const flagship = useMemo(
    () =>
      scoreWindow(
        CASE_EVENTS.filter((e) => e.caseId === "CASE-2041").sort((x, y) =>
          x.ts.localeCompare(y.ts),
        ),
        AGENT_BY_ID["ag-07"],
      ),
    [],
  );
  const falsePosNormal = normal.filter((n) => n.score >= review).length;

  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Detection engineering"
        title="Detection lab"
        description="The demo detector is a transparent weighted model over four behavioral features, computed against each agent's own baseline. Weights are illustrative; the backend will replace them with a trained model."
        actions={
          <>
            <SyntheticBadge />
            <ProvenanceLabel kind="detector" />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          eyebrow="Normal vs suspicious"
          title="Every analysis window, plotted by volume ratio and novelty"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="volume ratio"
                  tick={axis}
                  label={{
                    value: "outbound / baseline (×)",
                    position: "insideBottom",
                    offset: -8,
                    ...axis,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="novelty"
                  domain={[0, 1]}
                  tick={axis}
                  label={{ value: "novelty", angle: -90, position: "insideLeft", ...axis }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) =>
                    payload?.[0] ? (
                      <div className="rounded-sm border border-border bg-card px-2 py-1.5 font-mono text-[11px] shadow-float">
                        <div>{payload[0].payload.label}</div>
                        <div className="text-muted-foreground">
                          score {payload[0].payload.score.toFixed(2)}
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Scatter
                  name="Baseline windows"
                  data={normal}
                  fill="var(--color-primary)"
                  fillOpacity={0.45}
                />
                <Scatter
                  name="Case windows"
                  data={cases}
                  fill="var(--color-danger)"
                  shape="diamond"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/50" />
              Baseline daily windows ({normal.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rotate-45 bg-danger" />
              Case windows ({cases.length})
            </span>
          </div>
        </Panel>

        <Panel eyebrow="Example contribution" title="CASE-2041 feature breakdown">
          <FeatureBreakdown result={flagship} />
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="eyebrow">Total</span>
            <span className="font-mono text-[18px] text-danger">{flagship.score.toFixed(2)}</span>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Sliding window" title="CASE-2041 score as each event arrives">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sliding} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="t" tick={axis} tickLine={false} />
                <YAxis domain={[0, 1]} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ payload }) =>
                    payload?.[0] ? (
                      <div className="rounded-sm border border-border bg-card px-2 py-1 font-mono text-[11px] shadow-float">
                        {payload[0].payload.id} · {Number(payload[0].value).toFixed(2)}
                      </div>
                    ) : null
                  }
                />
                {Object.entries(THRESHOLDS).map(([k, v]) => (
                  <ReferenceLine
                    key={k}
                    y={v}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="3 3"
                    label={{ value: k, position: "insideRight", ...axis }}
                  />
                ))}
                <Line
                  type="stepAfter"
                  dataKey="score"
                  stroke="var(--color-ink)"
                  strokeWidth={1.75}
                  dot={{ r: 3, fill: "var(--color-card)", stroke: "var(--color-ink)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            The window grows with each event. Resource novelty fires at the archive read; the
            sequence feature only fires once the novel send follows.
          </p>
        </Panel>

        <Panel eyebrow="Thresholds" title="Adjust the review threshold">
          <div className="flex items-center gap-4">
            <Slider
              value={[review]}
              min={0.1}
              max={0.9}
              step={0.01}
              onValueChange={(v) => setReview(v[0])}
              aria-label="Review threshold"
              className="flex-1"
            />
            <Mono className="w-10 text-right text-[14px]">{review.toFixed(2)}</Mono>
          </div>
          <table className="mt-4 w-full text-[12.5px]">
            <thead>
              <tr className="text-left">
                <th className="eyebrow pb-1 font-normal">Case</th>
                <th className="eyebrow pb-1 font-normal">Score</th>
                <th className="eyebrow pb-1 font-normal">Level at this threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => (
                <tr key={c.label}>
                  <td className="py-1.5">
                    <Mono>{c.label}</Mono>
                  </td>
                  <td>
                    <Mono>{c.score.toFixed(2)}</Mono>
                  </td>
                  <td>
                    <RiskTag
                      level={levelFor(c.score, {
                        ...THRESHOLDS,
                        review: Math.min(review, THRESHOLDS.elevated),
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Baseline windows that would also be flagged:{" "}
            <Mono className={falsePosNormal ? "text-warning-ink" : "text-primary"}>
              {falsePosNormal} / {normal.length}
            </Mono>
          </p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel eyebrow="Comparison" title="Static rule vs behavioral detector" bodyClassName="p-0">
          <table className="w-full text-[12.5px]">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-left">
                <th className="eyebrow px-4 py-2 font-normal">Case</th>
                <th className="eyebrow px-4 font-normal">Rule: SEND &gt; 500 MB</th>
                <th className="eyebrow px-4 font-normal">Behavioral detector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => (
                <tr key={c.label}>
                  <td className="px-4 py-2">
                    <Mono>{c.label}</Mono>
                  </td>
                  <td className="px-4">
                    {c.sent > STATIC_RULE ? <Tag tone="warn">fires</Tag> : <Tag>silent</Tag>}
                  </td>
                  <td className="px-4">
                    <RiskTag level={levelFor(c.score)} />{" "}
                    <Mono className="ml-1 text-muted-foreground">{c.score.toFixed(2)}</Mono>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-[11.5px] text-muted-foreground">
            The static rule misses low-and-slow drift (CASE-2038) and fires on benign quarter-end
            reporting (CASE-2029). The behavioral detector inverts both.
          </p>
        </Panel>
        <Panel eyebrow="Evaluation" title="Measured performance">
          <div className="grid grid-cols-2 gap-3">
            {["Precision", "Recall", "False-positive rate", "Detection latency (p95)"].map((m) => (
              <div
                key={m}
                className="rounded-sm border border-dashed border-border bg-muted/50 p-3"
              >
                <div className="eyebrow">{m}</div>
                <div className="mt-1 font-mono text-[13px] text-muted-foreground">
                  Not yet measured
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            These populate from the backend evaluation pipeline. No figures are claimed for this
            demo.
          </p>
          <div className="mt-3 border-t border-border pt-3">
            <div className="eyebrow mb-1">Current weights</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(WEIGHTS).map(([k, v]) => (
                <Tag key={k} tone="outline">
                  {k} {v}
                </Tag>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
