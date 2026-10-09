from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import MovementEvent


def event(**overrides):
    data = dict(
        event_id="e1",
        event_time=datetime.now(timezone.utc),
        agent_id="a1",
        workload_id="w1",
        identity_id="i1",
        operation="READ",
        scenario_run_id="r1",
        correlation_id="c1",
    )
    return MovementEvent(**(data | overrides))


def test_health_and_openapi():
    with TestClient(app) as client:
        assert client.get("/health").json()["synthetic_only"] is True
        assert client.get("/ready").status_code == 200
        assert "/health" in client.get("/openapi.json").json()["paths"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"operation": "DELETE"},
        {"bytes_transferred": -1},
        {"event_time": datetime(2026, 1, 1)},
        {"metadata": {"text": "x" * 4097}},
        {"event_id": ""},
        {"unexpected": "field"},
    ],
)
def test_reject_invalid_events(overrides):
    with pytest.raises(ValidationError):
        event(**overrides)


def test_event_json_roundtrip():
    original = event(bytes_transferred=1024)
    assert MovementEvent.model_validate_json(original.model_dump_json()) == original
