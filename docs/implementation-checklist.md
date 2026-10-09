# Implementation checklist

Only checked items have been executed and verified. Each increment is committed separately.

- [x] Inspect existing Lovable source and tools
- [x] Commit and push original frontend baseline
- [x] Audit frontend; install, build, lint and test
- [x] Typed Python service and health checks
- [x] Deterministic scenarios and ingestion
- [x] Baselines, feature extraction, sequence detection and evaluation
- [x] Local durable evidence, session isolation, cases and graphs; Azure Table Storage live
- [x] Grounded reports and Azure OpenAI adapter with tested deterministic fallback
- [x] Human-approved simulated containment and audit
- [x] Integrate existing Lovable pages and live playback
- [x] Azure cost review and compiled Bicep; subscription $5 email budget created and verified
- [x] Cost approval and application provisioning
- [x] GitHub CI and local browser tests
- [x] Azure deployment and public browser workflow verification
- [x] Documentation, executed synthetic measurements and demo walkthrough

Explicit scope limits: Azure OpenAI adapter is implemented/tested but no model is provisioned; deterministic fallback is live. GitHub validation/image publishing are active; Azure deployment runs through CLI and the OIDC workflow remains gated. No optional ML detector or Event Hubs is claimed.

Audit release (2026-10-09): reproduced benchmark; explicit approval policy; actual UTC training span and case timestamps; graph provenance/accessibility; containment UI regressions; claim-section validation; expanded public workflow tests; update-only immutable deployment. See audit-2026-10-09.md for executed results and remaining limitations.
