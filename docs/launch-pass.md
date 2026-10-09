# Final launch pass — scope and evaluation protocol

Preserve the existing UI, apps, history and simulation. Work only on Azure model availability, detector policy/sequence reliability, verification and documentation. No paid model provisioning without an explicit cost approval.

Baseline: rules-1.1, existing 260-run challenge seeds 200–219 (already publicly inspected, so no longer an untouched test set). Investigation confusion matrix TP80 FP80 TN80 FN20; precision0.5 recall0.8 FPR0.5. Retain this set for regression comparison.

Development set: challenge seeds 1000–1019, separate from baseline training seed7 and prior test seeds. Use only this set and explicit adverse regression examples to implement candidate policy. It shares generator shapes with the old challenge; this limits independence.

New held-out set: seeds 700–719, 260 runs. Do not execute until detector implementation and parameters are committed/frozen. Evaluate once after freezing, publish weaker outcomes without retuning. Disjoint seeds do not provide distributional independence. Keep old 260 results and run both detector versions on the same sets for comparison.

Policy intent: preserve visible statistical deviations while requiring stronger corroboration for trusted-volume-only investigation; baseline learning must not divide by zero into a high-severity alert. Trusted resource/destination decisions must use explicit server configuration, never event metadata or benchmark labels. Preserve high-volume burst, unapproved novelty, restricted movement and cumulative small-transfer detection. Extend bounded sequence correlation independently of five-minute volume windows; require actor/run/correlation and event ordering, and prevent unrelated writes from masking a valid path.

Known unavoidable ambiguity: metadata alone cannot distinguish legitimate single bulk exports from malicious transfers to a trusted endpoint. Report this tradeoff instead of asserting maliciousness or universal correctness.
