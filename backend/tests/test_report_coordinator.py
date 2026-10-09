import threading
import time
from datetime import datetime, timezone

import pytest

from app.report_coordinator import ReportCoordinator
from app.service import Service
from app.storage import SQLiteStore


def coordinator(tmp_path):
    service = Service(SQLiteStore(str(tmp_path / "reports.sqlite")))
    run = service.start("visitor", "read-then-send", 1000)
    time.sleep(0.03)
    case = service.advance("visitor", run["runId"])["caseId"]
    return ReportCoordinator(service, threading.RLock()), case


def test_persistent_global_and_session_quotas(tmp_path, monkeypatch):
    manager, _ = coordinator(tmp_path)
    manager.reserve("visitor")
    manager.reserve("visitor")
    with pytest.raises(RuntimeError, match="quota_exhausted"):
        manager.reserve("visitor")
    fresh = ReportCoordinator(Service(SQLiteStore(str(tmp_path / "reports.sqlite"))), threading.RLock())
    with pytest.raises(RuntimeError, match="quota_exhausted"):
        fresh.reserve("visitor")
    monkeypatch.setenv("LLM_MONTHLY_ATTEMPT_LIMIT", "2")
    with pytest.raises(RuntimeError, match="quota_exhausted"):
        fresh.reserve("new-visitor")
    usage = fresh.service.store.get("system", "llm-usage")
    assert usage["monthly"] == 2
    assert usage["month"] == datetime.now(timezone.utc).strftime("%Y-%m")


def test_read_paths_never_consume_model_attempts(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://test.invalid")
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "test")
    manager, case = coordinator(tmp_path)
    report = manager.report("visitor", case)
    assert report.generated_by == "deterministic"
    assert report.fallback_reason == "not_requested"
    assert manager.service.store.get("system", "llm-usage") is None
    assert manager.report("visitor", case).created_at == report.created_at


def test_busy_provider_falls_back_without_budget_use(tmp_path, monkeypatch):
    monkeypatch.setattr("app.report_coordinator.configured", lambda: True)
    manager, case = coordinator(tmp_path)
    manager.slot.acquire()
    try:
        report = manager.report("visitor", case, generate=True)
        assert report.fallback_reason == "busy"
        assert manager.service.store.get("system", "llm-usage") is None
    finally:
        manager.slot.release()
