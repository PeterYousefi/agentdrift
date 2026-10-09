from app.detection import build_baseline
from app.evidence import graph
from app.scenarios import generate, historical_events


def test_graph_directions_and_provenance():
    events = generate("read-then-send", "r")
    value = graph("case", events[::-1] + events, build_baseline(historical_events(), "ag-07"))
    by_id = {e.event_id: e for e in events}
    assert len(value["edges"]) == 4
    for edge in value["edges"]:
        event = by_id[edge["eventIds"][0]]
        target = event.resource_id or event.destination_id
        expected = (target, event.agent_id) if event.operation == "READ" else (event.agent_id, target)
        assert (edge["source"], edge["target"]) == expected
        assert edge["bytes"] == event.bytes_transferred
    assert (
        next(n for n in value["nodes"] if n["id"] == "res:restricted-positions")["label"]
        == "Restricted positions dataset"
    )


def test_repeated_transfer_edges_keep_all_evidence():
    events = generate("low-and-slow", "r")
    value = graph("case", events, build_baseline(historical_events(), "ag-07"))
    sends = next(e for e in value["edges"] if e["op"] == "SEND")
    assert len(sends["eventIds"]) == 20
    assert sends["bytes"] == sum(e.bytes_transferred for e in events if e.operation == "SEND")
