from app.challenge_evaluation import TARGETS, challenge, evaluate_challenges, metrics
from app.detection import detect


def test_challenges_repeat_and_do_not_leak_labels():
    for scenario in TARGETS:
        events, baseline = challenge(scenario, 200)
        again, _ = challenge(scenario, 200)
        assert events == again
        for event in events:
            assert not {"ground_truth", "label", "investigationTarget", "malicious"} & event.metadata.keys()
        opaque = [
            event.model_copy(
                update={
                    "scenario_run_id": "opaque-run" if event.agent_id == "ag-07" else "background",
                    "correlation_id": "opaque-" + event.correlation_id,
                }
            )
            for event in events
        ]
        assert detect(opaque, baseline).anomaly_score == detect(events, baseline).anomaly_score


def test_development_evaluation_is_consistent_and_severity_is_not_perfect():
    result = evaluate_challenges(range(1000, 1003))
    assert result["runs"] == 39
    counts = result["investigation"]["confusionMatrix"]
    assert sum(counts.values()) == 39
    assert result["highSeverity"]["confusionMatrix"]["fp"] > 0
    assert result["byScenario"]["legitimate-high-volume"]["alerts"] == 0
    assert result["byScenario"]["split-window-sequence"]["alerts"] == 3
    assert set(result["thresholdSensitivity"]) == {"20", "30", "45", "60", "80"}


def test_metric_math():
    rows = [
        {"p": True, "target": True},
        {"p": True, "target": False},
        {"p": False, "target": True},
        {"p": False, "target": False},
    ]
    result = metrics(rows, "p", "target")
    assert result["confusionMatrix"] == {"tp": 1, "fp": 1, "tn": 1, "fn": 1}
    assert result["precision"] == result["recall"] == result["f1"] == 0.5


def test_preregistered_stress_generators_are_reproducible_metadata_only():
    from app.launch_stress import STRESS_TARGETS, stress

    for name in STRESS_TARGETS:
        events, _ = stress(name, 5000)
        assert events == stress(name, 5000)[0]
        assert all(not {"label", "malicious", "ground_truth"} & e.metadata.keys() for e in events)
