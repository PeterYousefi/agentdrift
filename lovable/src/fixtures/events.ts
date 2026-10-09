import type { MovementEvent, Operation } from "@/types";
import { AGENTS, AGENT_BY_ID } from "./agents";
import { KB, MB_ } from "./units";
import { mulberry32 } from "@/lib/format";

/** SYNTHETIC metadata-only movement events. No contents, prompts or completions. */

function ev(
  id: string,
  ts: string,
  agentId: string,
  operation: Operation,
  target: string,
  bytes: number,
  extra: Partial<MovementEvent> = {},
): MovementEvent {
  const a = AGENT_BY_ID[agentId];
  return {
    id,
    ts,
    agentId,
    workloadId: `${a.namespace}/${a.workload}`,
    identity: a.identity,
    operation,
    target,
    bytes,
    identityConfidence: a.identityConfidence,
    ...extra,
  };
}

export const CASE_EVENTS: MovementEvent[] = [
  // CASE-2041 — sensitive read then send (flagship)
  ev("evt-2041-01", "2026-10-08T14:02:11Z", "ag-07", "READ", "res:research-features", 42 * MB_, {
    caseId: "CASE-2041",
    note: "Routine read of a known research dataset. Consistent with baseline; included for sequence context.",
  }),
  ev("evt-2041-02", "2026-10-08T14:03:05Z", "ag-07", "CONNECT", "dst:forecast-model", 4 * KB, {
    caseId: "CASE-2041",
    note: "Session to the approved forecast model. Expected behavior.",
  }),
  ev("evt-2041-03", "2026-10-08T14:04:48Z", "ag-07", "READ", "res:strategy-archive", 612 * MB_, {
    caseId: "CASE-2041",
    novel: true,
    note: "First observed access to the restricted Strategy Archive class. Permission was valid, but the resource has never appeared in this agent's 30-day baseline.",
  }),
  ev("evt-2041-04", "2026-10-08T14:05:30Z", "ag-07", "READ", "res:strategy-archive", 588 * MB_, {
    caseId: "CASE-2041",
    novel: true,
    note: "Second bulk read 42s later. Combined read volume is ~27× the agent's typical per-window read.",
  }),
  ev("evt-2041-05", "2026-10-08T14:06:12Z", "ag-07", "WRITE", "stg:tmp-export", 1126 * MB_, {
    caseId: "CASE-2041",
    novel: true,
    note: "Data written to a staging location roughly equal to the archive reads — consistent with packaging prior to transfer.",
  }),
  ev("evt-2041-06", "2026-10-08T14:07:40Z", "ag-07", "CONNECT", "dst:unknown-ext", 6 * KB, {
    caseId: "CASE-2041",
    novel: true,
    note: "First connection to an external endpoint not on the approved model list.",
  }),
  ev("evt-2041-07", "2026-10-08T14:08:22Z", "ag-07", "SEND", "dst:unknown-ext", 486 * MB_, {
    caseId: "CASE-2041",
    novel: true,
    note: "Outbound transfer to the unfamiliar endpoint. Alone this exceeds 4× the typical per-window outbound volume.",
  }),
  ev("evt-2041-08", "2026-10-08T14:09:40Z", "ag-07", "SEND", "dst:unknown-ext", 512 * MB_, {
    caseId: "CASE-2041",
    novel: true,
    note: "Second transfer completes the read → stage → send sequence. Window total: 998 MB, 8.4× baseline.",
  }),

  // CASE-2038 — gradual low-and-slow drift
  ev("evt-2038-01", "2026-10-04T10:12:03Z", "ag-03", "READ", "res:signals-lake", 60 * MB_, {
    caseId: "CASE-2038",
    note: "Known resource; normal read.",
  }),
  ev("evt-2038-02", "2026-10-04T10:20:44Z", "ag-03", "SEND", "dst:partner-bucket", 40 * MB_, {
    caseId: "CASE-2038",
    novel: true,
    note: "First small transfer to an external bucket not in baseline.",
  }),
  ev("evt-2038-03", "2026-10-05T10:18:27Z", "ag-03", "SEND", "dst:partner-bucket", 60 * MB_, {
    caseId: "CASE-2038",
    novel: true,
    note: "Volume increases day-over-day.",
  }),
  ev("evt-2038-04", "2026-10-06T10:09:51Z", "ag-03", "READ", "res:signals-lake", 62 * MB_, {
    caseId: "CASE-2038",
  }),
  ev("evt-2038-05", "2026-10-06T10:31:15Z", "ag-03", "SEND", "dst:partner-bucket", 85 * MB_, {
    caseId: "CASE-2038",
    novel: true,
  }),
  ev("evt-2038-06", "2026-10-07T10:02:40Z", "ag-03", "READ", "res:research-features", 90 * MB_, {
    caseId: "CASE-2038",
    novel: true,
    note: "First read of the Research Feature Store by this agent.",
  }),
  ev("evt-2038-07", "2026-10-07T10:26:09Z", "ag-03", "SEND", "dst:partner-bucket", 110 * MB_, {
    caseId: "CASE-2038",
    novel: true,
  }),
  ev("evt-2038-08", "2026-10-08T10:22:58Z", "ag-03", "READ", "res:signals-lake", 58 * MB_, {
    caseId: "CASE-2038",
  }),
  ev("evt-2038-09", "2026-10-08T10:40:31Z", "ag-03", "SEND", "dst:partner-bucket", 140 * MB_, {
    caseId: "CASE-2038",
    novel: true,
    note: "Fifth consecutive daily transfer; each individually below static thresholds.",
  }),

  // CASE-2035 — ambiguous: new region of an approved model class
  ev("evt-2035-01", "2026-10-08T12:20:02Z", "ag-12", "READ", "res:research-features", 82 * MB_, {
    caseId: "CASE-2035",
  }),
  ev("evt-2035-02", "2026-10-08T12:24:37Z", "ag-12", "READ", "res:signals-lake", 40 * MB_, {
    caseId: "CASE-2035",
    novel: true,
    note: "Resource not previously used by this agent.",
  }),
  ev("evt-2035-03", "2026-10-08T12:26:10Z", "ag-12", "CONNECT", "dst:forecast-model-eu2", 5 * KB, {
    caseId: "CASE-2035",
    novel: true,
    note: "New regional deployment of an approved model class.",
  }),
  ev("evt-2035-04", "2026-10-08T12:28:44Z", "ag-12", "SEND", "dst:forecast-model-eu2", 210 * MB_, {
    caseId: "CASE-2035",
    novel: true,
  }),
  ev("evt-2035-05", "2026-10-08T12:30:15Z", "ag-12", "SEND", "dst:forecast-model", 20 * MB_, {
    caseId: "CASE-2035",
  }),

  // CASE-2029 — benign quarter-end reporting spike
  ev("evt-2029-01", "2026-10-08T10:50:12Z", "ag-05", "READ", "res:report-store", 240 * MB_, {
    caseId: "CASE-2029",
  }),
  ev("evt-2029-02", "2026-10-08T10:55:48Z", "ag-05", "READ", "res:report-store", 260 * MB_, {
    caseId: "CASE-2029",
  }),
  ev("evt-2029-03", "2026-10-08T11:01:33Z", "ag-05", "SEND", "dst:report-portal", 250 * MB_, {
    caseId: "CASE-2029",
    note: "Large but to the agent's only known destination.",
  }),
  ev("evt-2029-04", "2026-10-08T11:05:51Z", "ag-05", "SEND", "dst:report-portal", 262 * MB_, {
    caseId: "CASE-2029",
  }),
];

