import type { ContainmentAction, Investigation, MovementGraph, NarrativeEntry, GraphNodeSpec, GraphEdgeSpec } from "@/types";
import { CASE_EVENTS } from "./events";
import { AGENT_BY_ID } from "./agents";
import { ENTITIES } from "./entities";
import { scoreWindow } from "@/lib/detector";

/** SYNTHETIC investigations. Scores are computed by the demo detector from the case events, never hand-typed. */

const caseEvents = (id: string) => CASE_EVENTS.filter((e) => e.caseId === id);

const raw: Omit<Investigation, "score" | "severity" | "evidenceIds">[] = [
  {
    id: "CASE-2041",
    title: "Novel archive read followed by external transfer",
    kind: "Sensitive read → send",
    agentId: "ag-07",
    status: "open",
    openedAt: "2026-10-08T14:09:52Z",
    summary: "Research Agent 07 read a restricted dataset it had never accessed, staged ~1.1 GB, then sent 998 MB to an unfamiliar external model endpoint.",
    actionId: "ACT-2041",
  },
  {
    id: "CASE-2038",
    title: "Gradual outbound drift to external bucket",
    kind: "Low-and-slow drift",
    agentId: "ag-03",
    status: "triage",
    openedAt: "2026-10-08T10:41:10Z",
    summary: "Research Agent 03 has sent increasing daily volumes to an external bucket for five days; no single transfer crossed a static threshold.",
    actionId: "ACT-2038",
  },
  {
    id: "CASE-2035",
    title: "New regional model endpoint",
    kind: "Ambiguous novelty",
    agentId: "ag-12",
    status: "triage",
    openedAt: "2026-10-08T12:30:40Z",
    summary: "Forecast Agent 12 began sending to a new regional deployment of an approved model class after reading an unfamiliar dataset.",
    actionId: "ACT-2035",
  },
  {
    id: "CASE-2029",
    title: "Quarter-end reporting volume spike",
    kind: "Benign candidate",
    agentId: "ag-05",
    status: "closed",
    openedAt: "2026-10-08T11:06:02Z",
    summary: "Reporting Agent 05 exceeded a static 500 MB rule during quarter-end reporting. Behavioral detector scored it low: known resource, known destination.",
  },
];

export const INVESTIGATIONS: Investigation[] = raw.map((c) => {
  const evts = caseEvents(c.id).sort((a, b) => a.ts.localeCompare(b.ts));
  const res = scoreWindow(evts, AGENT_BY_ID[c.agentId]);
  return { ...c, score: res.score, severity: res.level, evidenceIds: evts.map((e) => e.id) };
});
export const INVESTIGATION_BY_ID = Object.fromEntries(INVESTIGATIONS.map((c) => [c.id, c]));

/* ---------- Movement graphs ---------- */

const FLAGSHIP: MovementGraph = {
  caseId: "CASE-2041",
  nodes: [
    { id: "agent", kind: "agent", label: "Research Agent 07", sub: "ag-07", x: 0, y: 200 },
    { id: "proc", kind: "process", label: "quant-research-runner", sub: "quant-ws/research", x: 270, y: 200 },
    { id: "ident", kind: "identity", label: "mi-quant-research", sub: "managed identity · 0.97", x: 270, y: 30 },
    { id: "res:research-features", kind: "resource", label: "Research Feature Store", sub: "research-dataset", x: 580, y: 40 },
    { id: "res:strategy-archive", kind: "resource", label: "Strategy Archive", sub: "restricted-strategy", novel: true, x: 580, y: 250 },
    { id: "dst:forecast-model", kind: "endpoint", label: "Forecast Model Endpoint", sub: "approved-model", x: 890, y: 40 },
    { id: "stg:tmp-export", kind: "staging", label: "tmp-export staging", sub: "blob staging", novel: true, x: 890, y: 280 },
    { id: "dst:unknown-ext", kind: "endpoint", label: "Unknown External Model Endpoint", sub: "inference.nimbus-relay.example", novel: true, x: 1200, y: 250 },
  ],
  edges: [
    { id: "e-run", source: "agent", target: "proc", op: "ATTR", eventIds: [], bytes: 0, anomalous: false },
    { id: "e-id", source: "proc", target: "ident", op: "ATTR", eventIds: [], bytes: 0, anomalous: false, sourceHandle: "s-t", targetHandle: "t-b" },
    { id: "e-read-feat", source: "proc", target: "res:research-features", op: "READ", eventIds: ["evt-2041-01"], bytes: 0, anomalous: false },
    { id: "e-conn-fc", source: "res:research-features", target: "dst:forecast-model", op: "CONNECT", eventIds: ["evt-2041-02"], bytes: 0, anomalous: false },
    { id: "e-read-arch", source: "proc", target: "res:strategy-archive", op: "READ", eventIds: ["evt-2041-03", "evt-2041-04"], bytes: 0, anomalous: true },
    { id: "e-write-stg", source: "res:strategy-archive", target: "stg:tmp-export", op: "WRITE", eventIds: ["evt-2041-05"], bytes: 0, anomalous: true },
    { id: "e-send-ext", source: "stg:tmp-export", target: "dst:unknown-ext", op: "SEND", eventIds: ["evt-2041-06", "evt-2041-07", "evt-2041-08"], bytes: 0, anomalous: true },
  ],
};

