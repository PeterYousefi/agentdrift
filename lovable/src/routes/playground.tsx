import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Pause, Play, RotateCcw, BellRing } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { SCENARIOS, SCENARIO_BY_ID } from "@/fixtures/scenarios";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { buildGraphFromEvents, INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import {
  emittedEvents,
  pauseScenario,
  resetScenario,
  resumeScenario,
  runScenario,
  selectScenario,
  useDemo,
} from "@/lib/demo-store";
import { scoreWindow, THRESHOLDS } from "@/lib/detector";
import { STAGES, scoreHistory, stageForEvent, type StageKey } from "@/lib/story";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Mono,
  PageHeader,
  Panel,
  ProvenanceLabel,
  RiskTag,
  SyntheticBadge,
} from "@/components/design-system/primitives";
import { MovementGraph } from "@/components/movement-graph/MovementGraph";
import { EventTimeline } from "@/components/investigation/EventTimeline";
import { AnomalyScore, FeatureBreakdown } from "@/components/investigation/DetectorReadout";

export const Route = createFileRoute("/playground")({
  head: () =>
    pageMeta(
      "Scenario playground",
      "Replay deterministic synthetic scenarios and watch the behavioral detector respond in real time.",
    ),
  component: Playground,
});

function Playground() {
  const playback = useDemo((s) => s.playback);
  const alerts = useDemo((s) => s.alerts);
  const sc = SCENARIO_BY_ID[playback.scenarioId];
  const agent = AGENT_BY_ID[sc.agentId];
  const events = useMemo(() => emittedEvents(playback), [playback]);
  const known = useMemo(
    () => [...agent.baseline.knownResources, ...agent.baseline.knownDestinations],
    [agent],
  );
  const marked = useMemo(
    () => events.map((e) => ({ ...e, novel: !known.includes(e.target) })),
    [events, known],
  );
  const graph = useMemo(
    () => buildGraphFromEvents("live", sc.agentId, marked, known),
    [marked, sc.agentId, known],
  );
  const result = useMemo(() => scoreWindow(events, agent), [events, agent]);
  const last = sc.events[sc.events.length - 1].offset;
  const progress = playback.runId ? Math.max(0, Math.min(1, playback.elapsed / last)) : 0;
  const runAlert = alerts.find((a) => a.runId === playback.runId);
  const actionStatus = useDemo((s) => s.actionStatus);
  const history = useMemo(
    () =>
      scoreHistory(sc, agent, (n) =>
        emittedEvents({
          scenarioId: sc.id,
          runId: "h",
          elapsed: sc.events[n - 1].offset,
          status: "running",
        }),
      ),
    [sc, agent],
  );
  const reached = useMemo(() => {
    const r = new Set<StageKey>();
    sc.events.slice(0, events.length).forEach((e) => r.add(stageForEvent(e, agent)));
    if (runAlert) {
      r.add("detection");
      r.add("investigation");
    }
    const actId = sc.linkedCaseId ? INVESTIGATION_BY_ID[sc.linkedCaseId]?.actionId : undefined;
    if (runAlert && actId && actionStatus[actId] === "approved") r.add("response");
    return r;
  }, [sc, events.length, agent, runAlert, actionStatus]);
  const planned = useMemo(() => {
    const r = new Set<StageKey>(sc.events.map((e) => stageForEvent(e, agent)));
    if (history.alertIndex >= 0)
      ["detection", "investigation", "response"].forEach((k) => r.add(k as StageKey));
    return r;
  }, [sc, agent, history]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Interactive"
        title="Scenario playground"
        description="Deterministic event playback — the same scenario always produces the same events and score. No accounts, no deployment."
        actions={<SyntheticBadge />}
      />
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <nav aria-label="Scenarios" className="space-y-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => selectScenario(s.id)}
              className={cn(
                "w-full rounded-md border bg-card px-3 py-2.5 text-left shadow-panel transition-colors",
                s.id === sc.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <Mono className="text-muted-foreground">0{s.index}</Mono>
                <RiskTag level={s.expectedLevel} />
              </div>
              <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
                {s.name}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                {AGENT_BY_ID[s.agentId].name}
              </div>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          <Panel eyebrow={`Scenario 0${sc.index}`} title={sc.name}>
            <p className="text-[13px] leading-relaxed text-foreground">{sc.description}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              <span className="font-medium text-foreground">Expected:</span> {sc.expected}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {playback.status === "running" ? (
                <Button variant="outline" onClick={pauseScenario}>
                  <Pause /> Pause
                </Button>
              ) : playback.status === "paused" ? (
                <Button variant="ink" onClick={resumeScenario}>
                  <Play /> Resume
                </Button>
              ) : (
                <Button variant="ink" onClick={() => runScenario(sc.id)}>
                  <Play /> {playback.status === "done" ? "Run again" : "Run scenario"}
                </Button>
              )}
              <Button variant="ghost" onClick={resetScenario} disabled={!playback.runId}>
                <RotateCcw /> Reset
              </Button>
              <div className="ml-auto flex items-center gap-3">
                <Mono className="text-muted-foreground">
                  {playback.runId ?? "no run"} · t+{Math.max(0, playback.elapsed).toFixed(1)}s
                </Mono>
                <Mono>
                  {events.length}/{sc.events.length} events
                </Mono>
              </div>
            </div>
            {/* Playback timeline */}
            <div className="relative mt-4 h-6">
              <div className="absolute inset-x-0 top-2.5 h-px bg-border" />
              <div
                className="absolute left-0 top-2 h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
              {sc.events.map((e, i) => {
                const hit = i < events.length;
                const novel = !known.includes(e.target);
                return (
                  <span
                    key={i}
                    title={`${e.operation} t+${e.offset}s`}
                    className={cn(
                      "absolute top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 transition-colors",
                      hit
                        ? novel
                          ? "border-danger bg-danger"
                          : "border-primary bg-primary"
                        : "border-border bg-card",
                    )}
                    style={{ left: `${(e.offset / last) * 100}%` }}
                  />
                );
              })}
              {history.alertIndex >= 0 && (
                <span
                  className="absolute -top-3 -translate-x-1/2 font-mono text-[9px] uppercase text-danger"
                  style={{ left: `${(sc.events[history.alertIndex].offset / last) * 100}%` }}
                  aria-hidden
                >
                  case ▾
                </span>
              )}
            </div>
            <ol
              className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 2xl:grid-cols-7"
              aria-label="Scenario progression"
            >
              {STAGES.map((st, i) => {
                const on = reached.has(st.key);
                const na = !planned.has(st.key);
                return (
                  <li
                    key={st.key}
                    aria-current={on ? "step" : undefined}
                    className={cn(
                      "rounded-sm border px-2 py-1.5 transition-colors",
                      on
                        ? ["access", "staging", "outbound", "detection"].includes(st.key)
                          ? "border-danger bg-danger-soft"
                          : "border-primary bg-accent"
                        : "border-border bg-card",
                      na && "opacity-45",
                    )}
                  >
                    <div className="font-mono text-[9.5px] text-muted-foreground">
                      0{i + 1}
                      {na ? " · n/a" : on ? " · reached" : ""}
                    </div>
                    <div className="text-[11.5px] font-medium leading-tight text-foreground">
                      {st.label}
                    </div>
                  </li>
                );
              })}
            </ol>
            {reached.has("investigation") && !reached.has("response") && (
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                Next: open the case and approve or reject the proposed{" "}
                <span className="font-medium text-foreground">simulated</span> containment in the{" "}
                <Link to="/response" className="text-primary hover:underline">
                  Response center
                </Link>
                .
              </p>
            )}
          </Panel>

          <Panel
            eyebrow="Live movement preview"
            title="Graph builds as events arrive"
            bodyClassName="p-0"
          >
            {events.length ? (
              <MovementGraph graph={graph} events={marked} height={340} compact />
            ) : (
              <div className="p-6">
                <Empty title="Waiting for events">
                  Press Run scenario to start deterministic playback.
                </Empty>
              </div>
            )}
          </Panel>

          <Panel
            eyebrow="Event stream"
            title="Metadata events"
            actions={<ProvenanceLabel kind="demo" />}
          >
            {marked.length ? (
              <EventTimeline events={[...marked].reverse()} animate />
            ) : (
              <p className="text-[12.5px] text-muted-foreground">No events yet.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-16 xl:self-start">
          <Panel
            eyebrow="Detector · live"
            title="Window score"
            actions={<ProvenanceLabel kind="detector" />}
          >
            <AnomalyScore result={result} />
            <ScoreSpark
              scores={history.scores}
              shown={events.length}
              alertIndex={history.alertIndex}
            />
            <div className="mt-4 border-t border-border pt-4">
              <FeatureBreakdown result={result} dense />
            </div>
          </Panel>
          <Panel eyebrow="Simulated alerts" title="Case creation" bodyClassName="p-0">
            {runAlert && (
              <div
                className={cn(
                  "border-b border-border px-4 py-3 animate-event-in",
                  runAlert.level === "critical" ? "bg-danger-soft" : "bg-warning-soft",
                )}
              >
                <div className="flex items-center gap-2">
                  <BellRing className="h-3.5 w-3.5 text-danger" />
                  <Mono className="font-semibold">{runAlert.id}</Mono>
                  <RiskTag level={runAlert.level} />
                </div>
                <p className="mt-1 text-[12px] text-foreground">
                  Score crossed review threshold. Simulated case opened.
                </p>
                {runAlert.linkedCaseId && (
                  <Link
                    to="/investigations/$caseId"
                    params={{ caseId: runAlert.linkedCaseId }}
                    className="mt-1 inline-block text-[12px] font-medium text-primary hover:underline"
                  >
                    Open corresponding investigation {runAlert.linkedCaseId} →
                  </Link>
                )}
              </div>
            )}
            {!runAlert && playback.status === "done" && (
              <p className="border-b border-border px-4 py-3 text-[12px] text-foreground">
                Run complete. Score stayed below review — no case created.
              </p>
            )}
            <ul className="divide-y divide-border">
              {alerts
                .filter((a) => a.runId !== playback.runId)
                .slice(0, 6)
                .map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-4 py-2 text-[12px]"
                  >
                    <span>
                      <Mono>{a.id}</Mono>{" "}
                      <span className="text-muted-foreground">
                        · {SCENARIO_BY_ID[a.scenarioId].name}
                      </span>
                    </span>
                    <RiskTag level={a.level} />
                  </li>
                ))}
              {alerts.length === 0 && !runAlert && playback.status !== "done" && (
                <li className="px-4 py-3 text-[12px] text-muted-foreground">
                  No alerts in this session.
                </li>
              )}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function ScoreSpark({
  scores,
  shown,
  alertIndex,
}: {
  scores: number[];
  shown: number;
  alertIndex: number;
}) {
  const w = 300,
    h = 56,
    n = Math.max(1, scores.length - 1);
  const x = (i: number) => (i / n) * w;
  const y = (v: number) => h - v * h;
  const pts = scores
    .slice(0, shown)
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(" ");
  return (
    <figure
      className="mt-4"
      aria-label={`Score after each event: ${
        scores
          .slice(0, shown)
          .map((s) => s.toFixed(2))
          .join(", ") || "no events yet"
      }`}
    >
      <figcaption className="eyebrow mb-1">Score per event · deterministic</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-14 w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden
      >
        {Object.entries(THRESHOLDS).map(([k, v]) => (
          <line
            key={k}
            x1={0}
            x2={w}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
        ))}
        {alertIndex >= 0 && (
          <line
            x1={x(alertIndex)}
            x2={x(alertIndex)}
            y1={0}
            y2={h}
            stroke="var(--color-danger)"
            strokeOpacity={0.4}
          />
        )}
        {pts && (
          <polyline
            points={pts}
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {scores.slice(0, shown).map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={2.5}
            fill={i === alertIndex ? "var(--color-danger)" : "var(--color-foreground)"}
          />
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between font-mono text-[9.5px] text-muted-foreground">
        <span>evt 1</span>
        {alertIndex >= 0 && <span className="text-danger">case opens at evt {alertIndex + 1}</span>}
        <span>evt {scores.length}</span>
      </div>
    </figure>
  );
}
