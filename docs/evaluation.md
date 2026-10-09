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
