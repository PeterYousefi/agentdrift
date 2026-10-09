import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Crosshair, Maximize2, Network, ListOrdered } from "lucide-react";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import { useDemo } from "@/lib/demo-store";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { ACTION_BY_ID, INVESTIGATION_BY_ID, INVESTIGATIONS } from "@/fixtures/investigations";
import { ENTITIES } from "@/fixtures/entities";
import { fmtBytes, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Mono, Panel, ProvenanceLabel, RiskTag, Segmented, SyntheticBadge, Tag } from "@/components/design-system/primitives";
import { GraphLegend, MovementGraph } from "@/components/movement-graph/MovementGraph";
import { EventTimeline } from "@/components/investigation/EventTimeline";
import { AnomalyScore, FeatureBreakdown } from "@/components/investigation/DetectorReadout";
import { NarrativeNotebook } from "@/components/investigation/NarrativeNotebook";
import { ContainmentCard } from "@/components/investigation/ContainmentCard";
import { EventDetail } from "@/components/evidence/EventDetail";
import { BaselineChart } from "@/components/charts/Charts";
import { TOUR_FOCUS_STEP } from "@/components/tour/GuidedTour";

export const Route = createFileRoute("/investigations/$caseId")({
  head: ({ params }) => {
    const c = INVESTIGATION_BY_ID[params.caseId];
    return c ? pageMeta(`${c.id} · ${c.title}`, c.summary) : { meta: [{ title: "Unavailable — AgentDrift" }, { name: "robots", content: "noindex" }] };
  },
  loader: async ({ context, params }) => {
    if (!INVESTIGATION_BY_ID[params.caseId]) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(q.investigation(params.caseId)),
      context.queryClient.ensureQueryData(q.evidence(params.caseId)),
      context.queryClient.ensureQueryData(q.graph(params.caseId)),
      context.queryClient.ensureQueryData(q.features(params.caseId)),
      context.queryClient.ensureQueryData(q.narrative(params.caseId)),
    ]);
  },
  component: Workspace,
});

type RightTab = "evidence" | "report" | "contain";

