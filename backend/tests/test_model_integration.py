"""Explicit opt-in only. This test can incur model token charges."""

import os

import pytest

from app.detection import build_baseline, detect
from app.reports import configured, generate_report, validate_report
from app.scenarios import generate, historical_events


@pytest.mark.skipif(
    os.getenv("RUN_AZURE_OPENAI_INTEGRATION") != "true", reason="Billable integration is opt-in"
)
def test_real_azure_openai_investigation():
    assert configured(), "Configure approved Azure model and LLM_ENABLED=true"
    events = generate("read-then-send", "integration")
    finding = detect(events, build_baseline(historical_events(), "ag-07")).model_dump(mode="json")
    case = {"id": "integration-case", "evidenceIds": [e.event_id for e in events]}
    report = generate_report(case, events, finding)
    assert report.generated_by == "azure-openai", report.fallback_reason
    assert report.provider_model and report.model_deployment
    assert report.token_usage.get("total_tokens", 0) > 0
    assert validate_report(report, case["id"], events) == report
