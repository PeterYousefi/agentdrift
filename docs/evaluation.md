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

`make evaluate` also executes 13 harder structures × seeds 200–219 (260 runs), using baseline seed 7, except explicit cold-start cases. Rules-1.1 was frozen before adding these cases; no retuning on their results. Detection Lab defaults to these results and offers the original 120-run regression separately. Labels are held outside telemetry. Cases include approved high volume, unfamiliar low volume, cold start, aggregation, repeated small sends, out-of-order events, missing identity, concurrent agents, bulk export, split windows, gradual growth, sensitive known destinations and unrelated workflows.

| Task / predictor | TP | FP | TN | FN | Precision | Recall | F1 | FPR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Investigation, score ≥30 | 80 | 80 | 80 | 20 | 0.5000 | 0.8000 | 0.6154 | 0.5000 |
| High severity, elevated/critical | 40 | 40 | 160 | 20 | 0.5000 | 0.6667 | 0.5714 | 0.2000 |
| Always review, investigation labels | 100 | 160 | 0 | 0 | 0.3846 | 1.0000 | 0.5556 | 1.0000 |
| Destination novelty only, investigation labels | 40 | 40 | 120 | 60 | 0.5000 | 0.4000 | 0.4444 | 0.2500 |

Anomaly signal (score >0), investigation creation and high severity have separate ground truth and confusion matrices in the artifact. None measures confirmed malicious intent. All 20 split-window sequences are missed; four legitimate volume/cold-start/growth structures account for 80 false positives. There are 0.5 false investigation alerts per benign run. Mean detection delay is 122.75 simulated seconds among detected positives and excludes misses. Activity-hour normalization uses simulated event spans, not actual operational hours or wall time.

Per-seed matrices, per-scenario rows and threshold comparisons at 20/30/45/60/80 are published in `backend/evaluation.json`. Threshold comparisons are diagnostic; the deployed threshold remains 30. Identical per-seed matrices reflect repeated structures, despite numerical variation. New seeds do not establish an independent real-world distribution. Approved destinations can still warrant investigation when volume or restricted movement is unusual; novelty and severity are not maliciousness.
