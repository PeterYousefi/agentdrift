# Grounded reports

The default report is labeled “Deterministic evidence summary — no LLM inference used.” It reports operations, bytes, timestamps and computed detector codes. It never attributes malicious intent.

Azure OpenAI is integrated server-side and optional. Configure endpoint, model deployment, API version and managed identity (or a server secret API key). No model service is created by the low-cost deployment. The integration has unit tests for citation rejection and model-failure fallback, but has not been verified against an actual Azure OpenAI model.

The evidence bundle allowlists event ID, operation, time, bounded target and bytes, and includes detector features. Raw metadata is excluded; prompt size is capped at 24,000 characters and evidence at 100 events. System instructions treat strings as untrusted data. Pydantic validates structured JSON. Invalid citations, invalid output, oversized bundles, API failures and timeout produce the explicit deterministic fallback. Reports are persisted and reused until evidence IDs change.

OBSERVED, DETECTED, INFERRED and RECOMMENDED distinguish facts, detector outputs, hypotheses and proposed steps. Models have no executable tool access and cannot approve containment. Structured citation validation does not by itself establish semantic truth or eliminate prompt-injection risks in all possible integrations.
