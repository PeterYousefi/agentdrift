import { describe, expect, it } from "vitest";
import { INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import { SCENARIOS } from "@/fixtures/scenarios";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { scoreWindow } from "@/lib/detector";
import { emittedEvents } from "@/lib/demo-store";

describe("detector", () => {
  it("flagship case is critical with 8.4x outbound", () => {
    const c = INVESTIGATION_BY_ID["CASE-2041"];
    expect(c.severity).toBe("critical");
  });
  it("benign quarter-end case scores normal", () => {
    expect(INVESTIGATION_BY_ID["CASE-2029"].severity).toBe("normal");
  });
  it.each(SCENARIOS.map((s) => [s.id, s] as const))("scenario %s ends at its expected level", (_, s) => {
    const evts = emittedEvents({ scenarioId: s.id, runId: "t", elapsed: 999, status: "done" });
    expect(scoreWindow(evts, AGENT_BY_ID[s.agentId]).level).toBe(s.expectedLevel);
  });
});
