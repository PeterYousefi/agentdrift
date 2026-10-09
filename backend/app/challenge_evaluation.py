"""Locked harder synthetic cases. Labels stay outside event payloads; detector unchanged."""

from datetime import timedelta
from random import Random

from app.detection import build_baseline, detect, ordered
from app.scenarios import AGENT, MB, MODEL, RESOURCE, generate, historical_events, make_event

# Targets: statistical anomaly, investigation-worthy activity, high-severity investigation.
TARGETS = {
    "legitimate-high-volume": (True, False, False),
    "unfamiliar-low-volume": (True, True, False),
    "cold-start-approved": (True, False, False),
    "ordinary-aggregation": (False, False, False),
    "repeated-small-transfers": (True, True, False),
    "out-of-order-sequence": (True, True, True),
    "missing-attribution": (True, False, False),
    "concurrent-shared-dataset": (False, False, False),
    "legitimate-bulk-export": (True, False, False),
    "split-window-sequence": (True, True, True),
    "legitimate-gradual-growth": (True, False, False),
    "sensitive-known-destination": (True, True, True),
    "unrelated-close-workflows": (True, False, False),
}


def challenge(scenario, seed):
    rng = Random(seed)
    run = f"challenge-{scenario}-{seed}"
    events = generate("normal", run, seed=seed)
    baseline = build_baseline(historical_events(seed=7), AGENT)
    if scenario == "legitimate-high-volume":
        events = generate("benign-unusual", run, seed=seed)
        events[-1].bytes_transferred = rng.randint(400, 800) * MB
    elif scenario == "unfamiliar-low-volume":
        events = generate("novel-endpoint", run, seed=seed)
        events[-1].bytes_transferred = rng.randint(1, 20) * MB
    elif scenario == "cold-start-approved":
        events = generate("benign-unusual", run, seed=seed)
        baseline = build_baseline([], AGENT)
    elif scenario == "ordinary-aggregation":
        events = [make_event(run, i, i * 4, "READ", RESOURCE, rng.randint(1, 10) * MB) for i in range(20)]
        events += [make_event(run, 20, 90, "SEND", MODEL, rng.randint(90, 150) * MB)]
    elif scenario == "repeated-small-transfers":
        events = [make_event(run, 0, 0, "READ", RESOURCE, 40 * MB)]
        events += [make_event(run, i, i * 60, "SEND", MODEL, rng.randint(25, 40) * MB) for i in range(1, 25)]
    elif scenario == "out-of-order-sequence":
        events = generate("read-then-send", run, seed=seed)
        rng.shuffle(events)
    elif scenario == "missing-attribution":
        events = [e.model_copy(update={"identity_id": "unattributed"}) for e in events]
    elif scenario == "concurrent-shared-dataset":
        events += generate("normal", run + "-other", seed=seed + 1, agent_id="other-agent")
    elif scenario == "legitimate-bulk-export":
        events[-1].bytes_transferred = rng.randint(800, 1500) * MB
    elif scenario == "split-window-sequence":
        events = generate("read-then-send", run, seed=seed)
        for event, seconds in zip(events, [0, 180, 295, rng.randint(310, 420)]):
            event.event_time = events[0].event_time + timedelta(seconds=seconds)
            if event.destination_id:
                event.destination_id = MODEL
            if event.operation == "SEND":
                event.bytes_transferred = rng.randint(60, 100) * MB
    elif scenario == "legitimate-gradual-growth":
        events = [make_event(run, 0, 0, "READ", RESOURCE, 40 * MB)]
        events += [
            make_event(run, i, i * 600, "SEND", MODEL, int(100 * (1.04 + rng.random() * 0.015) ** i) * MB)
            for i in range(1, 20)
        ]
    elif scenario == "sensitive-known-destination":
        events = generate("read-then-send", run, seed=seed)
        for event in events:
            if event.destination_id:
                event.destination_id = MODEL
            if event.operation == "SEND":
                event.bytes_transferred = rng.randint(60, 100) * MB
    elif scenario == "unrelated-close-workflows":
        events = generate("read-then-send", run, seed=seed)
        for i, event in enumerate(events):
            event.correlation_id = "workflow-a" if i == 0 else "workflow-b"
            if event.destination_id:
                event.destination_id = MODEL
            if event.operation == "SEND":
                event.bytes_transferred = rng.randint(60, 100) * MB
    else:
        raise ValueError("unknown challenge")
    return events, baseline


