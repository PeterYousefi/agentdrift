from app.detection import build_baseline
from app.evidence import graph
from app.scenarios import generate, historical_events
from app.storage import SQLiteStore, partition


def test_persistence_and_isolation(tmp_path):
    path = str(tmp_path / "evidence.sqlite")
    a, b = partition("session-a"), partition("session-b")
    store = SQLiteStore(path)
    store.put(a, "event:e1", {"id": "e1"})
    assert SQLiteStore(path).get(a, "event:e1") == {"id": "e1"}
    assert store.get(b, "event:e1") is None
    store.put(a, "event:e1", {"id": "e1"})
    assert len(store.list(a, "event:")) == 1
    store.delete_partition(a)
    assert store.list(a, "event:") == []


def test_graph_grounded_and_order_independent():
    events = generate("read-then-send", "r")
    baseline = build_baseline(historical_events(), "ag-07")
    result = graph("case", events, baseline)
    assert result == graph("case", events[::-1] + events, baseline)
    assert {id for edge in result["edges"] for id in edge["eventIds"]} == {e.event_id for e in events}
    assert len(result["nodes"]) == 4
