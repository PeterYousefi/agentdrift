from app.detection import build_baseline, detect, extract
from app.models import Severity
from app.scenarios import generate, historical_events


def baseline():
    return build_baseline(historical_events(), "ag-07")


def test_baseline_and_insufficient_history():
    assert baseline().sample_count == 40
    assert baseline().baseline_quality == "stable"
    assert build_baseline([], "ag-07").baseline_quality == "learning"


def test_normal_volume_novelty_and_sequence():
    assert detect(generate("normal", "r"), baseline()).severity == Severity.NORMAL
    assert detect(generate("spike", "r"), baseline()).anomaly_score >= 30
    novel = detect(generate("novel-endpoint", "r"), baseline())
    assert novel.feature_values["destination_novelty"] == 1
    assert novel.severity == Severity.REVIEW
    seq = detect(generate("read-then-send", "r"), baseline())
    assert seq.severity == Severity.CRITICAL
    assert len(seq.feature_values["sequence_event_ids"]) == 4


def test_duplicates_order_and_run_isolation():
    events = generate("read-then-send", "r")
    assert detect(events[::-1] + events, baseline()) == detect(events, baseline())
    broken = [e.model_copy(update={"correlation_id": str(i)}) for i, e in enumerate(events)]
    assert extract(broken, baseline())["sequence_event_ids"] == []
    other = generate("read-then-send", "r2", agent_id="other")
    assert detect(events + other, baseline()) == detect(events, baseline())


def test_low_and_slow_and_benign_pressure():
    result = detect(generate("low-and-slow", "r"), baseline())
    assert "CUMULATIVE_DRIFT" in result.explanation_codes
    assert result.anomaly_score >= 30
    benign = detect(generate("benign-unusual", "r"), baseline())
    # Deliberate false-positive pressure: novelty is reviewable even when ground truth is benign.
    assert benign.severity != Severity.NORMAL


def test_input_changes_score():
    events = generate("spike", "r")
    smaller = [e.model_copy(update={"bytes_transferred": 1}) for e in events]
    assert detect(smaller, baseline()).anomaly_score < detect(events, baseline()).anomaly_score
