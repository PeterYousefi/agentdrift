import { memo, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ClientOnly } from "@tanstack/react-router";
import { Bot, Cpu, Database, Fingerprint, Globe, Package } from "lucide-react";
import type { EntityKind, GraphEdgeSpec, GraphNodeSpec, MovementEvent, MovementGraph as G } from "@/types";
import { cn } from "@/lib/utils";
import { fmtBytes } from "@/lib/format";

const ICON: Record<EntityKind, typeof Bot> = {
  agent: Bot,
  process: Cpu,
  identity: Fingerprint,
  resource: Database,
  endpoint: Globe,
  staging: Package,
};

type NodeData = GraphNodeSpec & { dim: boolean; active: boolean; onPath: boolean; [k: string]: unknown };
type EdgeData = GraphEdgeSpec & { dim: boolean; active: boolean; total: number; step?: number; quiet: boolean; onHover: (id: string | null) => void; onSelect: (id: string) => void; [k: string]: unknown };

const hidden = "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

const EntityNode = memo(function EntityNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const Icon = ICON[data.kind];
  return (
    <div
      className={cn(
        "w-[200px] rounded-md border bg-card px-3 py-2.5 shadow-panel transition-all duration-200",
        data.onPath ? "border-danger border-l-[3px]" : data.novel ? "border-danger/50" : "border-border",
        (selected || data.active) && "border-primary ring-2 ring-primary/25",
        data.dim && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} id="t-l" className={hidden} />
      <Handle type="source" position={Position.Right} id="s-r" className={hidden} />
      <Handle type="source" position={Position.Top} id="s-t" className={hidden} />
      <Handle type="target" position={Position.Bottom} id="t-b" className={hidden} />
      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm", data.kind === "agent" ? "bg-ink text-primary-foreground" : data.novel ? "bg-danger-soft text-danger" : "bg-accent text-accent-foreground")}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">{data.kind}</span>
            {data.novel && <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-danger">· novel</span>}
          </div>
          <div className="truncate text-[12.5px] font-semibold leading-tight text-foreground">{data.label}</div>
          <div className="truncate font-mono text-[10.5px] text-muted-foreground">{data.sub}</div>
        </div>
      </div>
    </div>
  );
});

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }: EdgeProps<Edge<EdgeData>>) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const d = data!;
  const isAttr = d.op === "ATTR";
  const hot = selected || d.active;
  const stroke = isAttr ? "var(--color-muted-foreground)" : d.anomalous ? "var(--color-danger)" : "var(--color-primary)";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: isAttr ? 1 : d.anomalous ? (hot ? 4 : 3) : hot ? 2.5 : 1.25,
          strokeDasharray: isAttr ? "2 4" : d.anomalous ? "8 4" : undefined,
          strokeOpacity: d.dim ? 0.15 : d.quiet ? 0.5 : 1,
        }}
        interactionWidth={18}
      />
      {!isAttr && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onMouseEnter={() => d.onHover(id)}
            onMouseLeave={() => d.onHover(null)}
            className={cn(
              "nodrag nopan pointer-events-auto absolute flex items-center gap-1 rounded-sm border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium shadow-panel transition-opacity",
              d.anomalous ? "border-danger bg-danger-soft text-danger" : "border-border text-muted-foreground",
              d.quiet && !hot && "text-[9.5px] opacity-80",
              hot && "ring-2 ring-primary/40",
              d.dim && "opacity-25",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
            aria-label={`${d.anomalous ? `Anomalous step ${d.step}, ` : ""}${d.op} edge, ${d.eventIds.length} event${d.eventIds.length === 1 ? "" : "s"}${d.total ? `, ${fmtBytes(d.total)}` : ""}`}
            onClick={() => d.onSelect(id)}
          >
            {d.anomalous && d.step != null && <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8.5px] text-primary-foreground" aria-hidden>{d.step}</span>}
            {d.op}
            {d.total > 0 && <span className="text-muted-foreground">· {fmtBytes(d.total)}</span>}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { entity: EntityNode };
const edgeTypes = { flow: FlowEdge };

export interface MovementGraphProps {
  graph: G;
  events: MovementEvent[];
  selectedEdgeId?: string | null;
  selectedNodeId?: string | null;
  focusAnomalous?: boolean;
  onSelectEdge?: (id: string | null) => void;
  onSelectNode?: (id: string | null) => void;
  height?: number;
  compact?: boolean;
}

function Inner({ graph, events, selectedEdgeId, selectedNodeId, focusAnomalous, onSelectEdge, onSelectNode, height = 480, compact }: MovementGraphProps) {
  const [hover, setHover] = useState<string | null>(null);
  const rf = useReactFlow();
  const evById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);

  const activeEdges = useMemo(() => {
    if (selectedEdgeId) return new Set([selectedEdgeId]);
    if (selectedNodeId) return new Set(graph.edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId).map((e) => e.id));
    if (focusAnomalous) return new Set(graph.edges.filter((e) => e.anomalous).map((e) => e.id));
    return null;
  }, [graph, selectedEdgeId, selectedNodeId, focusAnomalous]);

  const activeNodes = useMemo(() => {
    if (!activeEdges) return null;
    const s = new Set<string>();
    graph.edges.filter((e) => activeEdges.has(e.id)).forEach((e) => (s.add(e.source), s.add(e.target)));
    if (focusAnomalous && !selectedEdgeId && !selectedNodeId) s.add("agent").add("proc");
    if (selectedNodeId) s.add(selectedNodeId);
    return s;
  }, [activeEdges, graph, focusAnomalous, selectedEdgeId, selectedNodeId]);

  // Order anomalous edges by first event timestamp so the suspicious path reads 1 → 2 → 3.
  const steps = useMemo(() => {
    const an = graph.edges.filter((e) => e.anomalous && e.op !== "ATTR");
    const first = (e: (typeof an)[number]) => e.eventIds.map((id) => evById[id]?.ts ?? "").sort()[0] ?? "";
    return Object.fromEntries([...an].sort((a, b) => first(a).localeCompare(first(b))).map((e, i) => [e.id, i + 1]));
  }, [graph, evById]);
  const pathNodes = useMemo(() => {
    const s = new Set<string>();
    graph.edges.filter((e) => steps[e.id]).forEach((e) => { if (e.source !== "proc" && e.source !== "agent") s.add(e.source); s.add(e.target); });
    return s;
  }, [graph, steps]);
  const hasPath = Object.keys(steps).length > 0;

  const nodes: Node<NodeData>[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: "entity",
        position: { x: n.x, y: n.y },
        selected: n.id === selectedNodeId,
        data: { ...n, onPath: pathNodes.has(n.id), dim: !!activeNodes && !activeNodes.has(n.id), active: !!activeNodes && activeNodes.has(n.id) && !!selectedNodeId && n.id === selectedNodeId },
      })),
    [graph, activeNodes, selectedNodeId, pathNodes],
  );

  const edges: Edge<EdgeData>[] = useMemo(
    () =>
      graph.edges.map((e) => {
        const total = e.eventIds.reduce((s, id) => s + (evById[id]?.bytes ?? 0), 0);
        const color = e.op === "ATTR" ? "var(--color-muted-foreground)" : e.anomalous ? "var(--color-danger)" : "var(--color-primary)";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? "s-r",
          targetHandle: e.targetHandle ?? "t-l",
          type: "flow",
          selected: e.id === selectedEdgeId,
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          data: { ...e, total, step: steps[e.id], quiet: hasPath && !e.anomalous && !activeEdges?.has(e.id), onSelect: (eid: string) => onSelectEdge?.(eid), dim: !!activeEdges && !activeEdges.has(e.id), active: !!activeEdges && activeEdges.has(e.id), onHover: setHover },
        };
      }),
    [graph, evById, activeEdges, selectedEdgeId, steps, hasPath, onSelectEdge],
  );

  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.06, duration: 300 }), 30);
    return () => clearTimeout(t);
  }, [graph.nodes.length, rf]);

  const hovered = hover ? graph.edges.find((e) => e.id === hover) : null;
  const label = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  const selLabel = selectedEdgeId ? (() => { const e = graph.edges.find((x) => x.id === selectedEdgeId); return e ? `${e.op} · ${label(e.source)} → ${label(e.target)}` : null; })() : selectedNodeId ? label(selectedNodeId) : null;

  return (
    <div className="relative dot-grid" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.06 }}
        minZoom={0.3}
        maxZoom={1.8}
        nodesDraggable={!compact}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        aria-label="Data movement graph"
        onEdgeClick={(_, e) => onSelectEdge?.(e.data?.op === "ATTR" ? null : e.id)}
        onNodeClick={(_, n) => onSelectNode?.(n.id)}
        onPaneClick={() => {
          onSelectEdge?.(null);
          onSelectNode?.(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={0} />
        {!compact && <Controls showInteractive={false} position="bottom-right" />}
      </ReactFlow>
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 w-64 rounded-md border border-border bg-card p-3 shadow-float animate-event-in">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold">{steps[hovered.id] ? `Step ${steps[hovered.id]} · ` : ""}{hovered.op}</span>
            <span className={cn("font-mono text-[10px] uppercase", hovered.anomalous ? "text-danger" : "text-primary")}>{hovered.anomalous ? "anomalous" : "baseline-consistent"}</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug text-foreground">{label(hovered.source)} <span className="text-muted-foreground">→</span> {label(hovered.target)}</div>
          <div className="mt-1.5 space-y-0.5">
            {hovered.eventIds.map((id) => (
              <div key={id} className="flex justify-between font-mono text-[10.5px] text-muted-foreground">
                <span>{id}</span>
                <span className="text-foreground">{evById[id] ? fmtBytes(evById[id].bytes) : "—"}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-mono text-[10.5px]"><span className="text-muted-foreground">{hovered.eventIds.length} event{hovered.eventIds.length === 1 ? "" : "s"}</span><span>{fmtBytes(hovered.eventIds.reduce((t, id) => t + (evById[id]?.bytes ?? 0), 0))}</span></div>
          <div className="mt-1.5 text-[10.5px] text-muted-foreground">Click to inspect evidence</div>
        </div>
      )}
      {hasPath && !compact && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-border bg-card/95 px-3 py-2 shadow-panel">
          <div className="eyebrow mb-1">Anomalous path</div>
          <div className="flex items-center gap-1 font-mono text-[10.5px] text-danger">
            {graph.edges.filter((e) => steps[e.id]).sort((a, b) => steps[a.id] - steps[b.id]).map((e, i) => (
              <span key={e.id} className="flex items-center gap-1">{i > 0 && <span className="text-muted-foreground">→</span>}<span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8.5px] text-primary-foreground">{steps[e.id]}</span>{e.op}</span>
            ))}
          </div>
        </div>
      )}
      {selLabel && !compact && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[70%] truncate rounded-sm border border-primary bg-card px-2 py-1 text-[11px] text-foreground shadow-panel" role="status">
          <span className="eyebrow mr-1.5">Selected</span>{selLabel}
        </div>
      )}
    </div>
  );
}

export function MovementGraph(props: MovementGraphProps) {
  return (
    <ClientOnly fallback={<div className="dot-grid" style={{ height: props.height ?? 480 }} />}>
      <ReactFlowProvider>
        <Inner {...props} />
      </ReactFlowProvider>
    </ClientOnly>
  );
}

export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><svg width="26" height="6" aria-hidden><line x1="0" y1="3" x2="26" y2="3" stroke="var(--color-primary)" strokeWidth="1.5" /></svg>Baseline-consistent</span>
      <span className="flex items-center gap-1.5"><svg width="26" height="6" aria-hidden><line x1="0" y1="3" x2="26" y2="3" stroke="var(--color-danger)" strokeWidth="3" strokeDasharray="8 4" /></svg>Anomalous step (numbered)</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-l-[3px] border-danger bg-card" aria-hidden />On anomalous path</span>
      <span className="flex items-center gap-1.5"><svg width="26" height="6" aria-hidden><line x1="0" y1="3" x2="26" y2="3" stroke="var(--color-muted-foreground)" strokeWidth="1" strokeDasharray="2 4" /></svg>Attribution</span>
    </div>
  );
}
