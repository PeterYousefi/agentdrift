import asyncio
import json
import logging
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.containment import decide, propose
from app.models import InvestigationReport, MovementEvent
from app.reports import generate_report, narrative
from app.scenarios import AGENT, historical_events
from app.service import Service
from app.storage import create_store, partition

logger = logging.getLogger("agentdrift")
logging.basicConfig(level=logging.INFO, format="%(message)s")


class RunOptions(BaseModel):
    rate: float = Field(default=20, ge=0.1, le=1000)


class Decision(BaseModel):
    note: str = Field(default="", max_length=1000)


def create_app(store=None):
    lock = threading.RLock()
    limits = defaultdict(deque)

    @asynccontextmanager
    async def lifespan(app):
        app.state.service = Service(store or create_store())

        async def process():
            while True:
                await asyncio.sleep(10)

                # Reads and mutation use the same lock. One replica is required for this MVP.
                def tick():
                    with lock:
                        for session in app.state.service.store.list("system", "session-"):
                            if session["expires"] < time.time():
                                app.state.service.store.delete_partition(session["partition"])
                                app.state.service.store.delete("system", "session-" + session["partition"])
                                continue
                            for run in app.state.service.runs(session["partition"]):
                                if run["status"] == "running":
                                    app.state.service.advance(session["partition"], run["runId"])

                try:
                    await asyncio.to_thread(tick)
                except Exception as exc:
                    logger.error(json.dumps({"event": "pipeline_error", "error_type": type(exc).__name__}))

        task = asyncio.create_task(process())
        yield
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    app = FastAPI(title="AgentDrift", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
        ).split(","),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Demo-Session", "Last-Event-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def bounds(request: Request, call_next):
        start = time.perf_counter()
        rid = uuid4().hex
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        bucket = limits[ip]
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= 240:
            return JSONResponse({"detail": "Rate limit exceeded"}, 429, headers={"Retry-After": "60"})
        bucket.append(now)
        if len(limits) > 10000:
            for key in list(limits):
                if not limits[key] or limits[key][-1] < now - 60:
                    limits.pop(key, None)
        length = request.headers.get("content-length", "0")
        if not length.isdigit() or int(length) > 65536:
            return JSONResponse({"detail": "Payload too large"}, 413)
        if request.method in {"POST", "PUT"}:
            body = await request.body()
            if len(body) > 65536:
                return JSONResponse({"detail": "Payload too large"}, 413)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        response.headers["Cache-Control"] = "no-store"
        logger.info(
            json.dumps(
                {
                    "event": "request",
                    "request_id": rid,
                    "method": request.method,
                    "route": request.scope.get("route").path if request.scope.get("route") else "unmatched",
                    "status": response.status_code,
                    "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                }
            )
        )
        return response

    @app.exception_handler(KeyError)
    async def missing(request, exc):
        return JSONResponse({"detail": "Resource not found"}, 404)

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        return JSONResponse({"detail": str(exc)}, 409)

    def service():
        return app.state.service

    def session(x_demo_session: str = Header(default="")):
        if len(x_demo_session) < 40 or len(x_demo_session) > 128:
            raise HTTPException(401, "A valid demo session is required")
        sid = partition(x_demo_session)
        value = service().store.get("system", "session-" + sid)
        if not value or value["expires"] < time.time():
            raise HTTPException(401, "Demo session expired")
        return sid

    @app.get("/health")
    def health():
        return {"status": "ok", "synthetic_only": True}

    @app.get("/ready")
    def ready():
        service().store.get("system", "readiness")
        return {"status": "ready", "storage": type(service().store).__name__}

    @app.post("/api/v1/sessions")
    def new_session():
        with lock:
            token = secrets.token_urlsafe(32)
            sid = partition(token)
            service().store.put(
                "system", "session-" + sid, {"partition": sid, "expires": time.time() + 86400}
            )
            return {"token": token, "expiresIn": 86400}

    @app.get("/api/v1/scenarios")
    def scenarios(sid=Depends(session)):
        return service().catalog()

    @app.post("/api/v1/scenarios/{scenario_id}/runs")
    def start_run(scenario_id: str, options: RunOptions = RunOptions(), sid=Depends(session)):
        with lock:
            return service().start(sid, scenario_id, options.rate)

    @app.get("/api/v1/scenario-runs/{run_id}")
    def get_run(run_id: str, sid=Depends(session)):
        with lock:
            run = service().advance(sid, run_id)
            finding = service().store.get(sid, "finding-" + run_id)
            return run | {
                "features": service().features(finding),
                "graph": service().case_graph(sid, run["caseId"])
                if run["caseId"]
                else __import__("app.evidence", fromlist=["graph"]).graph(
                    run_id, service().events(sid, run_id), service().baseline
                ),
            }

    @app.get("/api/v1/scenario-runs/{run_id}/events")
    def run_events(run_id: str, sid=Depends(session)):
        with lock:
            run = service().advance(sid, run_id)
            return service().ui_events(sid, run_id, run["caseId"])

    @app.post("/api/v1/scenario-runs/{run_id}/{operation}")
    def control(run_id: str, operation: str, sid=Depends(session)):
        if operation not in {"pause", "resume", "reset"}:
            raise HTTPException(404)
        with lock:
            return service().control(sid, run_id, operation)

    @app.get("/api/v1/scenario-runs/{run_id}/stream")
    async def stream(
        run_id: str, request: Request, sid=Depends(session), last_event_id: str = Header(default="")
    ):
        service().run(sid, run_id)

        # Snapshot frames make reconnect independent of missed deltas.
        async def frames():
            for _ in range(240):
                if await request.is_disconnected():
                    break
                data = await asyncio.to_thread(get_run, run_id, sid)
                yield f"id: {data['eventCount']}\nevent: snapshot\ndata: {json.dumps(data)}\n\n"
                if data["status"] == "done":
                    break
                await asyncio.sleep(0.5)

        return StreamingResponse(
            frames(), media_type="text/event-stream", headers={"X-Accel-Buffering": "no"}
        )

    @app.post("/api/v1/events")
    def trusted_ingestion(
        events: list[MovementEvent],
        run_id: str,
        sid=Depends(session),
        authorization: str = Header(default=""),
    ):
        secret = os.getenv("INGESTION_TOKEN")
        if not secret or not secrets.compare_digest(authorization, "Bearer " + secret):
            raise HTTPException(403, "Trusted ingestion only")
        if len(events) > 100:
            raise HTTPException(413)
        with lock:
            return {"accepted": service().ingest(sid, run_id, events)}

    @app.get("/api/v1/investigations")
    def cases(sid=Depends(session)):
        with lock:
            return service().cases(sid)

    @app.get("/api/v1/investigations/{case_id}")
    def get_case(case_id: str, sid=Depends(session)):
        with lock:
            return service().case(sid, case_id)

    @app.get("/api/v1/investigations/{case_id}/evidence")
    def evidence(case_id: str, sid=Depends(session)):
        with lock:
            case = service().case(sid, case_id)
            return service().ui_events(sid, case["runId"], case_id)

    @app.get("/api/v1/investigations/{case_id}/graph")
    def case_graph(case_id: str, sid=Depends(session)):
        with lock:
            return service().case_graph(sid, case_id)

    @app.get("/api/v1/investigations/{case_id}/features")
    def features(case_id: str, sid=Depends(session)):
        with lock:
            return service().ui_features(sid, case_id)

    def report_for(case_id, sid):
        with lock:
            case = service().case(sid, case_id)
            existing = service().store.get(sid, "report-" + case_id)
            if existing and set(existing["evidence_citations"]) == set(case["evidenceIds"]):
                return InvestigationReport.model_validate(existing)
            events = service().case_events(sid, case_id)
            finding = service().store.get(sid, "finding-" + case["runId"])
        report = generate_report(case, events, finding)
        with lock:
            service().store.put(sid, "report-" + case_id, report.model_dump(mode="json"))
        return report

    @app.post("/api/v1/investigations/{case_id}/investigate")
    def investigate(case_id: str, sid=Depends(session)):
        return narrative(report_for(case_id, sid))

    @app.get("/api/v1/investigations/{case_id}/report")
    @app.post("/api/v1/investigations/{case_id}/report")
    def report(case_id: str, sid=Depends(session)):
        return report_for(case_id, sid)

    @app.post("/api/v1/investigations/{case_id}/containment")
    def proposal(case_id: str, sid=Depends(session)):
        with lock:
            return propose(service(), sid, case_id)

    @app.get("/api/v1/containment")
    def actions(sid=Depends(session)):
        return service().store.list(sid, "action-")

    @app.post("/api/v1/containment/{action_id}/approve")
    def approve(action_id: str, body: Decision, sid=Depends(session)):
        with lock:
            return decide(service(), sid, action_id, "approved", body.note)

    @app.post("/api/v1/containment/{action_id}/reject")
    def reject(action_id: str, body: Decision, sid=Depends(session)):
        with lock:
            return decide(service(), sid, action_id, "rejected", body.note)

    @app.get("/api/v1/agents")
    def agents(sid=Depends(session)):
        with lock:
            cases = service().cases(sid)
            events = [e for run in service().runs(sid) for e in service().events(sid, run["runId"])]
            history = historical_events()
            baseline = service().baseline
            return [
                {
                    "id": AGENT,
                    "name": "Research Agent 07",
                    "description": "Synthetic research workload",
                    "workload": "workload:" + AGENT,
                    "namespace": "demo/research",
                    "identity": "identity:" + AGENT,
                    "identityConfidence": 1,
                    "baselineState": "stable",
                    "lastActivity": events[-1].event_time.isoformat()
                    if events
                    else history[-1].event_time.isoformat(),
                    "outbound24h": sum(e.bytes_transferred for e in events if e.operation == "SEND"),
                    "risk": max(cases, key=lambda c: c["score"])["severity"] if cases else "normal",
                    "destinationDiversity": len({e.destination_id for e in events if e.destination_id}),
                    "baseline": {
                        "avgReadBytes": 40 * 1024**2,
                        "avgSendBytes": baseline.typical_outbound_bytes,
                        "knownResources": baseline.known_resource_ids,
                        "knownDestinations": baseline.known_destination_ids,
                    },
                    "history": [
                        {"day": e.event_time.isoformat(), "sent": e.bytes_transferred, "read": 0}
                        for e in history
                        if e.operation == "SEND"
                    ],
                    "caseIds": [c["id"] for c in cases],
                }
            ]

    @app.get("/api/v1/agents/{agent_id}")
    def agent(agent_id: str, sid=Depends(session)):
        if agent_id != AGENT:
            raise HTTPException(404)
        return agents(sid)[0]

    @app.get("/api/v1/movement-events")
    def movement(
        agentId: str = "",
        operation: str = "",
        q: str = "",
        caseOnly: bool = False,
        limit: int = 200,
        offset: int = 0,
        sid=Depends(session),
    ):
        if not 1 <= limit <= 500 or offset < 0 or len(q) > 200:
            raise HTTPException(422)
        with lock:
            for run in service().runs(sid):
                service().advance(sid, run["runId"])
            values = [
                event
                for run in service().runs(sid)
                for event in service().ui_events(sid, run["runId"], run["caseId"])
            ]
            values = [
                e
                for e in values
                if (not agentId or e["agentId"] == agentId)
                and (not operation or e["operation"] == operation)
                and (not caseOnly or e.get("caseId"))
                and (not q or q.lower() in json.dumps(e).lower())
            ]
            return values[offset : offset + limit]

    @app.get("/api/v1/overview")
    def overview(sid=Depends(session)):
        cases_ = cases(sid)
        events = movement(sid=sid)
        return {
            "monitoredAgents": 1,
            "openInvestigations": sum(c["status"] == "open" for c in cases_),
            "movement24h": sum(e["bytes"] for e in events),
            "novelDestinations": len(
                {e["target"] for e in events if e["novel"] and e["operation"] in {"CONNECT", "SEND"}}
            ),
            "movementTrend": [{"t": str(i), "bytes": e["bytes"]} for i, e in enumerate(events)],
            "featuredCaseId": max(cases_, key=lambda c: c["score"])["id"] if cases_ else "",
        }

    @app.get("/api/v1/detection/evaluation")
    def evaluation(sid=Depends(session)):
        from pathlib import Path

        path = Path(__file__).parent.parent / "evaluation.json"
        if not path.exists():
            raise HTTPException(503, "Evaluation has not been executed")
        return json.loads(path.read_text())

    return app


app = create_app()
