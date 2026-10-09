import type {
  Agent,
  ContainmentAction,
  DetectorResult,
  Investigation,
  MovementEvent,
  MovementFilters,
  MovementGraph,
  NarrativeEntry,
  Overview,
  Scenario,
  ScenarioRun,
} from "@/types";

/**
 * Proposed AgentDrift application contract (not an existing public API).
 * The mock adapter implements it with deterministic fixtures; the HTTP adapter
 * targets the future FastAPI service at VITE_API_BASE_URL.
 */
export interface AgentDriftApi {
  mode: "mock" | "http";
  getOverview(signal?: AbortSignal): Promise<Overview>;
  getAgents(signal?: AbortSignal): Promise<Agent[]>;
  getAgent(agentId: string, signal?: AbortSignal): Promise<Agent>;
  getMovementEvents(filters: MovementFilters, signal?: AbortSignal): Promise<MovementEvent[]>;
  getInvestigations(signal?: AbortSignal): Promise<Investigation[]>;
  getInvestigation(caseId: string, signal?: AbortSignal): Promise<Investigation>;
  getInvestigationEvidence(caseId: string, signal?: AbortSignal): Promise<MovementEvent[]>;
  getMovementGraph(caseId: string, signal?: AbortSignal): Promise<MovementGraph>;
  getScenarios(signal?: AbortSignal): Promise<Scenario[]>;
  runScenario(scenarioId: string): Promise<ScenarioRun>;
  getScenarioRun(runId: string): Promise<ScenarioRun>;
  getScenarioEvents(runId: string): Promise<MovementEvent[]>;
  investigateCase(caseId: string, signal?: AbortSignal): Promise<NarrativeEntry[]>;
  getDetectionFeatures(caseId: string, signal?: AbortSignal): Promise<DetectorResult>;
  proposeContainment(caseId: string): Promise<ContainmentAction | null>;
  approveContainment(actionId: string, note?: string): Promise<void>;
  rejectContainment(actionId: string, note?: string): Promise<void>;
}

export class NotFoundError extends Error {}
