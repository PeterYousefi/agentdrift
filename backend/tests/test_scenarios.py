import pytest

from app.scenarios import CATALOG, generate, historical_events


@pytest.mark.parametrize("scenario", [row[0] for row in CATALOG])
def test_reproducible_and_separate_from_training(scenario):
    events = generate(scenario, "run-a")
    assert events == generate(scenario, "run-a")
    assert len({e.event_id for e in events}) == len(events)
    assert not {e.event_id for e in events} & {e.event_id for e in generate(scenario, "run-b")}
    assert max(e.event_time for e in historical_events()) < min(e.event_time for e in events)
    assert all("label" not in e.metadata and "expected" not in e.metadata for e in events)


def test_invalid_scenario_and_multiple_agents():
    with pytest.raises(ValueError):
        generate("unknown", "r")
    assert all(e.agent_id == "ag-12" for e in generate("normal", "r", agent_id="ag-12"))
