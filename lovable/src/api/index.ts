import { queryOptions } from "@tanstack/react-query";
import type { AgentDriftApi } from "./contract";
import { mockAdapter } from "./mock-adapter";
import { createHttpAdapter } from "./http-adapter";
import type { MovementFilters } from "@/types";

const BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const DEMO = (import.meta.env.VITE_DEMO_MODE as string | undefined) ?? "true";

/** Demo mode is the default. Live mode requires VITE_DEMO_MODE=false and VITE_API_BASE_URL. */
export const api: AgentDriftApi = DEMO !== "false" || !BASE ? mockAdapter : createHttpAdapter(BASE);
export const isDemoMode = api.mode === "mock";

export const q = {
  overview: () => queryOptions({ queryKey: ["overview"], queryFn: ({ signal }) => api.getOverview(signal) }),
  agents: () => queryOptions({ queryKey: ["agents"], queryFn: ({ signal }) => api.getAgents(signal) }),
  agent: (id: string) => queryOptions({ queryKey: ["agent", id], queryFn: ({ signal }) => api.getAgent(id, signal) }),
  events: (f: MovementFilters) => queryOptions({ queryKey: ["events", f], queryFn: ({ signal }) => api.getMovementEvents(f, signal) }),
  investigations: () => queryOptions({ queryKey: ["investigations"], queryFn: ({ signal }) => api.getInvestigations(signal) }),
  investigation: (id: string) => queryOptions({ queryKey: ["investigation", id], queryFn: ({ signal }) => api.getInvestigation(id, signal) }),
  evidence: (id: string) => queryOptions({ queryKey: ["evidence", id], queryFn: ({ signal }) => api.getInvestigationEvidence(id, signal) }),
  graph: (id: string) => queryOptions({ queryKey: ["graph", id], queryFn: ({ signal }) => api.getMovementGraph(id, signal) }),
  features: (id: string) => queryOptions({ queryKey: ["features", id], queryFn: ({ signal }) => api.getDetectionFeatures(id, signal) }),
  narrative: (id: string) => queryOptions({ queryKey: ["narrative", id], queryFn: ({ signal }) => api.investigateCase(id, signal) }),
  scenarios: () => queryOptions({ queryKey: ["scenarios"], queryFn: ({ signal }) => api.getScenarios(signal) }),
};

export type { AgentDriftApi };
