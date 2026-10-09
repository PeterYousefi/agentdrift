from app.detection import ordered


def ui_event(e, case_id=None, baseline=None):
    target = e.resource_id or e.destination_id
    known = (baseline.known_resource_ids + baseline.known_destination_ids) if baseline else []
    result = {
        "id": e.event_id,
        "ts": e.event_time.isoformat(),
        "agentId": e.agent_id,
        "workloadId": e.workload_id,
        "identity": e.identity_id,
        "operation": e.operation,
        "target": target,
        "bytes": e.bytes_transferred,
        "identityConfidence": 1,
        "novel": target not in known,
        "note": "Synthetic metadata",
    }
    if case_id:
        result["caseId"] = case_id
    return result


def graph(case_id, events, baseline):
    events = ordered(events)
    nodes = {}
    edges = []
    known = baseline.known_resource_ids + baseline.known_destination_ids
    for e in events:
        agent = e.agent_id
        nodes.setdefault(
            agent,
            {
                "id": agent,
                "kind": "agent",
                "label": agent,
                "sub": "Synthetic agent",
                "x": 0,
                "y": 140 * len({row.agent_id for row in events[: events.index(e)]}),
            },
        )
        target = e.resource_id or e.destination_id
        if target not in nodes:
            kind = (
                "staging" if e.destination_class == "staging" else "resource" if e.resource_id else "endpoint"
            )
            nodes[target] = {
                "id": target,
                "kind": kind,
                "label": target,
                "sub": e.destination_class,
                "novel": target not in known,
                "x": 300 if e.resource_id else 600,
                "y": 130 * sum(n["kind"] != "agent" for n in nodes.values()),
            }
        source, dest = (target, agent) if e.operation == "READ" else (agent, target)
        edges.append(
            {
                "id": f"edge:{e.event_id}",
                "source": source,
                "target": dest,
                "op": e.operation,
                "eventIds": [e.event_id],
                "bytes": e.bytes_transferred,
                "anomalous": target not in known,
            }
        )
    return {"caseId": case_id, "nodes": list(nodes.values()), "edges": edges}
