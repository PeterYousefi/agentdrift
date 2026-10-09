# Evidence-grounded investigation reports

The hosted application uses **deterministic fallback, with no model invocation**. No Azure OpenAI resource or runtime model configuration was found. The owner chose to keep fallback and incur no new model costs. The server integration is implemented and mock-tested; it is not verified live GenAI.

Explicit `POST /api/v1/investigations/{case_id}/report` generates analysis. GET report and legacy narrative reads never invoke a model. The existing UI provides Generate AI Analysis, pending/error/retry states, clickable citations and provenance. Successful verified provider responses are labeled Azure OpenAI; all fallback responses explicitly say no LLM used and expose only a safe reason.

## Controlled evidence

`evidence_bundle.py` loads the exact case/finding event set, validates typed events, rejects missing/conflicting duplicate IDs and cross-agent/run relationships, sorts UTC timestamps and includes baseline statistics and detector contributions. Raw metadata is excluded. At most 30 events and 12,000 serialized UTF-8 bytes are submitted. A canonical SHA-256 fingerprint identifies the bundle; case, prompt version, provider/model, correlation ID, timestamp, validation status, latency and token usage are recorded server-side.

The strict structured model schema uses exact observed tuples: event ID, operation, actor, target, byte count and timestamp. Pydantic checks bounds; every asserted tuple must match persisted evidence exactly. Factual prose is rendered by the server from validated tuples. Hypotheses require nonempty case-local citations and uncertainty. Detector findings remain server-computed. Free-text interpretation, alternatives and recommendations are explicitly unverified; valid citations do not prove their semantic correctness. Model output has no approval or executable action fields.

## Reliability and cost boundaries

Managed identity is preferred; optional credentials stay server-side. Timeout defaults to 15 seconds (bounded 2–20); at most two provider attempts, with a 0.25-second backoff before the only retry. Authentication/deployment errors and refusals stop without repair. Invalid/transient output can receive one bounded repair/retry. Output defaults to 1,500 tokens, bounded to 1,800. Failed attempts and retries consume persistent limits: at most 100 attempts/month, 10/day globally and 2/day per visitor. Settings may lower these limits. One concurrent model request is allowed. Global reservation precedes local reservation and storage failures fail closed. Fingerprint/template/deployment caching avoids repeat provider calls. Changed evidence during generation prevents stale report persistence.

Quotas rely on the existing single worker/replica and shared process lock; they require redesign before horizontal scaling. These are attempt caps, not a dollar guarantee. Structured logs contain safe reasons, correlation IDs, provenance and usage rather than prompts, evidence or provider exception bodies.

## Future opt-in live integration

An approved model resource/deployment, quota and resource-scoped Cognitive Services OpenAI User role for the runtime managed identity are required. Set server-only `LLM_ENABLED=true`, endpoint, deployment and SDK API version after explicit cost approval. Never set credentials in VITE variables. Then run `RUN_AZURE_OPENAI_INTEGRATION=true backend/.venv/bin/pytest backend/tests/test_model_integration.py -q`. This test requires genuine model provenance, usage and validated evidence; it is skipped in ordinary tests and CI. No live model test passed in this upgrade.

Prompt injection tests exercise untrusted resource/destination strings, excluded oversized metadata, malformed Unicode, duplicate evidence and invented citations. The model has no tools or environment access. These controls reduce risk; they do not prove immunity to all prompt injection or hallucination.