/** Generic left-to-right layout from an event list. Used for non-flagship cases and live playback. */
export function buildGraphFromEvents(caseId: string, agentId: string, events: typeof CASE_EVENTS, knownTargets: string[] = []): MovementGraph {
  const a = AGENT_BY_ID[agentId];
  const nodes: GraphNodeSpec[] = [
    { id: "agent", kind: "agent", label: a?.name ?? agentId, sub: agentId, x: 0, y: 140 },
    { id: "proc", kind: "process", label: a?.workload ?? "workload", sub: a?.namespace ?? "", x: 270, y: 140 },
  ];
  const edges: GraphEdgeSpec[] = [{ id: "e-run", source: "agent", target: "proc", op: "ATTR", eventIds: [], bytes: 0, anomalous: false }];
  const cols: Record<string, number> = { resource: 580, staging: 580, endpoint: 890 };
  const counts: Record<number, number> = {};
  const byKey = new Map<string, GraphEdgeSpec>();
  for (const e of events) {
    const ent = ENTITIES[e.target];
    if (!ent) continue;
    if (!nodes.find((n) => n.id === ent.id)) {
      const x = cols[ent.kind] ?? 580;
      const i = (counts[x] = (counts[x] ?? -1) + 1);
      nodes.push({ id: ent.id, kind: ent.kind, label: ent.label, sub: ent.host ?? ent.cls, novel: !knownTargets.includes(ent.id), x, y: 20 + i * 150 });
    }
    const key = `${e.operation}-${ent.id}`;
    const novel = !knownTargets.includes(ent.id);
    const existing = byKey.get(key);
    if (existing) {
      existing.eventIds.push(e.id);
    } else {
      const edge: GraphEdgeSpec = { id: `e-${key}`, source: "proc", target: ent.id, op: e.operation, eventIds: [e.id], bytes: 0, anomalous: novel };
      byKey.set(key, edge);
      edges.push(edge);
    }
  }
  return { caseId, nodes, edges };
}

export function graphForCase(caseId: string): MovementGraph {
  if (caseId === "CASE-2041") return FLAGSHIP;
  const c = INVESTIGATION_BY_ID[caseId];
  const a = AGENT_BY_ID[c.agentId];
  const evts = caseEvents(caseId).sort((x, y) => x.ts.localeCompare(y.ts));
  return buildGraphFromEvents(caseId, c.agentId, evts, [...a.baseline.knownResources, ...a.baseline.knownDestinations]);
}

/* ---------- Simulated containment proposals ---------- */

