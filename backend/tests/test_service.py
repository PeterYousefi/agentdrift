import pytest

from app.scenarios import generate
from app.service import Service
from app.storage import SQLiteStore


def test_pipeline_duplicate_and_case_isolation(tmp_path):
    service = Service(SQLiteStore(str(tmp_path / "db")))
    run = service.start("a", "read-then-send", 1)
    events = generate("read-then-send", run["runId"])
    service.ingest("a", run["runId"], events[::-1])
    assert service.ingest("a", run["runId"], events) == 0
    case = service.cases("a")[0]
    assert set(case["evidenceIds"]) == {e.event_id for e in events}
    assert service.case_graph("a", case["id"])["edges"]
    assert service.cases("b") == []
    with pytest.raises(KeyError):
        service.case("b", case["id"])
    conflict = events[0].model_copy(update={"bytes_transferred": 1})
    with pytest.raises(ValueError):
        service.ingest("a", run["runId"], [conflict])


def test_pause_resume_and_restart(tmp_path):
    path = str(tmp_path / "db")
    service = Service(SQLiteStore(path))
    run = service.start("a", "normal", 1)
    assert service.control("a", run["runId"], "pause")["status"] == "paused"
    restarted = Service(SQLiteStore(path))
    assert restarted.run("a", run["runId"])["status"] == "paused"
    assert restarted.control("a", run["runId"], "resume")["status"] == "running"
    new = restarted.control("a", run["runId"], "reset")
    assert new["runId"] != run["runId"]
