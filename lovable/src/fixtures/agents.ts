import type { Agent } from "@/types";
import { MB, mulberry32 } from "@/lib/format";

/** SYNTHETIC agents. All names, identities and workloads are fictional. */

function history(seed: number, sent: number, read: number, shape: (i: number) => number = () => 1) {
  const r = mulberry32(seed);
  return Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 8, 25 + i)).toISOString().slice(0, 10);
    const j = 0.8 + r() * 0.4;
    return { day, sent: Math.round(sent * j * shape(i)), read: Math.round(read * (0.85 + r() * 0.3)) };
  });
}

type Base = Omit<Agent, "history">;

const base: (Base & { hist: Agent["history"] })[] = [
  {
    id: "ag-07",
    name: "Research Agent 07",
    description: "Quantitative research assistant. Pulls feature sets and calls the approved forecast model to draft signal studies.",
    workload: "quant-research-runner",
    namespace: "quant-ws/research",
    identity: "mi-quant-research",
    identityConfidence: 0.97,
    baselineState: "stable",
    lastActivity: "2026-10-08T14:09:40Z",
    outbound24h: 1131 * MB,
    risk: "critical",
    destinationDiversity: 3,
    baseline: {
      avgReadBytes: 44 * MB,
      avgSendBytes: 118.8 * MB,
      knownResources: ["res:research-features", "res:market-ticks"],
      knownDestinations: ["dst:forecast-model", "dst:embeddings"],
    },
    caseIds: ["CASE-2041"],
    hist: history(7, 118.8 * MB * 3, 44 * MB * 4, (i) => (i === 13 ? 3.2 : 1)),
  },
  {
    id: "ag-03",
    name: "Research Agent 03",
    description: "Cross-asset research agent that summarizes alternative signals for the macro desk.",
    workload: "macro-signal-worker",
    namespace: "quant-ws/macro",
    identity: "mi-macro-research",
    identityConfidence: 0.92,
    baselineState: "drifting",
    lastActivity: "2026-10-08T13:41:02Z",
    outbound24h: 402 * MB,
    risk: "elevated",
    destinationDiversity: 3,
    baseline: {
      avgReadBytes: 60 * MB,
      avgSendBytes: 75 * MB,
      knownResources: ["res:signals-lake", "res:market-ticks"],
      knownDestinations: ["dst:forecast-model", "dst:embeddings"],
    },
    caseIds: ["CASE-2038"],
    hist: history(3, 75 * MB * 3, 60 * MB * 3, (i) => 1 + Math.max(0, i - 4) * 0.18),
  },
  {
    id: "ag-12",
    name: "Forecast Agent 12",
    description: "Runs nightly forecast refreshes against approved model endpoints.",
    workload: "forecast-refresh",
    namespace: "quant-ws/forecast",
    identity: "mi-forecast-batch",
    identityConfidence: 0.88,
    baselineState: "stable",
    lastActivity: "2026-10-08T12:30:15Z",
    outbound24h: 236 * MB,
    risk: "review",
    destinationDiversity: 2,
    baseline: {
      avgReadBytes: 80 * MB,
      avgSendBytes: 110 * MB,
      knownResources: ["res:research-features"],
      knownDestinations: ["dst:forecast-model"],
    },
    caseIds: ["CASE-2035"],
    hist: history(12, 110 * MB * 2, 80 * MB * 2),
  },
  {
    id: "ag-05",
    name: "Reporting Agent 05",
    description: "Assembles quarterly performance reports for internal stakeholders.",
    workload: "report-builder",
    namespace: "quant-ws/reporting",
    identity: "mi-reporting",
    identityConfidence: 0.99,
    baselineState: "stable",
    lastActivity: "2026-10-08T11:05:51Z",
    outbound24h: 512 * MB,
    risk: "normal",
    destinationDiversity: 1,
    baseline: {
      avgReadBytes: 90 * MB,
      avgSendBytes: 96 * MB,
      knownResources: ["res:report-store"],
      knownDestinations: ["dst:report-portal"],
    },
    caseIds: ["CASE-2029"],
    hist: history(5, 96 * MB * 2, 90 * MB * 2, (i) => (i >= 12 ? 2.6 : 1)),
  },
  {
    id: "ag-09",
    name: "Research Agent 09",
    description: "Prototype agent for factor discovery. Reads market tick cache only.",
    workload: "factor-lab",
    namespace: "quant-ws/research",
    identity: "mi-quant-research",
    identityConfidence: 0.81,
    baselineState: "learning",
    lastActivity: "2026-10-08T13:58:20Z",
    outbound24h: 61 * MB,
    risk: "normal",
    destinationDiversity: 1,
    baseline: {
      avgReadBytes: 35 * MB,
      avgSendBytes: 30 * MB,
      knownResources: ["res:market-ticks"],
      knownDestinations: ["dst:embeddings"],
    },
    caseIds: [],
    hist: history(9, 30 * MB * 2, 35 * MB * 3),
  },
  {
    id: "ag-14",
    name: "Embedding Agent 14",
    description: "Builds embeddings for internal research notes metadata.",
    workload: "embed-indexer",
    namespace: "quant-ws/platform",
    identity: "mi-platform-embed",
    identityConfidence: 0.95,
    baselineState: "stable",
    lastActivity: "2026-10-08T14:01:12Z",
    outbound24h: 188 * MB,
    risk: "normal",
    destinationDiversity: 1,
    baseline: {
      avgReadBytes: 50 * MB,
      avgSendBytes: 62 * MB,
      knownResources: ["res:research-features"],
      knownDestinations: ["dst:embeddings"],
    },
    caseIds: [],
    hist: history(14, 62 * MB * 3, 50 * MB * 3),
  },
];

export const AGENTS: Agent[] = base.map(({ hist, ...a }) => ({ ...a, history: hist }));
export const AGENT_BY_ID: Record<string, Agent> = Object.fromEntries(AGENTS.map((a) => [a.id, a]));
