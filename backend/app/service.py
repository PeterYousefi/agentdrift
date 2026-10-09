import time
from uuid import uuid4

from app.detection import build_baseline, detect
from app.evidence import graph, ui_event
from app.models import MovementEvent
from app.scenarios import AGENT, CATALOG, generate, historical_events


class Service:
    def __init__(self, store):
        self.store = store
        self.baseline = build_baseline(historical_events(), AGENT)

    def runs(self, session):
        return self.store.list(session, "run-")

    def run(self, session, run_id):
        value = self.store.get(session, run_id)
        if value is None:
            raise KeyError("run not found")
        return value

    def start(self, session, scenario, rate=20):
        if len(self.runs(session)) >= 12:
            raise ValueError("Session run limit reached; reset the session")
        run_id = "run-" + uuid4().hex
        # Validate before persistence; labels stay only in the evaluation catalog.
        generate(scenario, run_id)
        value = {
            "runId": run_id,
            "scenarioId": scenario,
            "startedAt": time.time(),
            "anchor": time.time(),
            "elapsed": 0,
            "rate": rate,
            "status": "running",
            "caseId": None,
            "eventCount": 0,
        }
        self.store.put(session, run_id, value)
        return self.advance(session, run_id)

    def events(self, session, run_id):
        self.run(session, run_id)
        values = self.store.list(session, f"event-{run_id}-")
        return sorted(
            [MovementEvent.model_validate(v) for v in values], key=lambda e: (e.event_time, e.event_id)
        )

    def ingest(self, session, run_id, events):
        run = self.run(session, run_id)
        accepted = 0
        for event in events:
            if event.scenario_run_id != run_id:
                raise ValueError("event does not belong to run")
            key = f"event-{run_id}-{event.event_id}"
            existing = self.store.get(session, key)
            if existing:
                # Event identity cannot be reused to replace prior evidence.
                old = MovementEvent.model_validate(existing)
                if old.model_dump(exclude={"ingest_time"}) != event.model_dump(exclude={"ingest_time"}):
                    raise ValueError("conflicting duplicate event ID")
                continue
            self.store.put(session, key, event.model_dump(mode="json"))
            accepted += 1
        evidence = self.events(session, run_id)
        finding = detect(evidence, self.baseline)
        if finding:
            self.store.put(session, f"finding-{run_id}", finding.model_dump(mode="json"))
            if finding.anomaly_score >= 30:
                case_id = f"case-{run_id[4:]}"
                previous = self.store.get(session, case_id)
                case = {
                    "id": case_id,
                    "title": f"{finding.agent_id} · behavioral deviation",
                    "kind": "Correlated synthetic movement",
                    "agentId": finding.agent_id,
                    "status": previous["status"] if previous else "open",
                    "severity": finding.severity,
                    "openedAt": previous["openedAt"] if previous else finding.window_end.isoformat(),
                    "score": finding.anomaly_score / 100,
                    "summary": "Computed anomaly requiring human review; intent is unproven.",
                    "evidenceIds": finding.evidence_event_ids,
                    "runId": run_id,
                }
                if previous and previous.get("actionId"):
                    case["actionId"] = previous["actionId"]
                self.store.put(session, case_id, case)
                run["caseId"] = case_id
        run["eventCount"] = len(evidence)
        self.store.put(session, run_id, run)
        return accepted

    def advance(self, session, run_id):
        run = self.run(session, run_id)
        if run["status"] != "running":
            return run
        elapsed = run["elapsed"] + (time.time() - run["anchor"]) * run["rate"]
        generated = generate(run["scenarioId"], run_id)
        first = generated[0].event_time
        due = [e for e in generated if (e.event_time - first).total_seconds() <= elapsed]
        if len(due) <= run["eventCount"]:
            return run
        self.ingest(session, run_id, due)
        run = self.run(session, run_id)
        if len(due) == len(generated):
            run["status"] = "done"
            run["elapsed"] = (generated[-1].event_time - first).total_seconds()
            self.store.put(session, run_id, run)
        return run

    def control(self, session, run_id, operation):
        run = self.advance(session, run_id)
        if operation == "pause" and run["status"] == "running":
            run["elapsed"] += (time.time() - run["anchor"]) * run["rate"]
            run["status"] = "paused"
        elif operation == "resume" and run["status"] == "paused":
            run["anchor"] = time.time()
            run["status"] = "running"
        elif operation == "reset":
            # A reset creates a fresh run, preserving prior evidence and audit.
            return self.start(session, run["scenarioId"], run["rate"])
        else:
            raise ValueError("invalid playback transition")
        self.store.put(session, run_id, run)
        return run

    def cases(self, session):
        for run in self.runs(session):
            self.advance(session, run["runId"])
        return self.store.list(session, "case-")

    def case(self, session, case_id):
        value = self.store.get(session, case_id)
        if value is None:
            raise KeyError("case not found")
        self.advance(session, value["runId"])
        return self.store.get(session, case_id)

    def case_events(self, session, case_id):
        case = self.case(session, case_id)
        ids = set(case["evidenceIds"])
        return [e for e in self.events(session, case["runId"]) if e.event_id in ids]

    def case_graph(self, session, case_id):
        return graph(case_id, self.case_events(session, case_id), self.baseline)

    def ui_features(self, session, case_id):
        case = self.case(session, case_id)
        finding = self.store.get(session, f"finding-{case['runId']}")
        return self.features(finding)

    def features(self, finding):
        if not finding:
            return {
                "score": 0,
                "level": "normal",
                "features": [],
                "sentBytes": 0,
                "readBytes": 0,
                "volumeRatio": 0,
            }
        f = finding["feature_values"]
        features = []
        for key, code, label, raw in [
            ("volume", "VOLUME_DEVIATION", "Outbound volume", f["volume_ratio"]),
            ("destNovelty", "NOVEL_DESTINATION", "Destination novelty", f["destination_novelty"]),
            ("resourceNovelty", "NOVEL_RESOURCE", "Resource novelty", f["resource_novelty"]),
            (
                "sequence",
                "RESTRICTED_STAGE_SEND",
                "Ordered restricted → stage → send",
                len(f["sequence_event_ids"]),
            ),
        ]:
            contribution = f["contributions"][code] / 100
            features.append(
                {
                    "key": key,
                    "label": label,
                    "raw": raw,
                    "observed": str(round(raw, 2)),
                    "baseline": "Historical synthetic training",
                    "weight": 1,
                    "contribution": contribution,
                    "explanation": code,
                }
            )
        return {
            "score": finding["anomaly_score"] / 100,
            "level": finding["severity"],
            "features": features,
            "sentBytes": f["outbound_total_bytes"],
            "readBytes": f["read_bytes"],
            "volumeRatio": f["volume_ratio"],
            "detectorVersion": finding["detector_version"],
            "featureVector": f,
        }

    def catalog(self):
        result = []
        for i, (sid, name, description, expected) in enumerate(CATALOG):
            events = generate(sid, "preview")
            result.append(
                {
                    "id": sid,
                    "index": i + 1,
                    "name": name,
                    "agentId": AGENT,
                    "description": description,
                    "expected": "Review possible; anomaly does not establish intent."
                    if expected
                    else "Benign ground truth; false positives are possible.",
                    "expectedLevel": "review" if expected else "normal",
                    "events": [
                        {
                            "offset": (e.event_time - events[0].event_time).total_seconds(),
                            "operation": e.operation,
                            "target": e.resource_id or e.destination_id,
                            "bytes": e.bytes_transferred,
                        }
                        for e in events
                    ],
                }
            )
        return result

    def ui_events(self, session, run_id, case_id=None):
        return [ui_event(e, case_id, self.baseline) for e in self.events(session, run_id)]