function Workspace() {
  const { caseId } = Route.useParams();
  const { data: inv } = useSuspenseQuery(q.investigation(caseId));
  const { data: events } = useSuspenseQuery(q.evidence(caseId));
  const { data: graph } = useSuspenseQuery(q.graph(caseId));
  const { data: det } = useSuspenseQuery(q.features(caseId));
  const { data: narrative } = useSuspenseQuery(q.narrative(caseId));
  const agent = AGENT_BY_ID[inv.agentId];
  const action = inv.actionId ? ACTION_BY_ID[inv.actionId] : undefined;
  const actionStatus = useDemo((s) => (inv.actionId ? s.actionStatus[inv.actionId] : undefined));
  const tour = useDemo((s) => s.tour);
  const status = actionStatus === "approved" ? "contained" : inv.status;

  const [view, setView] = useState<"graph" | "timeline">("graph");
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEvent, setSelEvent] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  const [tab, setTab] = useState<RightTab>("evidence");

  useEffect(() => {
    setSelEdge(null); setSelNode(null); setSelEvent(null); setFocus(false);
  }, [caseId]);
  useEffect(() => {
    if (tour.active && tour.step === TOUR_FOCUS_STEP) setFocus(true);
  }, [tour.active, tour.step]);

  const evById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const edgeForEvent = (id: string) => graph.edges.find((e) => e.eventIds.includes(id))?.id ?? null;

  const selectEvent = (id: string) => {
    setSelEvent(id);
    setSelEdge(edgeForEvent(id));
    setSelNode(null);
    setTab("evidence");
  };

  const highlighted = useMemo(() => {
    if (selEvent) return new Set([selEvent]);
    if (selEdge) return new Set(graph.edges.find((e) => e.id === selEdge)?.eventIds ?? []);
    if (selNode) return new Set(graph.edges.filter((e) => e.source === selNode || e.target === selNode).flatMap((e) => e.eventIds));
    if (focus) return new Set(events.filter((e) => e.novel).map((e) => e.id));
    return new Set<string>();
  }, [selEvent, selEdge, selNode, focus, graph, events]);

  const inspected = selEvent ? [evById[selEvent]] : selEdge || selNode ? events.filter((e) => highlighted.has(e.id)) : [];

  return (
    <div className="mx-auto max-w-[1680px]">
      {/* Case header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mono className="text-muted-foreground">{inv.id}</Mono>
            <Tag>{inv.kind}</Tag>
            <Tag tone={status === "contained" ? "ink" : status === "closed" ? "neutral" : "warn"}>{status}</Tag>
            <SyntheticBadge />
          </div>
          <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{inv.title}</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{inv.summary}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="eyebrow">Score</div>
            <div className={cn("font-mono text-[26px] leading-none tabular", inv.severity === "critical" ? "text-danger" : inv.severity === "elevated" ? "text-warning-ink" : "text-foreground")}>{inv.score.toFixed(2)}</div>
          </div>
          <RiskTag level={inv.severity} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[220px_minmax(0,1fr)_400px]">
        {/* LEFT: incident context */}
        <aside className="space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0 xl:col-span-2 2xl:col-span-1 2xl:block 2xl:space-y-4 2xl:sticky 2xl:top-16 2xl:self-start">
          <Panel eyebrow="Agent" title={agent.name} bodyClassName="space-y-2 text-[12px]">
            <div><div className="eyebrow">Workload</div><Mono>{agent.namespace}/{agent.workload}</Mono></div>
            <div><div className="eyebrow">Identity</div><Mono>{agent.identity}</Mono> <span className="text-muted-foreground">· {agent.identityConfidence.toFixed(2)}</span></div>
            <div><div className="eyebrow">Baseline</div><Tag tone={agent.baselineState === "drifting" ? "warn" : "teal"}>{agent.baselineState}</Tag></div>
            <Link to="/agents/$agentId" params={{ agentId: agent.id }} className="inline-block pt-1 text-primary hover:underline">Agent profile →</Link>
          </Panel>
          <Panel eyebrow="Timeline" title="Case window" bodyClassName="space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-muted-foreground">First event</span><Mono>{fmtDateTime(events[0].ts)}</Mono></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last event</span><Mono>{fmtDateTime(events[events.length - 1].ts)}</Mono></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Opened</span><Mono>{fmtDateTime(inv.openedAt)}</Mono></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Events</span><Mono>{events.length}</Mono></div>
            <div className="flex justify-between"><span className="text-muted-foreground">First-seen</span><Mono className="text-danger">{events.filter((e) => e.novel).length}</Mono></div>
          </Panel>
          <nav aria-label="Other cases" className="rounded-md border border-border bg-card p-2 shadow-panel">
            <div className="eyebrow px-2 py-1">Other cases</div>
            {INVESTIGATIONS.map((c) => (
              <Link key={c.id} to="/investigations/$caseId" params={{ caseId: c.id }} className={cn("flex items-center justify-between rounded-sm px-2 py-1.5 text-[12px] hover:bg-muted", c.id === caseId && "bg-accent")}>
                <Mono>{c.id}</Mono><RiskTag level={c.severity} />
              </Link>
            ))}
          </nav>
        </aside>

        {/* CENTER */}
        <div className="min-w-0 space-y-4">
          <Panel
            eyebrow="Data movement graph"
            title={view === "graph" ? "Observed activity" : "Ordered sequence"}
            bodyClassName="p-0"
            actions={
              <>
                <Button size="sm" variant={focus ? "ink" : "outline"} onClick={() => { setFocus((f) => !f); setSelEdge(null); setSelNode(null); setSelEvent(null); }} aria-pressed={focus}>
                  <Crosshair /> <span className="sr-only sm:not-sr-only">Focus anomalous sequence</span>
                </Button>
                <Segmented label="View" value={view} onChange={setView} options={[{ value: "graph", label: <span className="flex items-center gap-1"><Network className="h-3 w-3" />Graph</span> }, { value: "timeline", label: <span className="flex items-center gap-1"><ListOrdered className="h-3 w-3" />Timeline</span> }]} />
              </>
            }
          >
            {view === "graph" ? (
              <MovementGraph
                graph={graph}
                events={events}
                selectedEdgeId={selEdge}
                selectedNodeId={selNode}
                focusAnomalous={focus}
                onSelectEdge={(id) => { setSelEdge(id); setSelEvent(null); setSelNode(null); if (id) setTab("evidence"); }}
                onSelectNode={(id) => { setSelNode(id); setSelEdge(null); setSelEvent(null); if (id) setTab("evidence"); }}
                height={500}
              />
            ) : (
              <div className="p-4"><EventTimeline events={events} selectedIds={highlighted} onSelect={(e) => selectEvent(e.id)} /></div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
              <GraphLegend />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Maximize2 className="h-3 w-3" /> Scroll to zoom · drag to pan</span>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <Panel eyebrow="Linked events" title="Sequence timeline" actions={<ProvenanceLabel kind="evidence" />}>
              <EventTimeline events={events} selectedIds={highlighted} onSelect={(e) => selectEvent(e.id)} />
            </Panel>
            <Panel eyebrow="Behavioral detector" title="Anomaly score" actions={<ProvenanceLabel kind="detector" />}>
              <AnomalyScore result={det} />
              <div className="mt-5 border-t border-border pt-4"><FeatureBreakdown result={det} dense /></div>
            </Panel>
          </div>

          <Panel eyebrow="Baseline comparison" title={`${agent.name} · daily outbound, 14 days`} actions={<ProvenanceLabel kind="demo" />}>
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <BaselineChart agent={agent} />
              <table className="w-full text-[12px]">
                <thead><tr className="text-left"><th className="eyebrow pb-1 font-normal">Signal</th><th className="eyebrow pb-1 text-right font-normal">Baseline</th><th className="eyebrow pb-1 text-right font-normal">Window</th></tr></thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="py-1.5">Outbound</td><td className="text-right font-mono">{fmtBytes(agent.baseline.avgSendBytes)}</td><td className="text-right font-mono text-danger">{fmtBytes(det.sentBytes)}</td></tr>
                  <tr><td className="py-1.5">Reads</td><td className="text-right font-mono">{fmtBytes(agent.baseline.avgReadBytes)}</td><td className="text-right font-mono">{fmtBytes(det.readBytes)}</td></tr>
                  <tr><td className="py-1.5">Destinations</td><td className="text-right font-mono">{agent.baseline.knownDestinations.length}</td><td className="text-right font-mono">{new Set(events.filter((e) => e.operation !== "READ" && e.operation !== "WRITE").map((e) => e.target)).size}</td></tr>
                  <tr><td className="py-1.5">Resources</td><td className="text-right font-mono">{agent.baseline.knownResources.length}</td><td className="text-right font-mono">{new Set(events.filter((e) => e.operation === "READ").map((e) => e.target)).size}</td></tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* RIGHT: inspector */}
        <aside className="xl:sticky xl:top-16 xl:self-start">
          <div className="rounded-md border border-border bg-card shadow-panel">
            <div className="flex border-b border-border" role="tablist">
              {([["evidence", "Evidence"], ["report", "AI report"], ["contain", "Containment"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("flex-1 border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors", tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  {l}
                  {k === "contain" && action && actionStatus === "proposed" && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" />}
                </button>
              ))}
            </div>
            <div className="max-h-[calc(100vh-140px)] overflow-auto p-4">
              {tab === "evidence" && (
                inspected.length ? (
                  <div className="space-y-5">
                    {selNode && (
                      <div className="rounded-sm bg-muted px-3 py-2">
                        <div className="eyebrow">Selected node</div>
                        <div className="text-[13px] font-semibold">{graph.nodes.find((n) => n.id === selNode)?.label}</div>
                        <div className="text-[11.5px] text-muted-foreground">{inspected.length} connected events</div>
                      </div>
                    )}
                    {inspected.map((e) => <EventDetail key={e.id} event={e} />)}
                  </div>
                ) : selNode ? (
                  <div className="text-[12.5px] text-muted-foreground">
                    <div className="text-[13px] font-semibold text-foreground">{graph.nodes.find((n) => n.id === selNode)?.label}</div>
                    Attribution node — no data-movement events attached. Workload and identity context is shown on the left.
                  </div>
                ) : (
                  <div>
                    <div className="eyebrow">Inspector</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground">Select an edge, node or timeline event to inspect the underlying synthetic evidence.</p>
                    <div className="mt-4 eyebrow">First-seen events in this case</div>
                    <ul className="mt-1 divide-y divide-border">
                      {events.filter((e) => e.novel).map((e) => (
                        <li key={e.id}>
                          <button onClick={() => selectEvent(e.id)} className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted">
                            <span className="min-w-0"><Mono>{e.id}</Mono><div className="truncate text-[12px] text-muted-foreground">{e.operation} · {ENTITIES[e.target]?.label}</div></span>
                            <Mono className="text-danger">{fmtBytes(e.bytes)}</Mono>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
              {tab === "report" && (
                narrative.length ? (
                  <div className="space-y-8">{narrative.map((n) => <NarrativeNotebook key={n.id} entry={n} onCite={selectEvent} activeId={selEvent} compact />)}</div>
                ) : <p className="text-[12.5px] text-muted-foreground">No narrative generated for this case.</p>
              )}
              {tab === "contain" && (action ? <ContainmentCard action={action} compact /> : <p className="text-[12.5px] text-muted-foreground">No containment proposed. This case was closed as benign after analyst review.</p>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
