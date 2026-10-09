import type { AgentDriftApi } from "./contract";
import { NotFoundError } from "./contract";
import { AGENTS, AGENT_BY_ID } from "@/fixtures/agents";
import { ALL_EVENTS, CASE_EVENTS } from "@/fixtures/events";
import { ACTION_BY_ID, INVESTIGATIONS, INVESTIGATION_BY_ID, NARRATIVES, graphForCase } from "@/fixtures/investigations";
import { SCENARIOS } from "@/fixtures/scenarios";
import { ENTITIES, destClassOf, resourceClassOf } from "@/fixtures/entities";
import { scoreWindow } from "@/lib/detector";
import { decideAction, emittedEvents, getDemoSnapshot, runScenario as startRun } from "@/lib/demo-store";

/** Small deterministic latency so loading states are real but brief. */
function delay<T>(value: T, signal?: AbortSignal, ms = 120): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve(value);
    const t = setTimeout(() => resolve(value), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

function must<T>(v: T | undefined, what: string): T {
  if (!v) throw new NotFoundError(`${what} not found`);
  return v;
}

const caseEvents = (id: string) => CASE_EVENTS.filter((e) => e.caseId === id).sort((a, b) => a.ts.localeCompare(b.ts));

export const mockAdapter: AgentDriftApi = {
  mode: "mock",
  getOverview: (signal) => {
    const since = "2026-10-07T14:10:00Z";
    const recent = ALL_EVENTS.filter((e) => e.ts >= since);
    const novel = new Set(CASE_EVENTS.filter((e) => e.novel && ENTITIES[e.target]?.kind === "endpoint").map((e) => e.target));
    const trend = Array.from({ length: 24 }, (_, h) => {
      const from = new Date(Date.UTC(2026, 9, 7, 15 + h)).toISOString();
      const to = new Date(Date.UTC(2026, 9, 7, 16 + h)).toISOString();
      const bytes = ALL_EVENTS.filter((e) => e.ts >= from && e.ts < to && e.operation === "SEND").reduce((s, e) => s + e.bytes, 0);
      return { t: from.slice(11, 13), bytes };
    });
    return delay(
      {
        monitoredAgents: AGENTS.length,
        openInvestigations: INVESTIGATIONS.filter((c) => c.status !== "closed").length,
        movement24h: recent.reduce((s, e) => s + e.bytes, 0),
        novelDestinations: novel.size,
        movementTrend: trend,
        featuredCaseId: "CASE-2041",
      },
      signal,
    );
  },
  getAgents: (signal) => delay(AGENTS, signal),
  getAgent: (id, signal) => delay(must(AGENT_BY_ID[id], "Agent"), signal),
  getMovementEvents: (f, signal) => {
    const q = f.q?.toLowerCase().trim();
    const rows = ALL_EVENTS.filter((e) => {
      if (f.agentId && e.agentId !== f.agentId) return false;
      if (f.operation && f.operation !== "ALL" && e.operation !== f.operation) return false;
      if (f.destClass && f.destClass !== "ALL" && destClassOf(e.target) !== f.destClass) return false;
      if (f.caseOnly && !e.caseId) return false;
      if (q) {
        const hay = `${e.id} ${e.agentId} ${AGENT_BY_ID[e.agentId]?.name} ${ENTITIES[e.target]?.label} ${resourceClassOf(e.target)} ${e.caseId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return delay(rows, signal);
  },
  getInvestigations: (signal) => delay(INVESTIGATIONS, signal),
  getInvestigation: (id, signal) => delay(must(INVESTIGATION_BY_ID[id], "Investigation"), signal),
  getInvestigationEvidence: (id, signal) => delay(caseEvents(must(INVESTIGATION_BY_ID[id], "Investigation").id), signal),
  getMovementGraph: (id, signal) => delay(graphForCase(must(INVESTIGATION_BY_ID[id], "Investigation").id), signal),
  getScenarios: (signal) => delay(SCENARIOS, signal),
  runScenario: async (scenarioId) => {
    startRun(scenarioId);
    const p = getDemoSnapshot().playback;
    return { runId: p.runId!, scenarioId, startedAt: new Date().toISOString() };
  },
  getScenarioRun: async (runId) => {
    const p = getDemoSnapshot().playback;
    if (p.runId !== runId) throw new NotFoundError("Run not found");
    return { runId, scenarioId: p.scenarioId, startedAt: "" };
  },
  getScenarioEvents: async (runId) => {
    const p = getDemoSnapshot().playback;
    return p.runId === runId ? emittedEvents(p) : [];
  },
  investigateCase: (id, signal) => delay(NARRATIVES.filter((n) => n.caseId === id), signal, 200),
  getDetectionFeatures: (id, signal) => {
    const c = must(INVESTIGATION_BY_ID[id], "Investigation");
    return delay(scoreWindow(caseEvents(id), AGENT_BY_ID[c.agentId]), signal);
  },
  proposeContainment: async (id) => {
    const c = must(INVESTIGATION_BY_ID[id], "Investigation");
    return c.actionId ? ACTION_BY_ID[c.actionId] : null;
  },
  approveContainment: async (actionId, note = "") => decideAction(actionId, "approved", note),
  rejectContainment: async (actionId, note = "") => decideAction(actionId, "rejected", note),
};
