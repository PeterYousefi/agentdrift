"""Reproducible metadata only. Ground truth never enters event payloads."""

from datetime import datetime, timedelta, timezone
from random import Random
from uuid import NAMESPACE_URL, uuid5

from app.models import MovementEvent, Operation

MB = 1024 * 1024
EPOCH = datetime(2026, 10, 1, tzinfo=timezone.utc)
AGENT = "ag-07"
RESOURCE = "res:research-features"
MODEL = "dst:forecast-model"
EXTERNAL = "dst:unknown-ext"

CATALOG = [
    ("normal", "Normal research workflow", "Known resource and endpoint; ordinary volume.", False),
    ("spike", "Sudden outbound transfer", "Known endpoint with an abnormal transfer burst.", True),
    (
        "novel-endpoint",
        "Novel external endpoint",
        "First-seen destination merits review, not a maliciousness verdict.",
        True,
    ),
    (
        "read-then-send",
        "Sensitive read → stage → send",
        "Restricted access, staging and novel outbound transfer.",
        True,
    ),
    (
        "low-and-slow",
        "Gradual low-and-slow drift",
        "Small repeated transfers accumulate beyond the baseline.",
        True,
    ),
    (
        "benign-unusual",
        "Benign unusual activity",
        "Approved new reporting endpoint; legitimate but statistically unusual.",
        False,
    ),
]


def stable_id(run_id: str, index: int) -> str:
    return "evt-" + uuid5(NAMESPACE_URL, f"agentdrift:{run_id}:{index}").hex[:24]


def make_event(run_id, index, seconds, operation, target, size, *, agent_id=AGENT, sensitive=False):
    resource = target if operation in (Operation.READ, Operation.WRITE) else ""
    destination = target if operation in (Operation.CONNECT, Operation.SEND) else ""
    return MovementEvent(
        event_id=stable_id(run_id, index),
        event_time=EPOCH + timedelta(seconds=seconds),
        ingest_time=EPOCH + timedelta(seconds=seconds),
        agent_id=agent_id,
        workload_id=f"workload:{agent_id}",
        identity_id=f"identity:{agent_id}",
        operation=operation,
        resource_id=resource,
        destination_id=destination,
        bytes_transferred=int(size),
        source_class="restricted" if sensitive else "internal",
        destination_class="staging"
        if operation == Operation.WRITE
        else "external-unknown"
        if destination == EXTERNAL
        else "approved-model"
        if destination
        else "internal",
        metadata={"sensitivity": "restricted" if sensitive else "ordinary"},
        scenario_run_id=run_id,
        correlation_id=f"corr:{run_id}",
    )


def historical_events(seed=7, agent_id=AGENT, windows=40):
    rng = Random(seed)
    events = []
    for i in range(windows):
        events.append(
            make_event(
                "training",
                i * 2,
                -600 * (windows - i),
                Operation.READ,
                RESOURCE,
                rng.randint(30, 50) * MB,
                agent_id=agent_id,
            )
        )
        events.append(
            make_event(
                "training",
                i * 2 + 1,
                -600 * (windows - i) + 10,
                Operation.SEND,
                MODEL,
                rng.randint(85, 115) * MB,
                agent_id=agent_id,
            )
        )
    return events


def generate(scenario_id, run_id, seed=7, agent_id=AGENT):
    if scenario_id not in {row[0] for row in CATALOG}:
        raise ValueError("unknown scenario")
    rng = Random(seed)
    rows = [(0, "READ", RESOURCE, rng.randint(35, 45) * MB, False)]
    if scenario_id == "normal":
        rows += [(4, "CONNECT", MODEL, 0, False), (8, "SEND", MODEL, 100 * MB, False)]
    elif scenario_id == "spike":
        rows += [(4, "SEND", MODEL, 450 * MB, False), (8, "SEND", MODEL, 500 * MB, False)]
    elif scenario_id == "novel-endpoint":
        rows += [(4, "CONNECT", EXTERNAL, 0, False), (8, "SEND", EXTERNAL, 90 * MB, False)]
    elif scenario_id == "read-then-send":
        rows = [
            (0, "READ", "res:restricted-positions", 800 * MB, True),
            (4, "WRITE", "stage:temp-export", 750 * MB, True),
            (8, "CONNECT", EXTERNAL, 0, False),
            (12, "SEND", EXTERNAL, 700 * MB, False),
        ]
    elif scenario_id == "low-and-slow":
        rows += [(i * 60, "SEND", MODEL, (18 + i) * MB, False) for i in range(1, 21)]
    else:
        rows += [
            (4, "CONNECT", "dst:approved-reporting", 0, False),
            (8, "SEND", "dst:approved-reporting", 160 * MB, False),
        ]
    return [
        make_event(run_id, i, seconds, Operation(op), target, size, agent_id=agent_id, sensitive=sensitive)
        for i, (seconds, op, target, size, sensitive) in enumerate(rows)
    ]
