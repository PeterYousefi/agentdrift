import { z } from "zod";

/* Typed API boundary. Schemas validate responses from the live HTTP adapter. */

export const OperationSchema = z.enum(["READ", "WRITE", "CONNECT", "SEND"]);
export type Operation = z.infer<typeof OperationSchema>;

export const RiskSchema = z.enum(["normal", "review", "elevated", "critical"]);
export type RiskLevel = z.infer<typeof RiskSchema>;

export const DestClassSchema = z.enum([
  "internal",
  "approved-model",
  "staging",
  "external-unknown",
]);
export type DestinationClass = z.infer<typeof DestClassSchema>;

export const EntityKindSchema = z.enum([
  "agent",
  "process",
  "identity",
  "resource",
  "endpoint",
  "staging",
]);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  workload: z.string(),
  namespace: z.string(),
  identity: z.string(),
  identityConfidence: z.number(),
  baselineState: z.enum(["stable", "learning", "drifting"]),
  lastActivity: z.string(),
  outbound24h: z.number(),
  risk: RiskSchema,
  destinationDiversity: z.number(),
  baseline: z.object({
    avgReadBytes: z.number(),
    avgSendBytes: z.number(),
    knownResources: z.array(z.string()),
    knownDestinations: z.array(z.string()),
  }),
  history: z.array(z.object({ day: z.string(), sent: z.number(), read: z.number() })),
  caseIds: z.array(z.string()),
});
export type Agent = z.infer<typeof AgentSchema>;

export const MovementEventSchema = z.object({
  id: z.string(),
  ts: z.string(),
  agentId: z.string(),
  workloadId: z.string(),
  identity: z.string(),
  operation: OperationSchema,
  target: z.string(),
  bytes: z.number(),
  identityConfidence: z.number(),
  caseId: z.string().optional(),
  novel: z.boolean().optional(),
  note: z.string().optional(),
});
export type MovementEvent = z.infer<typeof MovementEventSchema>;

export const InvestigationSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  agentId: z.string(),
  status: z.enum(["open", "triage", "contained", "closed"]),
  severity: RiskSchema,
  openedAt: z.string(),
  score: z.number(),
  summary: z.string(),
  evidenceIds: z.array(z.string()),
  actionId: z.string().optional(),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

export interface Entity {
  id: string;
  label: string;
  kind: EntityKind;
  cls: string;
  host?: string;
  destClass?: DestinationClass;
}

export interface DetectorFeature {
  key: "volume" | "destNovelty" | "resourceNovelty" | "sequence";
  label: string;
  observed: string;
  baseline: string;
  raw: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface DetectorResult {
  score: number;
  level: RiskLevel;
  features: DetectorFeature[];
  sentBytes: number;
  readBytes: number;
  volumeRatio: number;
}

export interface GraphNodeSpec {
  id: string;
  kind: EntityKind;
  label: string;
  sub: string;
  novel?: boolean;
  x: number;
  y: number;
}

export interface GraphEdgeSpec {
  id: string;
  source: string;
  target: string;
  op: Operation | "ATTR";
  eventIds: string[];
  bytes: number;
  anomalous: boolean;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface MovementGraph {
  caseId: string;
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
}

export interface PolicyCheck {
  label: string;
  status: "pass" | "warn";
  detail: string;
}

export interface ContainmentAction {
  id: string;
  caseId: string;
  title: string;
  target: string;
  effect: string;
  reversible: string;
  checks: PolicyCheck[];
  status: "proposed" | "approved" | "rejected";
}

export interface AuditEntry {
  id: string;
  ts: string;
  actionId: string;
  caseId: string;
  decision: "approved" | "rejected" | "proposed" | "reset";
  actor: string;
  note: string;
}

export interface NarrativeClaim {
  text: string;
  evidenceIds: string[];
  confidence?: "low" | "medium" | "high";
}

export interface NarrativeEntry {
  id: string;
  caseId: string;
  question: string;
  answer: string;
  facts: NarrativeClaim[];
  inferences: NarrativeClaim[];
  limitations: string[];
  nextSteps: string[];
}

export interface Overview {
  monitoredAgents: number;
  openInvestigations: number;
  movement24h: number;
  novelDestinations: number;
  movementTrend: { t: string; bytes: number }[];
  featuredCaseId: string;
}

export interface MovementFilters {
  q?: string;
  agentId?: string;
  operation?: Operation | "ALL";
  destClass?: DestinationClass | "ALL";
  caseOnly?: boolean;
}

export interface ScenarioEventSpec {
  offset: number; // seconds into the run
  operation: Operation;
  target: string;
  bytes: number;
  note?: string;
}

export interface Scenario {
  id: string;
  index: number;
  name: string;
  agentId: string;
  description: string;
  expected: string;
  expectedLevel: RiskLevel;
  linkedCaseId?: string;
  events: ScenarioEventSpec[];
}

export interface ScenarioRun {
  runId: string;
  scenarioId: string;
  startedAt: string;
}
