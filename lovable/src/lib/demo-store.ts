import { useSyncExternalStore } from "react";
import type { AuditEntry, ContainmentAction, MovementEvent, RiskLevel } from "@/types";
import { ACTIONS } from "@/fixtures/investigations";
import { SCENARIO_BY_ID } from "@/fixtures/scenarios";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { scoreWindow, THRESHOLDS } from "./detector";

/**
 * Local demonstration state (session-scoped). Holds simulated containment decisions,
 * the demo audit trail, guided-tour progress and the deterministic scenario playback engine.
 */

export interface SimAlert {
  id: string;
  scenarioId: string;
  runId: string;
  score: number;
  level: RiskLevel;
  ts: string;
  linkedCaseId?: string;
}

export interface PlaybackState {
  scenarioId: string;
  runId: string | null;
  elapsed: number;
  status: "idle" | "running" | "paused" | "done";
}

interface DemoState {
  actionStatus: Record<string, ContainmentAction["status"]>;
  audit: AuditEntry[];
  tour: { active: boolean; step: number; seen: boolean };
  playback: PlaybackState;
  alerts: SimAlert[];
  runCounter: number;
}

const KEY = "agentdrift-demo-v1";

const initial = (): DemoState => ({
  actionStatus: Object.fromEntries(ACTIONS.map((a) => [a.id, "proposed"])),
  audit: [
    {
      id: "aud-0001",
      ts: "2026-10-08T14:09:53Z",
      actionId: "ACT-2041",
      caseId: "CASE-2041",
      decision: "proposed",
      actor: "detector (synthetic)",
      note: "Containment proposed after score crossed critical threshold.",
    },
    {
      id: "aud-0002",
      ts: "2026-10-08T12:30:42Z",
      actionId: "ACT-2035",
      caseId: "CASE-2035",
      decision: "proposed",
      actor: "detector (synthetic)",
      note: "Non-blocking watchlist proposed for ambiguous novelty.",
    },
    {
      id: "aud-0003",
      ts: "2026-10-08T10:41:12Z",
      actionId: "ACT-2038",
      caseId: "CASE-2038",
      decision: "proposed",
      actor: "detector (synthetic)",
      note: "Transfer hold proposed for gradual drift.",
    },
  ],
  tour: { active: false, step: 0, seen: false },
  playback: { scenarioId: "read-then-send", runId: null, elapsed: 0, status: "idle" },
  alerts: [],
  runCounter: 0,
});

const SERVER_STATE = initial();
let state: DemoState = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      // Never resume a running timer across reloads.
      if (parsed.playback.status === "running") parsed.playback.status = "paused";
      state = { ...initial(), ...parsed };
    }
  } catch {
    /* ignore */
  }
}

function set(next: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)) {
  const patch = typeof next === "function" ? next(state) : next;
  state = { ...state, ...patch };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useDemo<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return selector(state);
    },
    () => selector(SERVER_STATE),
  );
}

const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const auditId = () => `aud-${String(state.audit.length + 1).padStart(4, "0")}`;

/* ---------- Containment ---------- */

export function decideAction(actionId: string, decision: "approved" | "rejected", note: string) {
  const action = ACTIONS.find((a) => a.id === actionId);
  if (!action) return;
  set((s) => ({
    actionStatus: { ...s.actionStatus, [actionId]: decision },
    audit: [
      {
        id: auditId(),
        ts: nowIso(),
        actionId,
        caseId: action.caseId,
        decision,
        actor: "demo analyst (you)",
        note:
          note ||
          (decision === "approved" ? "Simulated containment approved." : "Proposal rejected."),
      },
      ...s.audit,
    ],
  }));
}

export function resetDemo() {
  const fresh = initial();
  stopTimer();
  set({ ...fresh, tour: { ...fresh.tour, seen: true } });
}

/* ---------- Tour ---------- */

