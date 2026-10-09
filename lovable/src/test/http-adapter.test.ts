import { afterEach, expect, it, vi } from "vitest";
import { createHttpAdapter } from "@/api/http-adapter";

afterEach(() => vi.unstubAllGlobals());

it("shares one opaque session across concurrent API adapters", async () => {
  sessionStorage.clear();
  const token = "x".repeat(43);
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(JSON.stringify(url.endsWith("/sessions") ? { token } : []), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetcher);
  await Promise.all([
    createHttpAdapter("https://demo/api").getAgents(),
    createHttpAdapter("https://demo/api").getInvestigations(),
  ]);
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith("/sessions"))).toHaveLength(1);
  expect(sessionStorage.getItem("agentdrift-session")).toBe(token);
});

it("surfaces API failure instead of substituting fixture results", async () => {
  sessionStorage.setItem("agentdrift-session", "x".repeat(43));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("unavailable", { status: 503 })),
  );
  await expect(createHttpAdapter("https://demo/api").getInvestigations()).rejects.toThrow("503");
});