function baselineEvents(): MovementEvent[] {
  const out: MovementEvent[] = [];
  AGENTS.forEach((a, ai) => {
    const r = mulberry32(100 + ai);
    const num = a.id.slice(3);
    for (let d = 1; d <= 7; d++) {
      const day = `2026-10-0${d}`;
      for (let n = 0; n < 4; n++) {
        const hour = String(8 + n * 2 + Math.floor(r() * 2)).padStart(2, "0");
        const min = String(Math.floor(r() * 60)).padStart(2, "0");
        const sec = String(Math.floor(r() * 60)).padStart(2, "0");
        const ts = `${day}T${hour}:${min}:${sec}Z`;
        const isSend = n % 2 === 1;
        const pool = isSend ? a.baseline.knownDestinations : a.baseline.knownResources;
        const target = pool[Math.floor(r() * pool.length)];
        const avg = isSend ? a.baseline.avgSendBytes / 1.5 : a.baseline.avgReadBytes;
        const bytes = Math.round(avg * (0.6 + r() * 0.8));
        out.push(ev(`evt-${num}-d${d}${n}`, ts, a.id, isSend ? "SEND" : "READ", target, bytes));
      }
    }
  });
  return out;
}

export const BASELINE_EVENTS = baselineEvents();

export const ALL_EVENTS: MovementEvent[] = [...BASELINE_EVENTS, ...CASE_EVENTS].sort((a, b) =>
  b.ts.localeCompare(a.ts),
);
export const EVENT_BY_ID: Record<string, MovementEvent> = Object.fromEntries(
  ALL_EVENTS.map((e) => [e.id, e]),
);