export const TOUR_STEPS = 8;
export function startTour() {
  set({ tour: { active: true, step: 0, seen: true } });
}
export function setTourStep(step: number) {
  set((s) => ({ tour: { ...s.tour, step: Math.max(0, Math.min(TOUR_STEPS - 1, step)) } }));
}
export function endTour() {
  set((s) => ({ tour: { ...s.tour, active: false, seen: true } }));
}

/* ---------- Deterministic playback engine ---------- */

const TICK_MS = 500;
const SECONDS_PER_TICK = 1.5;
let timer: ReturnType<typeof setInterval> | null = null;

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function emittedEvents(p: PlaybackState): MovementEvent[] {
  const sc = SCENARIO_BY_ID[p.scenarioId];
  if (!sc || !p.runId) return [];
  const agent = AGENT_BY_ID[sc.agentId];
  const start = Date.UTC(2026, 9, 8, 15, 0, 0);
  return sc.events
    .filter((e) => e.offset <= p.elapsed)
    .map((e, i) => ({
      id: `${p.runId}-${String(i + 1).padStart(2, "0")}`,
      ts: new Date(start + e.offset * 1000).toISOString().replace(/\.\d+Z$/, "Z"),
      agentId: sc.agentId,
      workloadId: `${agent.namespace}/${agent.workload}`,
      identity: agent.identity,
      operation: e.operation,
      target: e.target,
      bytes: e.bytes,
      identityConfidence: agent.identityConfidence,
      note: e.note,
    }));
}

function tick() {
  const p = state.playback;
  const sc = SCENARIO_BY_ID[p.scenarioId];
  if (!sc || p.status !== "running") return stopTimer();
  const last = sc.events[sc.events.length - 1].offset;
  const elapsed = Math.min(last, p.elapsed + SECONDS_PER_TICK);
  const next: PlaybackState = { ...p, elapsed, status: elapsed >= last ? "done" : "running" };
  const evts = emittedEvents(next);
  const res = scoreWindow(evts, AGENT_BY_ID[sc.agentId]);
  const alreadyAlerted = state.alerts.some((a) => a.runId === p.runId);
  const patch: Partial<DemoState> = { playback: next };
  if (!alreadyAlerted && res.score >= THRESHOLDS.review) {
    patch.alerts = [
      {
        id: `SIM-${p.runId}`,
        scenarioId: sc.id,
        runId: p.runId!,
        score: res.score,
        level: res.level,
        ts: nowIso(),
        linkedCaseId: sc.linkedCaseId,
      },
      ...state.alerts,
    ];
  } else if (alreadyAlerted) {
    patch.alerts = state.alerts.map((a) =>
      a.runId === p.runId ? { ...a, score: res.score, level: res.level } : a,
    );
  }
  set(patch);
  if (next.status === "done") stopTimer();
}

export function selectScenario(scenarioId: string) {
  stopTimer();
  set({ playback: { scenarioId, runId: null, elapsed: 0, status: "idle" } });
}

export function runScenario(scenarioId?: string) {
  stopTimer();
  const id = scenarioId ?? state.playback.scenarioId;
  const n = state.runCounter + 1;
  const runId = `run-${String(n).padStart(3, "0")}`;
  set({
    runCounter: n,
    playback: { scenarioId: id, runId, elapsed: -SECONDS_PER_TICK, status: "running" },
  });
  tick();
  timer = setInterval(tick, TICK_MS);
}

export function pauseScenario() {
  stopTimer();
  set((s) => ({ playback: { ...s.playback, status: "paused" } }));
}

export function resumeScenario() {
  if (state.playback.status !== "paused") return;
  set((s) => ({ playback: { ...s.playback, status: "running" } }));
  stopTimer();
  timer = setInterval(tick, TICK_MS);
}

export function resetScenario() {
  stopTimer();
  set((s) => ({ playback: { ...s.playback, runId: null, elapsed: 0, status: "idle" } }));
}

export function getDemoSnapshot() {
  return state;
}
