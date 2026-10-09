# Executed evaluation

Run `make evaluate` or `backend/.venv/bin/python -m app.evaluation`. Machine-readable results are in backend/evaluation.json and GET /api/v1/detection/evaluation; the live Detection Lab reads this artifact.

120 runs: six scenario structures × held-out seeds 100–119. Training uses seed 7. Ground truth is confined to the evaluation catalog and not present in detector event inputs. Independent normal-agent background traffic is added and checked for score invariance.

| Metric | Executed result |
|---|---:|
| True positives | 80 |
| False positives | 20 |
| True negatives | 20 |
| False negatives | 0 |
| Precision | 0.80 |
| Recall | 1.00 |
| F1 | 0.8889 |
| False-positive rate | 0.50 |
| Mean positive-case detection latency | 169 simulated seconds |
| Mean detector compute | about 0.040 ms on the local evaluation machine |

All 20 benign unusual endpoint runs trigger review: realistic ambiguity produces substantial false-positive pressure. “Positive” here means expected review signal, not proven exfiltration. Scenario structures repeat across seeds, so results cannot establish real-world effectiveness. Dataset overlap and simulator assumptions limit generalization. No ML comparison is claimed. Transport event-to-alert latency has not been measured on Azure. Pipeline_processing_ms measures local ingestion, persistence and detector duration, not end-to-end browser delay.