export const ACTIONS: ContainmentAction[] = [
  {
    id: "ACT-2041",
    caseId: "CASE-2041",
    title: "Block egress from quant-research-runner to unapproved endpoints",
    target: "quant-ws/research/quant-research-runner",
    effect: "Outbound connections to destinations outside the approved model list would be denied for this workload. Reads from internal datasets continue.",
    reversible: "Auto-expires after 4h unless renewed by an analyst.",
    checks: [
      { label: "Target is a single workload", status: "pass", detail: "Scope limited to one namespace/workload pair." },
      { label: "Does not affect approved model endpoints", status: "pass", detail: "forecast.models.quant-ws.internal remains reachable." },
      { label: "Identity attribution confidence ≥ 0.9", status: "pass", detail: "mi-quant-research attributed at 0.97." },
      { label: "Business-hours impact", status: "warn", detail: "Workload has 2 scheduled jobs in the next 4h." },
    ],
    status: "proposed",
  },
  {
    id: "ACT-2038",
    caseId: "CASE-2038",
    title: "Require approval for transfers to partner-analytics-bucket",
    target: "quant-ws/macro/macro-signal-worker",
    effect: "Transfers to the external bucket would be held for analyst review instead of completing automatically.",
    reversible: "Hold can be released per-transfer or removed entirely.",
    checks: [
      { label: "Target is a single workload", status: "pass", detail: "Scope limited to macro-signal-worker." },
      { label: "Destination owner known", status: "warn", detail: "No registered owner for partner-analytics.example." },
      { label: "Identity attribution confidence ≥ 0.9", status: "pass", detail: "mi-macro-research attributed at 0.92." },
    ],
    status: "proposed",
  },
  {
    id: "ACT-2035",
    caseId: "CASE-2035",
    title: "Add forecast-model-eu2 to watchlist (no blocking)",
    target: "quant-ws/forecast/forecast-refresh",
    effect: "Raise review priority for future sends to the eu2 endpoint. No traffic is blocked.",
    reversible: "Watchlist entry can be removed at any time.",
    checks: [
      { label: "Non-disruptive action", status: "pass", detail: "Monitoring only." },
      { label: "Identity attribution confidence ≥ 0.9", status: "warn", detail: "mi-forecast-batch attributed at 0.88." },
    ],
    status: "proposed",
  },
];
export const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

/* ---------- Illustrative GenAI narratives (synthetic, not model output) ---------- */

