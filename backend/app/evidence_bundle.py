"""Exact, bounded persisted evidence; metadata is never treated as instructions."""

import hashlib
import json

from pydantic import Field

from app.models import DomainModel, MovementEvent, Operation

PROMPT_VERSION = "investigator-2.0"
MAX_BUNDLE_BYTES = 12000


class EvidenceAssertion(DomainModel):
    event_id: str
    operation: Operation
    agent_id: str
    target: str
    bytes_transferred: int
    event_time: str


class ModelHypothesis(DomainModel):
    text: str = Field(min_length=1, max_length=1500)
    evidence_ids: list[str] = Field(min_length=1, max_length=20)
    uncertainty: str = Field(min_length=1, max_length=500)


class ModelAnalysis(DomainModel):
    summary: str = Field(min_length=1, max_length=2000)
    observed_facts: list[EvidenceAssertion] = Field(min_length=1, max_length=30)
    hypotheses: list[ModelHypothesis] = Field(max_length=8)
    alternative_explanations: list[str] = Field(min_length=1, max_length=8)
    limitations: list[str] = Field(min_length=1, max_length=8)
    recommended_steps: list[str] = Field(min_length=1, max_length=8)


def assertion(event):
    return EvidenceAssertion(
        event_id=event.event_id,
        operation=event.operation,
        agent_id=event.agent_id,
        target=event.resource_id or event.destination_id,
        bytes_transferred=event.bytes_transferred,
        event_time=event.event_time.isoformat(),
    )


def build_bundle(case, evidence, finding):
    if not evidence or len(evidence) > 30:
        raise ValueError("empty or excessive case evidence")
    unique = {}
    for item in evidence:
        event = MovementEvent.model_validate(item.model_dump())
        semantic = event.model_dump(exclude={"ingest_time"})
        if event.event_id in unique and semantic != unique[event.event_id].model_dump(
            exclude={"ingest_time"}
        ):
            raise ValueError("conflicting duplicate evidence")
        unique[event.event_id] = event
    events = sorted(unique.values(), key=lambda e: (e.event_time, e.event_id))
    ids = {e.event_id for e in events}
    if ids != set(case.get("evidenceIds", ids)) or ids != set(finding["evidence_event_ids"]):
        raise ValueError("case/finding evidence does not match stored events")
    if any(
        e.agent_id != finding["agent_id"] or e.scenario_run_id != events[0].scenario_run_id for e in events
    ):
        raise ValueError("cross-agent or cross-run evidence")
    features = finding["feature_values"]
    bundle = {
        "case_id": case["id"],
        "prompt_version": PROMPT_VERSION,
        "agent_id": finding["agent_id"],
        "time_window": {"start": events[0].event_time.isoformat(), "end": events[-1].event_time.isoformat()},
        "events": [
            assertion(e).model_dump(mode="json")
            | {"identity_id": e.identity_id, "workload_id": e.workload_id, "correlation_id": e.correlation_id}
            for e in events
        ],
        "detector": {
            "version": finding["detector_version"],
            "score": finding["anomaly_score"],
            "severity": finding["severity"],
            "contributions": features["contributions"],
        },
        "baseline": features["baseline"],
    }
    payload = json.dumps(bundle, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    raw = payload.encode("utf-8", errors="strict")
    if len(raw) > MAX_BUNDLE_BYTES:
        raise ValueError("evidence bundle exceeds input bound")
    return bundle, hashlib.sha256(raw).hexdigest()


def validate_analysis(analysis, evidence):
    allowed = {e.event_id: assertion(e) for e in evidence}
    for fact in analysis.observed_facts:
        if fact.event_id not in allowed or fact != allowed[fact.event_id]:
            raise ValueError("unsupported observed assertion")
    for hypothesis in analysis.hypotheses:
        if not set(hypothesis.evidence_ids) <= allowed.keys():
            raise ValueError("unsupported hypothesis citations")
    # Model prose remains interpretation; only canonical validated tuples become observed facts.
    return analysis
