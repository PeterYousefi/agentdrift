import json
from types import SimpleNamespace

import pytest
from test_reports import bundle

from app.evidence_bundle import ModelAnalysis, assertion
from app.reports import generate_report, provider_schema


def valid(events):
    return ModelAnalysis(
        summary="Sequence needs review",
        observed_facts=[assertion(e) for e in events],
        hypotheses=[],
        alternative_explanations=["Legitimate bulk export"],
        limitations=["Synthetic"],
        recommended_steps=["Review approvals"],
    ).model_dump_json()


def client_with(content=None, error=None, refusal=None):
    def create(**kwargs):
        assert kwargs["max_tokens"] <= 1800
        assert kwargs["response_format"]["json_schema"]["strict"] is True
        assert "environment access" in kwargs["messages"][0]["content"]
        if error:
            raise error
        return SimpleNamespace(
            model="verified-response-model",
            choices=[
                SimpleNamespace(
                    finish_reason="stop", message=SimpleNamespace(content=content, refusal=refusal)
                )
            ],
        )

    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


@pytest.mark.parametrize(
    "kind",
    [
        "malformed",
        "cross-case",
        "operation",
        "bytes",
        "empty-citation",
        "refusal",
        "timeout",
        "429",
        "401",
        "404",
    ],
)
def test_unsafe_or_unavailable_models_fall_back(monkeypatch, kind):
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test")
    monkeypatch.setattr("app.reports.time.sleep", lambda _: None)
    case, events, finding = bundle()
    content = valid(events)
    error = None
    refusal = None
    if kind == "malformed":
        content = "not JSON"
    if kind in {"cross-case", "operation", "bytes", "empty-citation"}:
        payload = json.loads(content)
        if kind == "cross-case":
            payload["observed_facts"][0]["event_id"] = "another-case"
        if kind == "operation":
            payload["observed_facts"][0]["operation"] = "SEND"
        if kind == "bytes":
            payload["observed_facts"][0]["bytes_transferred"] = 1
        if kind == "empty-citation":
            payload["hypotheses"] = [{"text": "Hypothesis", "evidence_ids": [], "uncertainty": "Unknown"}]
        content = json.dumps(payload)
    if kind == "refusal":
        refusal = "Refused"
    if kind == "timeout":
        error = TimeoutError("sensitive provider payload")
    if kind in {"429", "401", "404"}:
        error = RuntimeError("secret provider response")
        error.status_code = int(kind)
    report = generate_report(case, events, finding, client=client_with(content, error, refusal))
    assert report.generated_by == "deterministic"
    assert report.provider == "deterministic"
    assert report.fallback_reason
    assert "secret" not in report.model_dump_json()


def test_server_assigned_provenance_and_no_execution_authority(monkeypatch):
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test")
    case, events, finding = bundle()
    report = generate_report(
        case, events, finding, client=client_with(valid(events)), correlation_id="request-test"
    )
    assert report.generated_by == "azure-openai"
    assert report.provider_model == "verified-response-model"
    assert report.request_correlation_id == "request-test"
    assert len(report.evidence_fingerprint) == 64
    assert report.response_options == ["Human-approved simulated agent pause"]
    assert report.validation_status.startswith("observed-tuples-verified")


def test_model_cannot_add_containment_or_provenance_fields(monkeypatch):
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test")
    monkeypatch.setattr("app.reports.time.sleep", lambda _: None)
    case, events, finding = bundle()
    payload = json.loads(valid(events)) | {"approval_status": "approved", "provider": "azure-openai"}
    assert (
        generate_report(case, events, finding, client=client_with(json.dumps(payload))).generated_by
        == "deterministic"
    )


def test_strict_provider_schema_requires_all_fields():
    schema = provider_schema()
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(schema["properties"])


def test_empty_and_excessive_evidence_do_not_call_provider(monkeypatch):
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test")
    case, events, finding = bundle()
    for evidence in [[], events * 10]:
        report = generate_report(
            case, evidence, finding, client=client_with(error=AssertionError("must not call"))
        )
        assert report.generated_by == "deterministic"
        assert report.fallback_reason == "evidence_invalid_or_excessive"
