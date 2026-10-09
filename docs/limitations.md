# Current limitations

Azure deployment and live verification are pending user cost approval. No public Azure demo URL is claimed. The frontend, backend, tests, image publishing, CI and Bicep are implemented and verified locally/through GitHub.

The public demo exposes one research agent. Core detector tests cover multiple agents; a real telemetry integration is absent. Inputs and baseline structure are synthetic. Held-out seeds share scenario shape; recall cannot establish real-world effectiveness. Benign endpoint novelty triggers review; false-positive rate is 50% on this benchmark.

The processor uses polling or SSE snapshots and a background sweep. Scale-to-zero delays unattended replay until next activation. There is no Event Hubs/Kafka integration, distributed lease, ML model or autonomous security action. The single-replica process lock is unsuitable for horizontally scaled writers. Azure Table production durability and identity access are prepared but not live tested.

Azure OpenAI adapter is tested with fallback paths but has no live configured model. Deterministic reports are explicit. Citation checks validate provenance, not complete semantic accuracy. Human approval is session-holder input, not authenticated analyst identity.

Budget notifications are not spending caps. Shared subscription grants, abuse and unexpected usage can exceed estimates. Existing legacy fixture mode is available only when explicitly opted in. Some retained fixture navigation metadata and baseline chart formatting are portfolio-era artifacts; live factual records come from the API. The deep route, graph, report and simulation flow has a passing Chromium test.
