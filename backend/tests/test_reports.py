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


def test_claim_categories_cannot_disguise_inference_as_observation():
    case, events, finding = bundle()
    report = fallback(case, events, finding)
    report.observed_facts[0].category = "INFERRED"
    with pytest.raises(ValueError):
        validate_report(report, "case", events)


def test_structured_model_output_and_citations(monkeypatch):
    from types import SimpleNamespace

    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test-deployment")
    case, events, finding = bundle()
    payload = fallback(case, events, finding).model_dump_json()
    client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(
                create=lambda **kwargs: SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content=payload))]
                )
            )
        )
    )
    report = generate_report(case, events, finding, client=client)
    assert report.generated_by == "azure-openai"
    assert set(report.evidence_citations) == {event.event_id for event in events}
    assert validate_report(report, "case", events) == report