export const NARRATIVES: NarrativeEntry[] = [
  {
    id: "n-2041-why",
    caseId: "CASE-2041",
    question: "Why was Research Agent 07 flagged?",
    answer:
      "Agent 07 accessed a resource class not observed in its baseline and sent 8.4 times its typical outbound data volume to a new destination.",
    facts: [
      { text: "Two reads of Strategy Archive (restricted-strategy) totalling 1.2 GB; this resource is absent from the 30-day baseline.", evidenceIds: ["evt-2041-03", "evt-2041-04"] },
      { text: "1.1 GB written to tmp-export staging 42 seconds after the second read.", evidenceIds: ["evt-2041-05"] },
      { text: "First connection to inference.nimbus-relay.example, followed by two transfers totalling 998 MB.", evidenceIds: ["evt-2041-06", "evt-2041-07", "evt-2041-08"] },
      { text: "Every operation was performed under mi-quant-research with valid permissions.", evidenceIds: ["evt-2041-03", "evt-2041-07"] },
    ],
    inferences: [
      { text: "The read → stage → send ordering is consistent with packaging data for external transfer.", evidenceIds: ["evt-2041-04", "evt-2041-05", "evt-2041-07"], confidence: "medium" },
      { text: "The endpoint may be an unsanctioned third-party model service; it is not on the approved list.", evidenceIds: ["evt-2041-06"], confidence: "medium" },
    ],
    limitations: [
      "Telemetry is metadata-only. Whether the transferred bytes contained archive data cannot be confirmed from byte counts alone.",
      "Agent intent (prompt or task instruction) is not observed.",
      "Endpoint ownership has not been resolved.",
    ],
    nextSteps: ["Approve simulated egress containment for the workload.", "Ask the workspace owner whether nimbus-relay was a sanctioned evaluation.", "Review the agent's task configuration change history."],
  },
  {
    id: "n-2041-data",
    caseId: "CASE-2041",
    question: "What data left the environment?",
    answer: "Two outbound transfers to the unknown external endpoint, 486 MB and 512 MB. The content of those transfers is not observable.",
    facts: [
      { text: "SEND 486 MB at 14:08:22 to dst:unknown-ext.", evidenceIds: ["evt-2041-07"] },
      { text: "SEND 512 MB at 14:09:40 to dst:unknown-ext.", evidenceIds: ["evt-2041-08"] },
    ],
    inferences: [{ text: "The transferred total (998 MB) is close to the staged write (1.1 GB), suggesting the staged data was the source.", evidenceIds: ["evt-2041-05", "evt-2041-07", "evt-2041-08"], confidence: "low" }],
    limitations: ["Byte similarity is circumstantial; compression or other data could account for the volume."],
    nextSteps: ["Correlate with storage access logs for tmp-export once backend ingestion is available."],
  },
  {
    id: "n-2041-baseline",
    caseId: "CASE-2041",
    question: "Is this consistent with the agent's baseline?",
    answer: "No. Its baseline consists of small reads from two known resources and sends to two approved model endpoints.",
    facts: [
      { text: "A routine read of Research Feature Store and an approved model connection occurred in the same window.", evidenceIds: ["evt-2041-01", "evt-2041-02"] },
      { text: "Strategy Archive, tmp-export staging and nimbus-relay are all first-seen for this agent.", evidenceIds: ["evt-2041-03", "evt-2041-05", "evt-2041-06"] },
    ],
    inferences: [],
    limitations: ["Baseline covers 30 synthetic days; rarer legitimate workflows may be under-represented."],
    nextSteps: ["Compare with other agents sharing mi-quant-research."],
  },
  {
    id: "n-2038-why",
    caseId: "CASE-2038",
    question: "Why was Research Agent 03 flagged?",
    answer: "Daily transfers to an external bucket have grown for five consecutive days, and a novel dataset read preceded the two largest sends.",
    facts: [
      { text: "Transfers to partner-analytics-bucket: 40 → 60 → 85 → 110 → 140 MB.", evidenceIds: ["evt-2038-02", "evt-2038-03", "evt-2038-05", "evt-2038-07", "evt-2038-09"] },
      { text: "First read of Research Feature Store on 10/07.", evidenceIds: ["evt-2038-06"] },
    ],
    inferences: [{ text: "Pattern resembles staged exfiltration designed to stay under static thresholds.", evidenceIds: ["evt-2038-07", "evt-2038-09"], confidence: "low" }],
    limitations: ["The bucket may belong to a legitimate data partner; ownership is unregistered."],
    nextSteps: ["Hold further transfers pending owner confirmation."],
  },
  {
    id: "n-2035-why",
    caseId: "CASE-2035",
    question: "Is the eu2 endpoint a real risk?",
    answer: "Unclear. The endpoint belongs to an approved model class but this agent has never used it, and it followed a novel dataset read.",
    facts: [
      { text: "New connection to forecast-eu2 after reading Alt-Signals Lake for the first time.", evidenceIds: ["evt-2035-02", "evt-2035-03"] },
      { text: "210 MB sent to the eu2 endpoint.", evidenceIds: ["evt-2035-04"] },
    ],
    inferences: [{ text: "Likely a regional failover or migration, but this has not been verified.", evidenceIds: ["evt-2035-03"], confidence: "low" }],
    limitations: ["No change-management data is available to the demo."],
    nextSteps: ["Watchlist without blocking; confirm with the platform team."],
  },
  {
    id: "n-2029-why",
    caseId: "CASE-2029",
    question: "Why was this closed as benign?",
    answer: "A static volume rule fired, but every read and send involved the agent's only known resource and destination.",
    facts: [
      { text: "512 MB sent to the Internal Report Portal, a known destination.", evidenceIds: ["evt-2029-03", "evt-2029-04"] },
      { text: "Reads only from Quarterly Report Store.", evidenceIds: ["evt-2029-01", "evt-2029-02"] },
    ],
    inferences: [{ text: "Volume aligns with quarter-end reporting seasonality.", evidenceIds: ["evt-2029-03"], confidence: "medium" }],
    limitations: ["Seasonality is inferred from 14 synthetic days of history."],
    nextSteps: ["Add a seasonal exception to the static rule."],
  },
];
