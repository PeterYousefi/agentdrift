"""Single-replica report coordination and durable, fail-closed model attempt quotas."""

import os
import threading
from datetime import datetime, timezone

from app.evidence_bundle import PROMPT_VERSION, build_bundle
from app.models import InvestigationReport
from app.reports import configured, generate_report


class ReportCoordinator:
    def __init__(self, service, lock):
        self.service = service
        self.lock = lock
        self.slot = threading.BoundedSemaphore(1)

    def reserve(self, session):
        now = datetime.now(timezone.utc)
        month, day = now.strftime("%Y-%m"), now.strftime("%Y-%m-%d")
        with self.lock:
            store = self.service.store
            global_usage = store.get("system", "llm-usage") or {}
            session_usage = store.get(session, "llm-usage") or {}
            monthly = global_usage.get("monthly", 0) if global_usage.get("month") == month else 0
            daily = global_usage.get("daily", 0) if global_usage.get("day") == day else 0
            personal = session_usage.get("attempts", 0) if session_usage.get("day") == day else 0
            if (
                monthly >= min(100, max(0, int(os.getenv("LLM_MONTHLY_ATTEMPT_LIMIT", "100"))))
                or daily >= min(10, max(0, int(os.getenv("LLM_DAILY_ATTEMPT_LIMIT", "10"))))
                or personal >= min(2, max(0, int(os.getenv("LLM_SESSION_DAILY_ATTEMPT_LIMIT", "2"))))
            ):
                raise RuntimeError("quota_exhausted")
            # Reserve before provider invocation. Never refund failures; retries also reserve.
            # Global-first writes fail closed if persistence fails partway through.
            store.put(
                "system",
                "llm-usage",
                {"month": month, "day": day, "monthly": monthly + 1, "daily": daily + 1},
            )
            store.put(session, "llm-usage", {"day": day, "attempts": personal + 1})

    def report(self, session, case_id, generate=False, correlation_id=None):
        with self.lock:
            case = self.service.case(session, case_id)
            events = self.service.case_events(session, case_id)
            finding = self.service.store.get(session, "finding-" + case["runId"])
            _, fingerprint = build_bundle(case, events, finding)
            existing = self.service.store.get(session, "report-" + case_id)
            if (
                existing
                and existing.get("evidence_fingerprint") == fingerprint
                and existing.get("prompt_version") == PROMPT_VERSION
            ):
                report = InvestigationReport.model_validate(existing)
                if not generate or (
                    report.generated_by == "azure-openai"
                    and report.model_deployment == os.getenv("AZURE_OPENAI_DEPLOYMENT")
                ):
                    return report
        if generate and configured():
            if not self.slot.acquire(blocking=False):
                report = generate_report(
                    case, events, finding, allow_model=False, correlation_id=correlation_id
                )
                report.fallback_reason = "busy"
                return report
            try:
                report = generate_report(
                    case,
                    events,
                    finding,
                    reserve=lambda: self.reserve(session),
                    correlation_id=correlation_id,
                )
            finally:
                self.slot.release()
        else:
            report = generate_report(case, events, finding, allow_model=False, correlation_id=correlation_id)
            if not generate and configured():
                report.fallback_reason = "not_requested"
        with self.lock:
            current_case = self.service.case(session, case_id)
            _, current_fingerprint = build_bundle(
                current_case,
                self.service.case_events(session, case_id),
                self.service.store.get(session, "finding-" + current_case["runId"]),
            )
            if current_fingerprint != fingerprint:
                raise ValueError("Evidence changed during generation; request analysis again")
            self.service.store.put(session, "report-" + case_id, report.model_dump(mode="json"))
        return report
