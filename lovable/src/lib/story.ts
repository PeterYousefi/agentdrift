import type { Agent, MovementEvent, Scenario } from "@/types";
import { scoreWindow, THRESHOLDS } from "./detector";

/** Narrative stages of a scenario playback, derived deterministically from scenario events. */
export const STAGES = [
  { key: "baseline", label: "Normal baseline" },
  { key: "access", label: "Unusual access" },
  { key: "staging", label: "Staging" },
  { key: "outbound", label: "Unusual outbound" },
  { key: "detection", label: "Detection" },
  { key: "investigation", label: "Investigation" },
  { key: "response", label: "Human-approved response" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];

export function stageForEvent(
  e: Scenario["events"][number],
  agent: Pick<Agent, "baseline">,
): StageKey {
  const known = [...agent.baseline.knownResources, ...agent.baseline.knownDestinations].includes(
    e.target,
  );
  if (e.operation === "WRITE") return "staging";
  if (known) return "baseline";
  return e.operation === "READ" ? "access" : "outbound";
}

/** Score after each event prefix, plus index of the event at which review threshold is first crossed. */
export function scoreHistory(sc: Scenario, agent: Agent, toEvent: (n: number) => MovementEvent[]) {
  const scores = sc.events.map((_, i) => scoreWindow(toEvent(i + 1), agent).score);
  const alertIndex = scores.findIndex((s) => s >= THRESHOLDS.review);
  return { scores, alertIndex };
}
