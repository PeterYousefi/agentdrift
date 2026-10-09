import time
from uuid import uuid4


def propose(service, session, case_id):
    case = service.case(session, case_id)
    if case.get("actionId"):
        return service.store.get(session, case["actionId"])
    action = {
        "id": "action-" + uuid4().hex,
        "caseId": case_id,
        "title": "Simulated agent pause",
        "target": case["agentId"],
        "effect": "Set this run's synthetic policy to paused. No cloud workload is modified.",
        "reversible": "Start a fresh scenario run to restore the synthetic policy.",
        "checks": [
            {
                "label": "Simulation only",
                "status": "pass",
                "detail": "No infrastructure execution capability",
            },
            {"label": "Human decision required", "status": "warn", "detail": "AI cannot approve this action"},
        ],
        "status": "proposed",
        "simulatedOnly": True,
        "audit": [{"ts": time.time(), "decision": "proposed", "actor": "system"}],
    }
    service.store.put(session, action["id"], action)
    case["actionId"] = action["id"]
    service.store.put(session, case_id, case)
    return action


def decide(service, session, action_id, decision, note):
    action = service.store.get(session, action_id)
    if action is None:
        raise KeyError("action not found")
    if action["status"] != "proposed":
        raise ValueError("action already decided")
    if decision not in {"approved", "rejected"}:
        raise ValueError("invalid decision")
    action["status"] = decision
    action["audit"].append(
        {"ts": time.time(), "decision": decision, "actor": "human-session-holder", "note": note}
    )
    case = service.case(session, action["caseId"])
    if decision == "approved":
        case["status"] = "contained"
        run = service.advance(session, case["runId"])
        run["simulatedPolicy"] = "paused"
        if run["status"] == "running":
            run = service.control(session, run["runId"], "pause")
            run["simulatedPolicy"] = "paused"
        service.store.put(session, run["runId"], run)
        action["audit"].append({"ts": time.time(), "decision": "simulated-execution", "actor": "simulator"})
    service.store.put(session, case["id"], case)
    service.store.put(session, action_id, action)
    return action
