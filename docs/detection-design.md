# Detection design

Training seed 7 produces 40 nonempty historical send windows. Per-agent median outbound volume and scaled median absolute deviation form the baseline, with a ten-percent dispersion floor. Fewer than 20 samples is marked learning. Evaluation events never update this training baseline.

Features include trailing 300-second outbound bytes, robust deviation, resource and destination novelty, sensitivity-weighted reads, read/send proximity, ordered staging, destination diversity, burstiness, repeated small transfers, cumulative volume, access frequency and attribution mismatch. Some features are diagnostic only, not score contributions.

Rules-1.0 combines bounded contributions from robust volume deviation, novelty, linked restricted read → write → connect → send, repeated cumulative deviation and identity/workload mismatch. Contributions are in backend/app/detection.py; the complete vector and baseline are stored with each finding. Severity thresholds are 30 review, 60 elevated and 80 critical on a 0–100 scale. The UI expresses the same score on 0–1.

Sequence members must share agent, correlation and run, and be temporally ordered within 300 seconds. Input is sorted and deduplicated. An unusual approved reporting destination intentionally triggers a review signal. Novelty does not prove maliciousness. Identity checks use the synthetic identity naming convention and need integration-specific attribution for real telemetry.

Cumulative deviation assumes a training cycle per ten minutes. This is a documented simulator-specific assumption. No machine-learning model is implemented: the narrow repeated scenario shapes do not justify a credible claim of ML improvement. Production readiness would require representative telemetry, approval context, calibration, distributed correlation and drift handling.
