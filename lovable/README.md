# AgentDrift — AI-agent data-movement investigation (frontend)

Independent educational work-sample prototype. **All data is synthetic.** Not affiliated with or endorsed by Hilt.

## Run
```
npm install
npm run dev
npm run build
```

## Environment
| Var | Default | Meaning |
|---|---|---|
| `VITE_DEMO_MODE` | `true` | `false` switches to the HTTP adapter |
| `VITE_API_BASE_URL` | — | FastAPI base URL (required for live mode) |

No secrets live in the browser. Azure OpenAI and all cloud credentials belong to the backend.

## Structure
- `src/routes/` — pages (TanStack Router file routes): `/` overview, `/investigations/$caseId` workspace, `/agents`, `/movement`, `/detection`, `/playground`, `/investigator`, `/response`, `/about`
- `src/api/contract.ts` — typed `AgentDriftApi` contract; `mock-adapter.ts` (fixtures), `http-adapter.ts` (Zod-validated fetch), `index.ts` (adapter selection + query options)
- `src/fixtures/` — deterministic synthetic agents, events, cases, graphs, narratives, scenarios
- `src/lib/detector.ts` — demo behavioral detector (4 weighted features, thresholds)
- `src/lib/demo-store.ts` — session-scoped demo state: containment decisions, audit trail, tour, playback engine
- `src/components/` — `design-system`, `movement-graph` (React Flow), `investigation`, `evidence`, `charts`, `navigation`, `tour`

## Backend contract (proposed)
`GET /overview, /agents, /agents/{id}, /movement-events, /investigations, /investigations/{id}, /investigations/{id}/evidence, /investigations/{id}/graph, /investigations/{id}/features, /scenarios, /scenario-runs/{id}, /scenario-runs/{id}/events` ·
`POST /scenarios/{id}/runs, /investigations/{id}/investigate, /investigations/{id}/containment, /containment/{id}/approve, /containment/{id}/reject`

## Notes
- Routing uses TanStack Router (the platform's fixed router) instead of React Router.
- For Azure Static Web Apps, deploy the client build with a `navigationFallback` to `index.html`, or host SSR output on a worker/Node runtime.
- Evaluation metrics intentionally show "Not yet measured".
