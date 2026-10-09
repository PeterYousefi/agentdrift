# Reproduced detection evaluation

Run `make evaluate` (or `cd backend && .venv/bin/python -m app.evaluation`). The checked-in backend/evaluation.json is served to Detection Lab; displayed metrics are executed results. Rules-1.0 was reproduced before changes: 120 runs, TP 80, FP 20, TN 20, FN 0. All 20 false positives were benign-unusual reporting runs.

Rules-1.1 uses explicit server-side approval policy for the research agent's reporting endpoint. Statistical novelty remains a feature; only unapproved novelty contributes to alert score. Large volume, restricted sequences, cumulative deviation and attribution checks remain active regardless of approval. Ground-truth labels and untrusted event metadata cannot grant approval. The policy is demo configuration, not approval inferred from labels.

| Metric | Before | After |
|---|---:|---:|
| Runs | 120 | 120 |
| TP / FP / TN / FN | 80 / 20 / 20 / 0 | 80 / 0 / 40 / 0 |
| Precision | 0.80 | 1.00 |
| Recall | 1.00 | 1.00 |
| F1 | 0.8889 | 1.00 |
| False-positive rate | 0.50 | 0.00 |
| Mean positive detection latency | 169 simulated seconds | 169 simulated seconds |

Six repeated scenario shapes × seeds 100–119; baseline seed 7, 40 active send windows. Independent normal-agent background traffic is checked for score invariance. Mean computation is machine-dependent and stored in the artifact; transport latency is not measured. The endpoint policy was selected after investigating this benchmark: these are regression results, not an untouched external validation set. Perfect synthetic results do not establish real-world accuracy. Positive labels mean expected review signals, not confirmed maliciousness. An unfamiliar unapproved endpoint remains reviewable even at normal volume.

Regression coverage includes approved benign novelty, approved destination with an extreme transfer, an approved destination carrying a restricted staged sequence, forged approval metadata, duplicate/out-of-order events and multi-agent isolation. No ML superiority is claimed.

## Frozen challenge evaluation

`make evaluate` also executes 13 harder structures × seeds 200–219 (260 runs), using baseline seed 7, except explicit cold-start cases. Rules-1.1 was frozen before adding these cases; no retuning on their results. These are the historical rules-1.1 results. The launch comparison below supersedes the default UI dataset. Labels are held outside telemetry. Cases include approved high volume, unfamiliar low volume, cold start, aggregation, repeated small sends, out-of-order events, missing identity, concurrent agents, bulk export, split windows, gradual growth, sensitive known destinations and unrelated workflows.

| Task / predictor | TP | FP | TN | FN | Precision | Recall | F1 | FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Investigation, score ≥30 | 80 | 80 | 80 | 20 | 0.5000 | 0.8000 | 0.6154 | 0.5000 |
| High severity, elevated/critical | 40 | 40 | 160 | 20 | 0.5000 | 0.6667 | 0.5714 | 0.2000 |
| Always review, investigation labels | 100 | 160 | 0 | 0 | 0.3846 | 1.0000 | 0.5556 | 1.0000 |
| Destination novelty only, investigation labels | 40 | 40 | 120 | 60 | 0.5000 | 0.4000 | 0.4444 | 0.2500 |

Anomaly signal (score >0), investigation creation and high severity have separate ground truth and confusion matrices in the artifact. None measures confirmed malicious intent. All 20 split-window sequences are missed; four legitimate volume/cold-start/growth structures account for 80 false positives. There are 0.5 false investigation alerts per benign run. Mean detection delay is 122.75 simulated seconds among detected positives and excludes misses. Activity-hour normalization uses simulated event spans, not actual operational hours or wall time.

Per-seed matrices, per-scenario rows and threshold comparisons at 20/30/45/60/80 are published in `backend/evaluation.json`. Threshold comparisons are diagnostic; the deployed threshold remains 30. Identical per-seed matrices reflect repeated structures, despite numerical variation. New seeds do not establish an independent real-world distribution. Approved destinations can still warrant investigation when volume or restricted movement is unusual; novelty and severity are not maliciousness.

## Final launch evaluation: rules-1.2

Protocol was committed in 7b28078; implementation and parameters were frozen at c3a2da9 before new held-out evaluation. Development seeds1000–1019 are separate from historical training seed7, original challenge seeds200–219 and new held-out seeds700–719. Generator structures are shared: this is disjoint numerical sampling, not independent real-world validation. The old challenge is a regression set, not a pristine holdout.

Trusted ordinary solitary exports retain statistical deviations but cap their volume contribution at25 below the investigation threshold30. Explicit server allowances are forecast-model2GiB and approved-reporting1GiB. Restricted/novel resources, identity mismatch, bursts and cumulative small transfers are independently scored. Learning baselines contribute no volume score; novelty and sequence remain active. No live data is used to adapt baselines, avoiding unverified baseline poisoning. The 900-second actor/run/workflow correlation horizon is independent of the 300-second volume window. READ→WRITE→CONNECT→SEND order is required, and unrelated early writes cannot mask a correlated path.

| Dataset / version | TP | FP | TN | FN | Precision | Recall | F1 | FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fresh260 / 1.1 | 80 | 80 | 80 | 20 | .5000 | .8000 | .6154 | .5000 |
| Fresh260 / 1.2 | 100 | 0 | 160 | 0 | 1.0000 | 1.0000 | 1.0000 | .0000 |
| Fresh120 probes / 1.1 | 20 | 40 | 0 | 60 | .3333 | .2500 | .2857 | 1.0000 |
| Fresh120 probes / 1.2 | 0 | 40 | 0 | 80 | .0000 | .0000 | .0000 | 1.0000 |
| Combined380 / 1.1 | 100 | 120 | 80 | 80 | .4545 | .5556 | .5000 | .6000 |
| Combined380 / 1.2 | 100 | 40 | 160 | 80 | .7143 | .5556 | .6250 | .2000 |

Rules-1.2 also scores100%/100%/0% on the old260 regression. High-severity classification on combined380 is precision75%, recall60%, FPR7.14% (60TP20FP260TN40FN). Investigation false alerts per benign run fall from.6 to.2. Mean detected-positive delay is169.86 simulated seconds, excluding80 missed positives; it is not transport latency. Cumulative small transfers still create high-severity false positives under these synthetic labels.

The six probes are registered before evaluation: suspicious solitary trusted transfers, legitimate exports above allowance, legitimate two-transfer batches, sequences beyond900seconds, restricted reads without staging and missing correlation IDs. They intentionally expose missing business context and bounded inference. Several share indistinguishable metadata with benign patterns. The detector misses all80 review-positive probes and flags all40 benign probes. Do not hide these results or infer that perfect performance on the other260 establishes generalization. Combined metrics depend on the chosen mixture, not on real-world prevalence.

`make evaluate` reproduces both versions. `reference_detection.py` preserves rules-1.1 solely for comparison; live code imports rules-1.2. `launchEvaluation` in evaluation.json includes the frozen protocol commit identifier, row-level results, per-seed metrics, old/new comparisons and thresholds. No thresholds or rules changed after seeing held-out outcomes.
