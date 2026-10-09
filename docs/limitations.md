# Current limitations

The frontend and backend are deployed on Azure. The public Chromium workflow passed, including refresh, real evidence/report/containment and zero page errors. Azure OpenAI remains unconfigured and reports use the labeled deterministic fallback. Azure OIDC deployment remains gated.

The public demo exposes one research agent. Core detector tests cover multiple agents; a real telemetry integration is absent. Inputs and baseline structure are synthetic. Held-out seeds share scenario shape; recall cannot establish real-world effectiveness. The reproduced 50% false-positive rate falls to 0% with explicit endpoint approval policy; this benchmark was used for tuning and is not external validation.

The processor uses polling or SSE snapshots and a background sweep. Scale-to-zero delays unattended replay until next activation. There is no Event Hubs/Kafka integration, distributed lease, ML model or autonomous security action. The single-replica process lock is unsuitable for horizontally scaled writers. Azure Table production durability and identity access are prepared but not live tested.

Azure OpenAI adapter is tested with fallback paths but has no live configured model. Deterministic reports are explicit. Citation checks validate provenance, not complete semantic accuracy. Human approval is session-holder input, not authenticated analyst identity.

Budget notifications are not spending caps. Shared subscription grants, abuse and unexpected usage can exceed estimates. Existing legacy fixture mode is available only when explicitly opted in. Legacy fixture navigation remains available; live baseline charts report the actual 40-sample, 6h 30m period in UTC; live factual records come from the API. The deep route, graph, report and simulation flow has a passing Chromium test.
