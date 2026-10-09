# Final launch pass — scope and evaluation protocol

Preserve the existing UI, apps, history and simulation. Work only on Azure model availability, detector policy/sequence reliability, verification and documentation. No paid model provisioning without an explicit cost approval.

Baseline: rules-1.1, existing 260-run challenge seeds 200–219 (already publicly inspected, so no longer an untouched test set). Investigation confusion matrix TP80 FP80 TN80 FN20; precision0.5 recall0.8 FPR0.5. Retain this set for regression comparison.

Development set: challenge seeds 1000–1019, separate from baseline training seed7 and prior test seeds. Use only this set and explicit adverse regression examples to implement candidate policy. It shares generator shapes with the old challenge; this limits independence.

New held-out set: seeds 700–719, 260 runs. Do not execute until detector implementation and parameters are committed/frozen. First evaluation occurs only after freezing; publish weaker outcomes without retuning. Repeats for reproduction or aggregation do not change the rules. Disjoint seeds do not provide distributional independence. Keep old 260 results and run both detector versions on the same sets for comparison.

Policy intent: preserve visible statistical deviations while requiring stronger corroboration for trusted-volume-only investigation; baseline learning must not divide by zero into a high-severity alert. Trusted resource/destination decisions must use explicit server configuration, never event metadata or benchmark labels. Preserve high-volume burst, unapproved novelty, restricted movement and cumulative small-transfer detection. Extend bounded sequence correlation independently of five-minute volume windows; require actor/run/correlation and event ordering, and prevent unrelated writes from masking a valid path.

Known unavoidable ambiguity: metadata alone cannot distinguish legitimate single bulk exports from malicious transfers to a trusted endpoint. Report this tradeoff instead of asserting maliciousness or universal correctness.

Frozen rules-1.2: 900-second sequence horizon, separate from 300-second volume windows; learning-baseline volume contribution suppressed; ordinary solitary volume capped at score25 only for explicitly configured endpoints (forecast-model2GiB, approved-reporting1GiB) with matching attribution, known ordinary resources and no restricted reads. Burst, novel resource/destination, restricted sequence and cumulative contributions remain active. Baselines are not updated with unverified live transfers. This can miss suspicious solitary transfers to trusted endpoints.

Pre-registered held-out stress probes (same fresh seeds700–719, six structures): suspicious solitary trusted transfer, legitimate export beyond allowance, legitimate two-transfer batch, restricted sequence beyond900seconds, restricted read without staging, and missing workflow correlation. Report all misses/false alerts alongside the existing challenge. These probes intentionally expose metadata ambiguity; do not use them to change the frozen rules.

Owner declined paid services again on 2026-10-09. Azure OpenAI remains disabled; no live-model call is authorized. Current subscription resource check found no AI account; another visible subscription could not be inspected because its cached grant was revoked. No model service was created and no model calls made.


## Verified release outcome (2026-10-09)

- `make test`:73 backend tests passed,1 genuine-model integration test skipped;21 Vitest passed; Ruff/TypeScript passed; lint0errors with7pre-existing warnings.
- Local Playwright:4passed in8.0seconds. Public release Playwright:4passed in38.7seconds, including replay→event-derived graph→explicit analysis→citation inspection→human-approved simulation→audit→refresh and visitor isolation.
- Established deployment process updated only existing apps, using backend image bdc7ad50140aec446b07eed2f71144dfe5b2512c. /health and /ready passed with AzureTableStore. Four pre-update event IDs survived unchanged.
- Read-back allocation:0.25CPU,0.5GiB, min0/max1 replica; model settings absent. No resource provisioning or model invocation occurred. Existing hosting consumption remains subject to the documented usage estimate and delayed budget alerts; this is not a zero-cost guarantee.
- Actual hosted report:provider deterministic, generated_by deterministic, model_deployment null, provider_model null, fallback_reason not_configured, validation_status canonical-facts, token_usage empty. Evidence fingerprint and correlation ID present; every cited ID belongs to the stored case. No live Azure OpenAI claim is made.
- Hosted launchEvaluation matches the checked-in artifact exactly. Combined380 investigation metrics:TP100FP40TN160FN80, precision.7143, recall.5556, F1.625, FPR.2. Reference rules-1.1:TP100FP120TN80FN80, precision.4545, recall.5556, F1.5, FPR.6. The improved narrow260 metrics are accompanied by all120 ambiguity-probe failures.
- GitHub validation succeeded for application commit c8bab3d and documentation commit fe90c19. The intermediate evaluation commit's browser check failed on its old benchmark-text assertion; the following tested UI commit corrected it. No failing rollout is presented as successful.
- Built browser assets contain none of the scanned API-key variable, AccountKey or private-key markers. This targeted scan does not prove every possible secret pattern is absent.

Commits pushed without history rewriting:7b28078(scope/split),c3a2da9(frozen detector),bdc7ad5(comparison evidence),c8bab3d(existing benchmark view),fe90c19(README/tradeoffs). The final verification-document commit follows these. No more features are planned in this pass.
