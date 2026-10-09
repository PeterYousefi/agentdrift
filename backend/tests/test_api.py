import time

from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import SQLiteStore


def test_public_workflow_isolation_and_reconnect(tmp_path):
    app = create_app(SQLiteStore(str(tmp_path / "db")))
    with TestClient(app) as client:

        def session():
            return {"X-Demo-Session": client.post("/api/v1/sessions").json()["token"]}

        a, b = session(), session()
        assert client.get("/api/v1/investigations").status_code == 401
        run = client.post("/api/v1/scenarios/read-then-send/runs", headers=a, json={"rate": 1000}).json()
        time.sleep(0.03)
        state = client.get(f"/api/v1/scenario-runs/{run['runId']}", headers=a).json()
        assert state["status"] == "done"
        case_id = state["caseId"]
        assert case_id
        events = client.get(f"/api/v1/investigations/{case_id}/evidence", headers=a).json()
        graph = client.get(f"/api/v1/investigations/{case_id}/graph", headers=a).json()
        assert {id for edge in graph["edges"] for id in edge["eventIds"]} == {e["id"] for e in events}
        report = client.post(f"/api/v1/investigations/{case_id}/report", headers=a).json()
        assert report["generated_by"] == "deterministic"
        assert set(report["evidence_citations"]) == {e["id"] for e in events}
        assert client.get(f"/api/v1/investigations/{case_id}", headers=b).status_code == 404
        assert (
            client.get(
                f"/api/v1/scenario-runs/{run['runId']}/stream", headers=a | {"Last-Event-ID": "2"}
            ).text.count("event: snapshot")
            == 1
        )
        action = client.post(f"/api/v1/investigations/{case_id}/containment", headers=a).json()
        assert (
            client.post(f"/api/v1/containment/{action['id']}/approve", headers=b, json={}).status_code == 404
        )
        approved = client.post(
            f"/api/v1/containment/{action['id']}/approve", headers=a, json={"note": "Reviewed"}
        ).json()
        assert approved["audit"][-1]["decision"] == "simulated-execution"
        assert (
            client.post(f"/api/v1/containment/{action['id']}/approve", headers=a, json={}).status_code == 409
        )
        assert client.get("/api/v1/agents", headers=a).json()[0]["id"] == "ag-07"
        assert client.get("/api/v1/overview", headers=a).json()["featuredCaseId"] == case_id


def test_payload_and_ingestion_controls(tmp_path):
    with TestClient(create_app(SQLiteStore(str(tmp_path / "db")))) as client:
        header = {"X-Demo-Session": client.post("/api/v1/sessions").json()["token"]}
        assert client.post("/api/v1/events?run_id=x", headers=header, json=[]).status_code == 403
        assert (
            client.post("/api/v1/scenarios/normal/runs", headers=header, json={"rate": 1001}).status_code
            == 422
        )
        assert client.post("/api/v1/sessions", content="x" * 65537).status_code == 413
