import pytest

from app.containment import decide, propose
from app.scenarios import generate
from app.service import Service
from app.storage import SQLiteStore


def test_human_transition_audit_and_session_isolation(tmp_path):
    service = Service(SQLiteStore(str(tmp_path / "db")))
    run = service.start("a", "read-then-send")
    service.ingest("a", run["runId"], generate("read-then-send", run["runId"]))
    case = service.cases("a")[0]
    action = propose(service, "a", case["id"])
    assert action["status"] == "proposed"
    assert service.case("a", case["id"])["status"] == "open"
    with pytest.raises(KeyError):
        decide(service, "b", action["id"], "approved", "")
    approved = decide(service, "a", action["id"], "approved", "Reviewed evidence")
    assert approved["simulatedOnly"] is True
    assert len(approved["audit"]) == 3
    assert service.case("a", case["id"])["status"] == "contained"
    assert service.run("a", run["runId"])["simulatedPolicy"] == "paused"
    with pytest.raises(ValueError):
        decide(service, "a", action["id"], "rejected", "")
