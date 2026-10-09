# Current limitations

The existing Azure frontend/backend and Azure Table persistence are live. Azure OpenAI is disabled/unconfigured at the owner's request: no new model costs. Structured model integration is mock-tested; genuine model inference has not been verified. All hosted reports honestly identify deterministic fallback.

Synthetic telemetry and containment are simulated. Rules-1.2 improves the old260 challenge but only reaches71.4% precision and55.6% recall on380 fresh-seed challenge/probe runs, with20% FPR. Restricted sequences crossing five-minute windows are detected when within the fifteen-minute correlation horizon. Legitimate batches exceeding allowances still trigger alerts, while suspicious solitary exports to trusted endpoints, incomplete workflow attribution and longer sequences can be missed. The narrower260 templates score perfectly; that is not real-world effectiveness. Shared templates and subjective review labels limit generalization.

Observed model assertions are checked against exact evidence tuples and rendered canonically. Interpretation and alternatives remain uncertain and are not semantically proven. Prompt injection defenses and citation membership do not guarantee all prose is correct. The model cannot execute or approve containment.

Anonymous bearer sessions provide demo isolation rather than authenticated analyst identities. The single worker/replica and process lock are unsuitable for horizontally scaled writers or quotas. Table persistence survives image updates, but this is not an HA service. Scale-to-zero can delay unattended replay; polling and a background sweep catch up on activation. There is no real telemetry connector, distributed stream or production incident response.

Attempt quotas fail closed on storage errors but are not monetary caps. Azure budget emails depend on delayed billing data. The existing US$0–2/month estimate assumes light demo use and available consumption allowances, excludes unrelated subscription usage, and cannot guarantee total charges below $5. No new paid resources or model usage were added.

The live baseline chart reports its actual 40-sample, 6h 30m UTC span. Opt-in legacy fixture mode remains illustrative. Seven existing frontend fast-refresh lint warnings remain; a local Starlette/httpx deprecation warning remains.
