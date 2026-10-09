"""Executed held-out synthetic evaluation. Labels exist only in this module's catalog."""

import json
import time
from pathlib import Path

from app.challenge_evaluation import TARGETS, evaluate_challenges, summarize
from app.detection import VERSION, build_baseline, detect
from app.launch_stress import STRESS_TARGETS, stress
from app.reference_detection import detect as reference_detect
from app.scenarios import CATALOG, generate, historical_events


def evaluate(seeds=range(100, 120)):
    baseline = build_baseline(historical_events(seed=7), "ag-07")
    counts = dict(tp=0, fp=0, tn=0, fn=0)
    rows = []
    latencies = []
    for seed in seeds:
        for scenario, name, description, label in CATALOG:
            events = generate(scenario, f"eval-{scenario}-{seed}", seed=seed)
            start = time.perf_counter()
            finding = detect(events, baseline)
            compute_ms = (time.perf_counter() - start) * 1000
            prediction = finding.anomaly_score >= 30
            key = "tp" if label and prediction else "fn" if label else "fp" if prediction else "tn"
            counts[key] += 1
            first_alert = next(
                (i for i in range(1, len(events) + 1) if detect(events[:i], baseline).anomaly_score >= 30),
                None,
            )
            latency = (
                (events[first_alert - 1].event_time - events[0].event_time).total_seconds()
                if first_alert
                else None
            )
            if latency is not None and label:
                latencies.append(latency)
            # Independent normal-agent traffic is filtered from this agent's features.
            background = generate("normal", f"background-{seed}", agent_id="background-agent")
            background_score = detect(events + background, baseline).anomaly_score
            assert background_score == finding.anomaly_score
            rows.append(
                dict(
                    scenario=scenario,
                    seed=seed,
                    ground_truth=label,
                    predicted=prediction,
                    score=finding.anomaly_score,
                    detection_latency_seconds=latency,
                    processing_ms=round(compute_ms, 4),
                )
            )
    tp, fp, tn, fn = (counts[k] for k in ("tp", "fp", "tn", "fn"))
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    return {
        "dataset": "held-out synthetic scenario seeds 100–119; training seed 7",
        "detector": VERSION,
        "runs": len(rows),
        "confusionMatrix": counts,
        "precision": precision,
        "recall": recall,
        "f1": 2 * precision * recall / max(1e-12, precision + recall),
        "falsePositiveRate": fp / max(1, fp + tn),
        "meanDetectionLatencySeconds": sum(latencies) / max(1, len(latencies)),
        "meanProcessingMs": sum(r["processing_ms"] for r in rows) / max(1, len(rows)),
        "eventToAlertLatency": "Not measured over a deployed transport; processing_ms measures synchronous detector only.",
        "mlComparison": "Not implemented; no claim of ML superiority.",
        "limitations": [
            "Synthetic benchmarks do not establish real-world effectiveness.",
            "Scenario structure repeats across seeds; statistical confidence is limited.",
            "Background check covers independent normal-agent traffic, not adversarial mixed correlations.",
            "Approval policy is explicit server configuration; synthetic endpoint distinction limits generalization.",
        ],
        "byScenario": {
            sid: {
                "runs": sum(r["scenario"] == sid for r in rows),
                "alerts": sum(r["scenario"] == sid and r["predicted"] for r in rows),
            }
            for sid, *_ in CATALOG
        },
        "results": rows,
    }


def launch_evaluation():
    def summary(result):
        return {k: v for k, v in result.items() if k != "results"}

    heldout = dict(seeds=range(700, 720), dataset="Fresh held-out seeds 700–719; frozen at c3a2da9")
    probes = dict(
        heldout,
        targets=STRESS_TARGETS,
        generator=stress,
        dataset="Six pre-registered ambiguity probes × fresh seeds 700–719",
    )
    current = evaluate_challenges(**heldout)
    current_stress = evaluate_challenges(**probes)
    previous = evaluate_challenges(**heldout, detector=reference_detect)
    previous_stress = evaluate_challenges(**probes, detector=reference_detect)
    combined_targets = TARGETS | STRESS_TARGETS
    combined_dataset = (
        "19 pre-registered structures × held-out seeds 700–719; challenge plus ambiguity probes"
    )
    return {
        "frozenCommit": "c3a2da9",
        "developmentSeeds": list(range(1000, 1020)),
        "regressionBefore": summary(evaluate_challenges(detector=reference_detect)),
        "heldOut": current,
        "heldOutBefore": summary(previous),
        "stress": current_stress,
        "stressBefore": summary(previous_stress),
        "combined": summarize(
            current["results"] + current_stress["results"],
            range(700, 720),
            combined_targets,
            combined_dataset,
            VERSION,
        ),
        "combinedBefore": summary(
            summarize(
                previous["results"] + previous_stress["results"],
                range(700, 720),
                combined_targets,
                combined_dataset,
                "rules-1.1",
            )
        ),
        "protocol": "Development seeds 1000–1019; old 200–219 regression; 700–719 evaluated after frozen commit. No post-evaluation tuning.",
    }


if __name__ == "__main__":
    result = evaluate()
    result["expandedEvaluation"] = evaluate_challenges()
    result["launchEvaluation"] = launch_evaluation()
    path = Path(__file__).parent.parent / "evaluation.json"
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "results"}, indent=2))
