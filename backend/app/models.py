"""Domain contracts. Timestamps use UTC; byte counts are integral bytes."""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Operation(StrEnum):
    READ = "READ"
    WRITE = "WRITE"
    CONNECT = "CONNECT"
    SEND = "SEND"


class Severity(StrEnum):
    NORMAL = "normal"
    REVIEW = "review"
    ELEVATED = "elevated"
    CRITICAL = "critical"


class DomainModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Identity(DomainModel):
    identity_id: str = Field(min_length=1, max_length=120)
    identity_type: str = "workload"
    attribution_confidence: float = Field(default=1, ge=0, le=1)


class Agent(DomainModel):
    agent_id: str
    name: str
    workload_id: str
    namespace: str
    identity_id: str
    workload_type: str = "research"
    status: str = "active"


class MovementEvent(DomainModel):
    event_id: str = Field(min_length=1, max_length=120)
    event_time: datetime
    ingest_time: datetime = Field(default_factory=utcnow)
    agent_id: str = Field(min_length=1, max_length=120)
    workload_id: str = Field(min_length=1, max_length=120)
    identity_id: str = Field(min_length=1, max_length=120)
    operation: Operation
    resource_id: str = Field(default="", max_length=200)
    destination_id: str = Field(default="", max_length=200)
    bytes_transferred: int = Field(default=0, ge=0, le=10**12)
    source_class: str = Field(default="internal", max_length=40)
    destination_class: str = Field(default="internal", max_length=40)
    metadata: dict[str, Any] = Field(default_factory=dict)
    scenario_run_id: str = Field(min_length=1, max_length=120)
    correlation_id: str = Field(min_length=1, max_length=120)

    @field_validator("event_time", "ingest_time")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("timestamp must include a timezone")
        return value.astimezone(timezone.utc)

    @field_validator("metadata")
    @classmethod
    def bound_metadata(cls, value: dict) -> dict:
        import json

        if len(json.dumps(value)) > 4096:
            raise ValueError("metadata exceeds 4096 characters")
        return value


class Resource(DomainModel):
    resource_id: str
    resource_type: str
    sensitivity_class: str
    first_seen_at: datetime


class Destination(DomainModel):
    destination_id: str
    destination_type: str
    domain: str
    internal_external: str
    first_seen_at: datetime


class BehaviorBaseline(DomainModel):
    agent_id: str
    baseline_window: str
    typical_outbound_bytes: float
    outbound_variability: float
    known_resource_ids: list[str]
    known_destination_ids: list[str]
    typical_operations: list[Operation]
    sample_count: int
    baseline_quality: str


class DetectionFinding(DomainModel):
    finding_id: str
    detector_name: str
    agent_id: str
    window_start: datetime
    window_end: datetime
    anomaly_score: float = Field(ge=0, le=100)
    severity: Severity
    feature_values: dict[str, Any]
    evidence_event_ids: list[str]
    explanation_codes: list[str]
    detector_version: str


class InvestigationCase(DomainModel):
    case_id: str
    title: str
    status: str = "open"
    severity: Severity
    finding_ids: list[str]
    agent_id: str
    evidence_event_ids: list[str]
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Claim(DomainModel):
    category: str
    text: str = Field(max_length=2000)
    evidence_ids: list[str] = Field(max_length=100)


class InvestigationReport(DomainModel):
    case_id: str
    summary: str = Field(max_length=4000)
    observed_facts: list[Claim]
    detector_findings: list[Claim]
    hypotheses: list[Claim]
    limitations: list[str]
    evidence_citations: list[str]
    recommended_steps: list[str]
    response_options: list[str]
    generated_by: str
    model_deployment: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class ContainmentAction(DomainModel):
    action_id: str
    case_id: str
    target_id: str
    action_type: str
    justification: str
    approval_status: str = "proposed"
    approved_by: str | None = None
    audit_events: list[dict[str, Any]] = Field(default_factory=list)
    simulated_only: bool = True
