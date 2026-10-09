import { test, expect } from "@playwright/test";

test("persisted scenario evidence report and human-approved simulation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Your investigations", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Run live demo →" }).click();
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.getByText(/4 persisted events/)).toBeVisible();
  await page.getByRole("link", { name: "Open investigation →" }).click();
  await page.getByRole("tab", { name: "AI report", exact: true }).click();
  await expect(page.getByText("Deterministic summary · no LLM")).toBeVisible();
  const generated = page.waitForResponse(
    (response) => response.url().endsWith("/report") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Generate AI Analysis" }).click();
  const analysis = await (await generated).json();
  expect(["deterministic", "azure-openai"]).toContain(analysis.generated_by);
  expect(analysis.evidence_fingerprint).toMatch(/^[0-9a-f]{64}$/);
  if (process.env.EXPECT_LIVE_MODEL === "true") expect(analysis.generated_by).toBe("azure-openai");
  await page
    .getByRole("button", { name: /Open cited evidence evt-/ })
    .first()
    .click();
  await expect(page.getByRole("tab", { name: "Evidence", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "AI report", exact: true }).click();
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  if (process.env.CAPTURE_DEMO === "true")
    await page.screenshot({ path: "../docs/assets/investigation.png", fullPage: true });
  await page.locator(".react-flow__node").first().click();
  await page
    .getByRole("tab", { name: /containment/i })
    .first()
    .click();
  const approve = page.getByRole("button", { name: "Approve simulated containment" });
  await expect(approve).toBeVisible();
  await approve.click();
  await expect(page.getByText(/Approved. The synthetic case/)).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Containment", exact: true }).click();
  await expect(page.getByText(/Approved. The synthetic case/)).toBeVisible();
  await page.goto("/response");
  await expect(page.getByText(/simulated-execution/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("public policy, provenance and visitor isolation", async ({ request }) => {
  const base =
    process.env.E2E_API_BASE_URL ??
    (process.env.E2E_BASE_URL?.includes("azurewebsites.net")
      ? "https://agentdrift-api.icydune-d7187e3c.canadacentral.azurecontainerapps.io/api/v1"
      : "http://127.0.0.1:8000/api/v1");
  const first = await request.post(`${base}/sessions`);
  const second = await request.post(`${base}/sessions`);
  const headers = { "X-Demo-Session": (await first.json()).token };
  const other = { "X-Demo-Session": (await second.json()).token };
  const start = async (scenario: string) => {
    const response = await request.post(`${base}/scenarios/${scenario}/runs`, {
      headers,
      data: { rate: 1000 },
    });
    expect(response.ok()).toBeTruthy();
    const run = await response.json();
    await expect
      .poll(
        async () =>
          (await (await request.get(`${base}/scenario-runs/${run.runId}`, { headers })).json())
            .status,
      )
      .toBe("done");
    return (await request.get(`${base}/scenario-runs/${run.runId}`, { headers })).json();
  };
  expect((await start("benign-unusual")).caseId).toBeNull();
  const run = await start("read-then-send");
  const path = `${base}/investigations/${run.caseId}`;
  expect((await request.get(path, { headers: other })).status()).toBe(404);
  const events = await (await request.get(`${path}/evidence`, { headers })).json();
  expect(events.map((e: { ts: string }) => e.ts)).toEqual(
    events.map((e: { ts: string }) => e.ts).sort(),
  );
  const graph = await (await request.get(`${path}/graph`, { headers })).json();
  for (const edge of graph.edges) {
    const event = events.find((e: { id: string }) => e.id === edge.eventIds[0]);
    expect([edge.source, edge.target]).toEqual(
      event.operation === "READ" ? [event.target, event.agentId] : [event.agentId, event.target],
    );
  }
  const report = await (await request.post(`${path}/report`, { headers })).json();
  const ids = new Set(events.map((e: { id: string }) => e.id));
  for (const id of report.evidence_citations) expect(ids.has(id)).toBeTruthy();
  for (const claim of [...report.observed_facts, ...report.detector_findings, ...report.hypotheses])
    for (const id of claim.evidence_ids) expect(ids.has(id)).toBeTruthy();
  const action = await (await request.post(`${path}/containment`, { headers })).json();
  expect(action.simulatedOnly).toBe(true);
  expect(
    (
      await request.post(`${base}/containment/${action.id}/reject`, { headers: other, data: {} })
    ).status(),
  ).toBe(404);
  const rejected = await (
    await request.post(`${base}/containment/${action.id}/reject`, { headers, data: {} })
  ).json();
  expect(rejected.audit.map((row: { decision: string }) => row.decision)).toEqual([
    "proposed",
    "rejected",
  ]);
  expect(
    (
      await request.post(`${base}/containment/${action.id}/approve`, { headers, data: {} })
    ).status(),
  ).toBe(409);
});

test("baseline route shows actual training span", async ({ page }) => {
  await page.goto("/agents/ag-07");
  await expect(page.getByText(/40 training samples · 6h 30m span · UTC/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Historical outbound training samples/ }),
  ).toBeVisible();
  await expect(page.getByText(/14 days/)).toHaveCount(0);
});
