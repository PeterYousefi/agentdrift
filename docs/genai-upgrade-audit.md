# GenAI upgrade audit

Baseline on 2026-10-09: main, origin https://github.com/PeterYousefi/agentdrift.git, clean workspace. Existing Lovable React/TanStack/React Flow frontend is preserved; FastAPI/Pydantic service performs synthetic replay, computed rules-1.1 detection, event-derived investigations, graphs, SQLite development persistence and Azure Table production persistence. Opaque 24-hour bearer demo sessions isolate visitors. Containment modifies synthetic run state only.

Executed baseline: `make test` passed 39 pytest and 18 Vitest tests, Ruff/TypeScript, lint zero errors with seven existing warnings. `npm run build` passed. Public Playwright baseline covers playback, report, graph, approval/audit/refresh, isolation, benign policy and actual training span.

Read-back Azure architecture: F1 App Service frontend, Container Apps backend/environment, user-assigned identity, Standard LRS storage. No Cognitive Services resources found in the subscription. Runtime configuration contains only production/storage/identity/CORS names, no model configuration. Region model catalog lists gpt-4o-mini 2024-07-18 and gpt-4.1-mini 2025-04-14; targeted quota query returned no entries, so eligibility/capacity is unconfirmed. Model provisioning needs explicit additional-cost authorization, subscription eligibility/quota, a pay-as-you-go deployment and resource-scoped Cognitive Services OpenAI User role for the existing runtime identity. No paid resource is authorized by this audit.

The existing server-side adapter has structured JSON, ID/category checks, size bounds and fallback, but no verified live model call. Reports are automatically created by narrative reads, cached by evidence IDs only, and lack semantic assertion validation, provenance fingerprint, persistent global model quotas and explicit generation controls. ID membership does not establish claim truth. Free-text observed claims could contradict cited events. The UI retains an outdated illustrative-copy footer, even for backend reports.

Smallest safe plan: bounded typed evidence bundle and stable fingerprint; model-specific structured assertions validated against stored events; deterministic factual rendering, uncertainty-labeled interpretation; server-assigned provenance; timeout/retry/refusal handling; persistent monthly/day/session attempt limits and single-flight concurrency; explicit POST generation with read-only GET; existing UI generation control and citations; harder independent synthetic evaluation without retuning; opt-in real-model integration test; existing-resource deployment and public verification. Keep fallback throughout.

Risks: synthetic-only distribution, single worker/replica lock assumption, anonymous bearer credentials rather than user authentication, delayed billing alerts rather than a spending cap, transient table errors, hallucinations/injection despite validation, limited language-semantic verification. Do not claim production readiness or live GenAI until a genuine invocation succeeds.

## Verified upgrade outcome

The owner chose "Keep hosted fallback for now; no new model costs." No Azure OpenAI deployment was created or invoked. Missing steps are an approved resource/deployment, confirmed quota and identity authorization, runtime configuration and a successful opt-in genuine integration test. Hosted provenance remains deterministic, not model generated.

Implemented: 12 KB/30-event typed bundles and fingerprints; exact observed event assertions; canonical fact rendering; strict structured output and uncertainty; safe provider provenance/logging; bounded timeout/retry/input/output; durable 100/month, 10/day and 2/visitor/day attempt ceilings; one concurrent model request; read-only narrative/GET; explicit generation POST; cache and stale-evidence checks; existing UI controls and clickable evidence; 13 frozen challenge structures and trivial baselines; updated portfolio documentation.

Executed `make test`: 68 pytest passed, one live-model integration test skipped; Ruff passed; 21 Vitest passed; TypeScript passed; lint zero errors and seven existing warnings. Local Chromium: four passed. Initial existing-app rollout: four public Chromium tests passed in 43.3 seconds; /health ok, /ready AzureTableStore. Four evidence IDs persisted before the image update were identical after it. Immutable backend image: b5be941975658608786181b7deff6ada46fbec55. Read-back allocation remains 0.25 vCPU/0.5 GiB, 0–1 replicas; model environment variables absent. Browser asset scan found no Azure OpenAI API-key variable, AccountKey connection-string marker or private-key marker (not a proof against every possible secret).

`make evaluate` reproduces the original 120-run tuned regression (80/0/40/0, precision/recall 1.0, FPR 0.0) and the 260-run challenge (80/80/80/20, precision 0.5, recall 0.8, F1 0.6154, FPR 0.5). Harder cases expose legitimate-volume/cold-start false alerts and split-window misses; no rules were tuned on these new results. Model interpretation remains semantically unverified; no real cloud containment is implemented.

## Upgrade commits

- 123bb69 — deployed-code and configuration audit
- 4a19278 — typed fingerprinted evidence bundle and assertions
- b6f8d7c — corrected malformed-Unicode test expectation
- cfe5e7b — verified structured assertions and provider provenance
- 0a5f07b — persistent attempt quotas and explicit generation API
- aa618ca — existing UI controls, provenance and citation navigation
- e9c8028 — frozen challenge evaluation and comparison baselines
- b5be941 — bounded configuration and safe structured logging
- 0993299 — measured harder evaluation as the default UI
- 2a10e29 — accurate portfolio documentation and About page

All commits were pushed without rewriting history. A Unicode test expectation failed in the bundle milestone and was corrected in the next commit; the final complete suite passes. CI live-model invocation is deliberately disabled. Current limits and pricing assumptions are documented rather than presenting synthetic metrics or mock outputs as production effectiveness.
