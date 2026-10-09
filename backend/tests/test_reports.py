import pytest

from app.detection import build_baseline, detect
from app.models import Claim
from app.reports import fallback, generate_report, validate_report
from app.scenarios import generate, historical_events


def bundle():
    events = generate("read-then-send", "r")
    finding = detect(events, build_baseline(historical_events(), "ag-07")).model_dump(mode="json")
    return {"id": "case"}, events, finding


def test_fallback_grounding(monkeypatch):
    monkeypatch.delenv("AZURE_OPENAI_DEPLOYMENT", raising=False)
    case, events, finding = bundle()
    report = generate_report(case, events, finding)
    assert report.generated_by == "deterministic"
    assert "no LLM" in report.summary
    assert validate_report(report, "case", events) == report


def test_fabricated_citations_rejected():
    case, events, finding = bundle()
    report = fallback(case, events, finding)
    report.hypotheses = [Claim(category="INFERRED", text="Unknown claim", evidence_ids=["invented"])]
    with pytest.raises(ValueError):
        validate_report(report, "case", events)


def test_unavailable_llm_falls_back(monkeypatch):
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "configured")

    class Broken:
        @property
        def chat(self):
            raise RuntimeError("unavailable")

    assert generate_report(*bundle(), client=Broken()).generated_by == "deterministic"
