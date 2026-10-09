"""Transparent statistical and temporal detector; no scenario labels are consulted."""

from collections import defaultdict
from math import exp
from statistics import median

from app.models import BehaviorBaseline, DetectionFinding, Operation, Severity

VERSION = "rules-1.2"
# Trusted server policy, independent of scenario labels and untrusted event metadata.
APPROVED_DESTINATIONS = {"ag-07": frozenset({"dst:approved-reporting"})}
WINDOW = 300
# Sequence correlation is independent of the statistical volume window.
SEQUENCE_WINDOW = 900
# Trusted configuration, not a claim that a transfer is benign. Per-window allowances
# keep solitary ordinary exports visible at review-below-threshold rather than severe.
ORDINARY_EXPORT_ALLOWANCES = {"ag-07": {"dst:forecast-model": 2 * 1024**3, "dst:approved-reporting": 1024**3}}
VOLUME_ONLY_REVIEW_SCORE = 25


def ordered(events):
    return sorted({e.event_id: e for e in events}.values(), key=lambda e: (e.event_time, e.event_id))


def build_baseline(events, agent_id):
    selected = [e for e in ordered(events) if e.agent_id == agent_id]
    buckets = defaultdict(int)
    for e in selected:
        if e.operation == Operation.SEND:
            buckets[int(e.event_time.timestamp()) // WINDOW] += e.bytes_transferred
    values = list(buckets.values())
    center = median(values) if values else 0
    mad = median(abs(v - center) for v in values) if values else 0
    return BehaviorBaseline(
        agent_id=agent_id,
        baseline_window=f"{WINDOW}s historical nonempty send windows",
        typical_outbound_bytes=center,
        outbound_variability=max(mad * 1.4826, center * 0.1, 1),
        known_resource_ids=sorted({e.resource_id for e in selected if e.resource_id}),
        known_destination_ids=sorted({e.destination_id for e in selected if e.destination_id}),
        typical_operations=sorted({e.operation for e in selected}),
        sample_count=len(values),
        baseline_quality="stable" if len(values) >= 20 else "learning",
    )


def extract(events, baseline):
    events = [e for e in ordered(events) if e.agent_id == baseline.agent_id]
    sends = [e for e in events if e.operation == Operation.SEND]
    reads = [e for e in events if e.operation == Operation.READ]
    peak = max(
        (
            sum(
                other.bytes_transferred
                for other in sends
                if 0 <= (end.event_time - other.event_time).total_seconds() < WINDOW
            )
            for end in sends
        ),
        default=0,
    )
    novel_dest = [
        e for e in events if e.destination_id and e.destination_id not in baseline.known_destination_ids
    ]
    novel_resources = [e for e in reads if e.resource_id not in baseline.known_resource_ids]
    sequence = []
    for send in sends:
        for read in reads:
            if (
                read.source_class != "restricted"
                or not 0 < (send.event_time - read.event_time).total_seconds() <= SEQUENCE_WINDOW
            ):
                continue
            # Search within the actual workflow; an unrelated earlier WRITE must
            # neither complete nor mask a genuine correlated sequence.
            stages = [
                e
                for e in events
                if e.operation == Operation.WRITE
                and read.event_time < e.event_time < send.event_time
                and e.correlation_id == read.correlation_id == send.correlation_id
                and e.scenario_run_id == read.scenario_run_id == send.scenario_run_id
            ]
            for stage in stages:
                connection = next(
                    (
                        e
                        for e in events
                        if e.operation == Operation.CONNECT
                        and e.destination_id == send.destination_id
                        and stage.event_time < e.event_time <= send.event_time
                        and e.correlation_id == send.correlation_id
                        and e.scenario_run_id == send.scenario_run_id
                    ),
                    None,
                )
                if connection:
                    sequence = [e.event_id for e in [read, stage, connection, send]]
                    break
            if sequence:
                break
    duration = max(1, (events[-1].event_time - events[0].event_time).total_seconds()) if events else 1
    expected_windows = max(1, duration / 600)  # training fixture has one active cycle per ten minutes
    total = sum(e.bytes_transferred for e in sends)
    expected = baseline.typical_outbound_bytes * expected_windows
    intervals = [(b.event_time - a.event_time).total_seconds() for a, b in zip(sends, sends[1:])]
    return {
        "outbound_window_bytes": peak,
        "outbound_total_bytes": total,
        "peak_window_send_count": max(
            (
                sum(0 <= (end.event_time - other.event_time).total_seconds() < WINDOW for other in sends)
                for end in sends
            ),
            default=0,
        ),
        "restricted_read_count": sum(e.source_class == "restricted" for e in reads),
        "sequence_window_seconds": SEQUENCE_WINDOW,
        "read_bytes": sum(e.bytes_transferred for e in reads),
        "volume_ratio": peak / max(1, baseline.typical_outbound_bytes),
        "robust_deviation": max(0, (peak - baseline.typical_outbound_bytes) / baseline.outbound_variability),
        "destination_novelty": len({e.destination_id for e in novel_dest}),
        "resource_novelty": len({e.resource_id for e in novel_resources}),
        "unapproved_destination_novelty": len(
            {
                e.destination_id
                for e in novel_dest
                if e.destination_id not in APPROVED_DESTINATIONS.get(baseline.agent_id, frozenset())
            }
        ),
        "sensitivity_weighted_bytes": sum(
            e.bytes_transferred * (3 if e.source_class == "restricted" else 1) for e in reads
        ),
        "sequence_event_ids": sequence,
        "read_to_send_seconds": min(
            (abs((s.event_time - r.event_time).total_seconds()) for s in sends for r in reads), default=None
        ),
        "destination_diversity": len({e.destination_id for e in sends}),
        "transfer_burstiness": sum(i <= 10 for i in intervals) / max(1, len(intervals)),
        "repeated_small_transfers": sum(
            e.bytes_transferred < baseline.typical_outbound_bytes * 0.5 for e in sends
        ),
        "cumulative_ratio": total / max(1, expected),
        "access_frequency_per_minute": len(reads) / max(1, duration / 60),
        "identity_mismatch_count": sum(
            e.identity_id != f"identity:{e.agent_id}" or e.workload_id != f"workload:{e.agent_id}"
            for e in events
        ),
        "baseline": baseline.model_dump(mode="json"),
    }


def detect(events, baseline):
    events = [e for e in ordered(events) if e.agent_id == baseline.agent_id]
    if not events:
        return None
    f = extract(events, baseline)
    statistical_volume = (1 - exp(-max(0, f["robust_deviation"] - 3) / 8)) * 60
    sends = [e for e in events if e.operation == Operation.SEND]
    allowances = ORDINARY_EXPORT_ALLOWANCES.get(baseline.agent_id, {})
    within_allowance = bool(sends) and all(
        e.destination_id in allowances and e.bytes_transferred <= allowances[e.destination_id] for e in sends
    )
    ordinary_export = (
        within_allowance
        and f["peak_window_send_count"] == 1
        and not f["restricted_read_count"]
        and not f["sequence_event_ids"]
        and not f["resource_novelty"]
        and not f["identity_mismatch_count"]
    )
    # Learning baselines lack enough volume evidence; novelty, identity, sequence
    # and cumulative rules remain independent. Never adapt to unverified live sends.
    volume_score = statistical_volume if baseline.baseline_quality == "stable" else 0
    if ordinary_export:
        volume_score = min(volume_score, VOLUME_ONLY_REVIEW_SCORE)
    f["statistical_volume_score"] = statistical_volume
    f["volume_policy_applied"] = (
        "learning_baseline"
        if baseline.baseline_quality != "stable"
        else ("ordinary_export_allowance" if ordinary_export else "full_volume")
    )
    cumulative = (1 - exp(-max(0, f["cumulative_ratio"] - 2))) if f["repeated_small_transfers"] >= 8 else 0
    # Statistical deviation is preserved separately from investigation policy.
    contributions = {
        "VOLUME_DEVIATION": volume_score,
        "NOVEL_DESTINATION": min(1, f["unapproved_destination_novelty"]) * 35,
        "NOVEL_RESOURCE": min(1, f["resource_novelty"]) * 10,
        "RESTRICTED_STAGE_SEND": bool(f["sequence_event_ids"]) * 50,
        "CUMULATIVE_DRIFT": cumulative * 65,
        "ATTRIBUTION_MISMATCH": min(1, f["identity_mismatch_count"]) * 25,
    }
    score = min(100, sum(contributions.values()))
    severity = (
        Severity.CRITICAL
        if score >= 80
        else Severity.ELEVATED
        if score >= 60
        else Severity.REVIEW
        if score >= 30
        else Severity.NORMAL
    )
    f["contributions"] = contributions
    f["scoring_method"] = "bounded robust deviation + novelty + ordered correlation + cumulative deviation"
    return DetectionFinding(
        finding_id=f"finding:{events[0].scenario_run_id}:{baseline.agent_id}",
        detector_name="behavioral-sequence",
        agent_id=baseline.agent_id,
        window_start=events[0].event_time,
        window_end=events[-1].event_time,
        anomaly_score=round(score, 3),
        severity=severity,
        feature_values=f,
        evidence_event_ids=[e.event_id for e in events],
        explanation_codes=[code for code, value in contributions.items() if value > 0],
        detector_version=VERSION,
    )
