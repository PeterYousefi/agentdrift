import { z } from "zod";
import type { AgentDriftApi } from "./contract";
import { AgentSchema, InvestigationSchema, MovementEventSchema } from "@/types";

/**
 * HTTP adapter for the future FastAPI backend. Paths are the proposed contract.
 * No credentials are held in the browser — the backend owns all cloud/service secrets.
 */
export function createHttpAdapter(baseUrl: string): AgentDriftApi {
  const base = baseUrl.replace(/\/$/, "");

  async function req<T>(path: string, schema: z.ZodType<T> | null, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`AgentDrift API ${res.status} on ${path}`);
    const json = res.status === 204 ? null : await res.json();
    return schema ? schema.parse(json) : (json as T);
  }
  const get = <T>(p: string, s: z.ZodType<T> | null, signal?: AbortSignal) => req(p, s, { signal });
  const post = <T>(p: string, body?: unknown) => req<T>(p, null, { method: "POST", body: body ? JSON.stringify(body) : undefined });

  return {
    mode: "http",
    getOverview: (signal) => get("/overview", null, signal),
    getAgents: (signal) => get("/agents", z.array(AgentSchema), signal),
    getAgent: (id, signal) => get(`/agents/${encodeURIComponent(id)}`, AgentSchema, signal),
    getMovementEvents: (f, signal) => {
      const qs = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => v !== undefined && v !== "ALL" && qs.set(k, String(v)));
      return get(`/movement-events?${qs}`, z.array(MovementEventSchema), signal);
    },
    getInvestigations: (signal) => get("/investigations", z.array(InvestigationSchema), signal),
    getInvestigation: (id, signal) => get(`/investigations/${id}`, InvestigationSchema, signal),
    getInvestigationEvidence: (id, signal) => get(`/investigations/${id}/evidence`, z.array(MovementEventSchema), signal),
    getMovementGraph: (id, signal) => get(`/investigations/${id}/graph`, null, signal),
    getScenarios: (signal) => get("/scenarios", null, signal),
    runScenario: (id) => post(`/scenarios/${id}/runs`),
    getScenarioRun: (runId) => get(`/scenario-runs/${runId}`, null),
    getScenarioEvents: (runId) => get(`/scenario-runs/${runId}/events`, z.array(MovementEventSchema)),
    investigateCase: (id) => post(`/investigations/${id}/investigate`),
    getDetectionFeatures: (id, signal) => get(`/investigations/${id}/features`, null, signal),
    proposeContainment: (id) => post(`/investigations/${id}/containment`),
    approveContainment: (actionId, note) => post(`/containment/${actionId}/approve`, { note }),
    rejectContainment: (actionId, note) => post(`/containment/${actionId}/reject`, { note }),
  };
}