def metrics(rows, prediction, target):
    counts = {k: 0 for k in ["tp", "fp", "tn", "fn"]}
    for row in rows:
        yes = bool(row[prediction])
        label = bool(row[target])
        counts["tp" if yes and label else "fp" if yes else "fn" if label else "tn"] += 1
    tp, fp, tn, fn = (counts[k] for k in ["tp", "fp", "tn", "fn"])
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    return {
        "confusionMatrix": counts,
        "precision": precision,
        "recall": recall,
        "f1": 2 * precision * recall / max(1e-12, precision + recall),
        "falsePositiveRate": fp / max(1, fp + tn),
    }


def evaluate_challenges(seeds=range(200, 220)):
    rows = []
    for seed in seeds:
        for scenario, targets in TARGETS.items():
            events, baseline = challenge(scenario, seed)
            finding = detect(events, baseline)
            first = None
            for i in range(1, len(events) + 1):
                candidate = detect(events[:i], baseline)
                if candidate and candidate.anomaly_score >= 30:
                    visible = [e for e in events[:i] if e.agent_id == AGENT]
                    first = (
                        max(e.event_time for e in visible)
                        - min(e.event_time for e in events if e.agent_id == AGENT)
                    ).total_seconds()
                    break
            rows.append(
                {
                    "scenario": scenario,
                    "seed": seed,
                    "anomalyTarget": targets[0],
                    "investigationTarget": targets[1],
                    "highSeverityTarget": targets[2],
                    "score": finding.anomaly_score,
                    "severity": finding.severity,
                    "review": finding.anomaly_score >= 30,
                    "anyDeviation": finding.anomaly_score > 0,
                    "high": finding.severity in {"elevated", "critical"},
                    "noveltyOnly": finding.feature_values["destination_novelty"] > 0,
                    "alwaysReview": True,
                    "detectionDelaySeconds": first,
                    "benignActivitySeconds": max(
                        1, (ordered(events)[-1].event_time - ordered(events)[0].event_time).total_seconds()
                    ),
                }
            )
    review = metrics(rows, "review", "investigationTarget")
    benign = [r for r in rows if not r["investigationTarget"]]
    positive_delays = [
        r["detectionDelaySeconds"]
        for r in rows
        if r["investigationTarget"] and r["detectionDelaySeconds"] is not None
    ]
    return {
        "dataset": "13 frozen challenge structures × seeds 200–219; baseline seed 7; no detector retuning",
        "task": "Investigation-worthy synthetic behavior, not maliciousness classification",
        "runs": len(rows),
        "investigation": review,
        "anomalySignal": metrics(rows, "anyDeviation", "anomalyTarget"),
        "highSeverity": metrics(rows, "high", "highSeverityTarget"),
        "trivialBaselines": {
            "alwaysReview": metrics(rows, "alwaysReview", "investigationTarget"),
            "destinationNoveltyOnly": metrics(rows, "noveltyOnly", "investigationTarget"),
        },
        "falseAlertsPerBenignRun": review["confusionMatrix"]["fp"] / max(1, len(benign)),
        "falseAlertsPerSyntheticBenignHour": review["confusionMatrix"]["fp"]
        / max(1e-12, sum(r["benignActivitySeconds"] for r in benign) / 3600),
        "meanDetectedPositiveDelaySeconds": sum(positive_delays) / max(1, len(positive_delays)),
        "thresholdSensitivity": {
            str(t): metrics(
                [r | {"thresholdPrediction": r["score"] >= t} for r in rows],
                "thresholdPrediction",
                "investigationTarget",
            )
            for t in [20, 30, 45, 60, 80]
        },
        "perSeed": {
            str(seed): metrics([r for r in rows if r["seed"] == seed], "review", "investigationTarget")
            for seed in seeds
        },
        "byScenario": {
            scenario: {
                "runs": sum(r["scenario"] == scenario for r in rows),
                "alerts": sum(r["scenario"] == scenario and r["review"] for r in rows),
                "investigationTarget": targets[1],
                "highSeverityTarget": targets[2],
            }
            for scenario, targets in TARGETS.items()
        },
        "limitations": [
            "Not real telemetry; task labels are evaluation policy, not proof of maliciousness.",
            "Only 13 synthetic structures; frozen detector evaluated without tuning to this set.",
            "Synthetic activity hours exclude idle time and wall-clock ingestion; not operational alert rates.",
            "Statistical anomaly targets are distinct annotations, not inferred maliciousness.",
            "Static baselines and 300-second sequence windows are exposed as weaknesses.",
        ],
        "results": rows,
    }
