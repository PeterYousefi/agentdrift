import { describe, expect, it } from "vitest";
import { SCENARIO_BY_ID } from "@/fixtures/scenarios";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { emittedEvents } from "@/lib/demo-store";
import { scoreHistory } from "@/lib/story";

const hist = (id: string) => {
  const sc = SCENARIO_BY_ID[id];
  return scoreHistory(sc, AGENT_BY_ID[sc.agentId], (n) =>
    emittedEvents({
      scenarioId: id,
      runId: "t",
      elapsed: sc.events[n - 1].offset,
      status: "running",
    }),
  );
};

describe("scenario story", () => {
  it("normal workflow never opens a case", () => expect(hist("normal").alertIndex).toBe(-1));
  it("read-then-send opens a case before the final event", () => {
    const h = hist("read-then-send");
    expect(h.alertIndex).toBeGreaterThan(0);
    expect(h.alertIndex).toBeLessThan(h.scores.length);
  });
  it("is deterministic across runs", () =>
    expect(hist("read-then-send").scores).toEqual(hist("read-then-send").scores));
});
