"""Pre-registered tradeoff probes, evaluated only after rules-1.2 is frozen.

Labels are subjective synthetic review policy. No ground truth enters telemetry.
These cases intentionally overlap observable benign/malicious metadata.
"""

from datetime import timedelta
from random import Random

from app.detection import build_baseline
from app.scenarios import AGENT, MB, MODEL, generate, historical_events

STRESS_TARGETS = {
    "trusted-single-transfer-needs-review": (True, True, False),
    "legitimate-export-over-allowance": (True, False, False),
    "legitimate-two-transfer-batch": (True, False, False),
    "sequence-beyond-correlation-horizon": (True, True, True),
    "restricted-read-without-staging": (True, True, False),
    "sequence-with-missing-correlation": (True, True, True),
}


def stress(scenario, seed):
    rng = Random(seed)
    run = f"stress-{scenario}-{seed}"
    baseline = build_baseline(historical_events(seed=7), AGENT)
    if scenario in {"trusted-single-transfer-needs-review", "legitimate-export-over-allowance"}:
        events = generate("normal", run, seed=seed)
        events[-1].bytes_transferred = (
            rng.randint(900, 1400) * MB
            if scenario == "trusted-single-transfer-needs-review"
            else rng.randint(2300, 3000) * MB
        )
    elif scenario == "legitimate-two-transfer-batch":
        events = generate("spike", run, seed=seed)
    elif scenario in {"sequence-beyond-correlation-horizon", "sequence-with-missing-correlation"}:
        events = generate("read-then-send", run, seed=seed)
        for event in events:
            if event.destination_id:
                event.destination_id = MODEL
            if event.operation == "SEND":
                event.bytes_transferred = rng.randint(60, 100) * MB
        if scenario == "sequence-beyond-correlation-horizon":
            start = events[0].event_time
            for event, seconds in zip(events, [0, 400, 800, rng.randint(950, 1200)]):
                event.event_time = start + timedelta(seconds=seconds)
        else:
            # Attribution to one run remains, but workflow correlation is incomplete.
            events[1].correlation_id = "unknown-workflow"
    elif scenario == "restricted-read-without-staging":
        events = generate("normal", run, seed=seed)
        events[0].source_class = "restricted"
        events[0].resource_id = "res:restricted-positions"
    else:
        raise ValueError("unknown stress case")
    return events, baseline
