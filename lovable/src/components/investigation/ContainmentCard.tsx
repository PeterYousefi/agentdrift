import { useState } from "react";
import { CheckCircle2, ShieldAlert, TriangleAlert, XCircle } from "lucide-react";
import type { ContainmentAction } from "@/types";
import { api } from "@/api";
import { useDemo } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Mono, Tag } from "@/components/design-system/primitives";
import { cn } from "@/lib/utils";

export function SimulatedBanner() {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-dashed border-ink/40 bg-muted px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink">
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Simulated containment — no infrastructure
      is changed
    </div>
  );
}

export function ContainmentCard({
  action,
  compact,
}: {
  action: ContainmentAction;
  compact?: boolean;
}) {
  const status = useDemo((s) => s.actionStatus[action.id] ?? "proposed");
  const [note, setNote] = useState("");
  const decided = status !== "proposed";
  return (
    <div className="space-y-3">
      <SimulatedBanner />
      <div>
        <div className="flex items-center justify-between gap-2">
          <Mono className="text-muted-foreground">
            {action.id} · {action.caseId}
          </Mono>
          <Tag tone={status === "approved" ? "ink" : status === "rejected" ? "neutral" : "warn"}>
            {status}
          </Tag>
        </div>
        <h3
          className={cn(
            "mt-1 font-semibold leading-snug tracking-tight text-foreground",
            compact ? "text-[13.5px]" : "text-[16px]",
          )}
        >
          {action.title}
        </h3>
      </div>
      <dl className="space-y-2 text-[12.5px]">
        <div>
          <dt className="eyebrow">Target workload</dt>
          <dd>
            <Mono>{action.target}</Mono>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Expected effect</dt>
          <dd className="leading-snug text-foreground">{action.effect}</dd>
        </div>
        <div>
          <dt className="eyebrow">Reversibility</dt>
          <dd className="leading-snug text-muted-foreground">{action.reversible}</dd>
        </div>
      </dl>
      <div>
        <div className="eyebrow mb-1">Policy checks</div>
        <ul className="divide-y divide-border rounded-sm border border-border">
          {action.checks.map((c) => (
            <li key={c.label} className="flex gap-2 px-2.5 py-1.5">
              {c.status === "pass" ? (
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  aria-label="pass"
                />
              ) : (
                <TriangleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-ink"
                  aria-label="warning"
                />
              )}
              <div>
                <div className="text-[12px] font-medium text-foreground">{c.label}</div>
                <div className="text-[11px] text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!decided ? (
        <div className="space-y-2">
          <label className="block">
            <span className="eyebrow">Analyst note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for decision"
              className="mt-1 h-8 w-full rounded-sm border border-border bg-card px-2 text-[12.5px] outline-none focus:border-primary"
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="ink"
              className="flex-1"
              onClick={() => api.approveContainment(action.id, note)}
            >
              <CheckCircle2 /> Approve simulated containment
            </Button>
            <Button variant="outline" onClick={() => api.rejectContainment(action.id, note)}>
              <XCircle /> Reject
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-sm border px-3 py-2 text-[12.5px]",
            status === "approved"
              ? "border-ink bg-ink text-primary-foreground"
              : "border-border bg-muted text-foreground",
          )}
        >
          {status === "approved"
            ? "Approved. In this demo the case is marked contained and the decision is written to the local audit trail. A real deployment would hand off to a permissioned backend."
            : "Rejected. Recorded in the local audit trail; the case remains open."}
        </div>
      )}
    </div>
  );
}
