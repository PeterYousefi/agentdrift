import { Link } from "@tanstack/react-router";
import { CASE_EVENTS } from "@/fixtures/events";
import { ACTION_BY_ID, INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { ENTITIES } from "@/fixtures/entities";
import { useDemo } from "@/lib/demo-store";
import { fmtBytes, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Mono, RiskTag, Tag } from "@/components/design-system/primitives";
import { ScoreScale } from "./DetectorReadout";
import { CiteChip } from "./NarrativeNotebook";

/** Presentation-grade summary of one synthetic case: score, anomalous path and response state. */
export function CaseSummary({ caseId, onCite, activeId }: { caseId: string; onCite?: (id: string) => void; activeId?: string | null }) {
  const inv = INVESTIGATION_BY_ID[caseId];
  const status = useDemo((s) => (inv?.actionId ? s.actionStatus[inv.actionId] : undefined));
  if (!inv) return null;
  const agent = AGENT_BY_ID[inv.agentId];
  const evts = CASE_EVENTS.filter((e) => e.caseId === caseId).sort((a, b) => a.ts.localeCompare(b.ts));
  const novel = evts.filter((e) => e.novel);
  const sent = evts.filter((e) => e.operation === "SEND").reduce((t, e) => t + e.bytes, 0);
  const action = inv.actionId ? ACTION_BY_ID[inv.actionId] : undefined;
  // Collapse consecutive novel events on the same op+target into path steps.
  const path = novel.reduce<{ op: string; target: string; ids: string[] }[]>((acc, e) => {
    const last = acc[acc.length - 1];
    if (last && last.op === e.operation && last.target === e.target) last.ids.push(e.id);
    else if (e.operation !== "CONNECT") acc.push({ op: e.operation, target: e.target, ids: [e.id] });
    return acc;
  }, []);

  return (
    <section aria-label={`Case summary ${inv.id}`} className="overflow-hidden rounded-md border border-border bg-card shadow-panel">
      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-border bg-muted/60 p-5 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between"><Mono className="text-muted-foreground">{inv.id}</Mono><Tag tone="warn">Synthetic</Tag></div>
          <div className={cn("mt-3 font-mono text-[44px] leading-none tracking-tight tabular", inv.severity === "critical" ? "text-danger" : inv.severity === "elevated" ? "text-warning-ink" : "text-foreground")}>{inv.score.toFixed(2)}</div>
          <div className="mt-2 flex items-center gap-2"><RiskTag level={inv.severity} /><span className="text-[11px] text-muted-foreground">detector score</span></div>
          <div className="mt-3"><ScoreScale score={inv.score} compact /></div>
          <dl className="mt-4 space-y-1 text-[11.5px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Agent</dt><dd>{agent.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Opened</dt><dd className="font-mono">{fmtDateTime(inv.openedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Events</dt><dd className="font-mono">{evts.length} · {novel.length} first-seen</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Outbound</dt><dd className="font-mono">{fmtBytes(sent)}</dd></div>
          </dl>
        </div>
        <div className="p-5">
          <div className="eyebrow">Case summary</div>
          <h2 className="mt-1 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-foreground">{inv.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{inv.summary}</p>
          {path.length > 0 && (
            <ol className="mt-4 flex flex-wrap items-stretch gap-1.5" aria-label="Anomalous sequence">
              {path.map((p, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground" aria-hidden>→</span>}
                  <div className="rounded-sm border border-l-[3px] border-danger bg-card px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger font-mono text-[8.5px] text-primary-foreground">{i + 1}</span><span className="font-mono text-[11px] font-semibold text-danger">{p.op}</span></div>
                    <div className="mt-0.5 text-[12px] font-medium text-foreground">{ENTITIES[p.target]?.label ?? p.target}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{p.ids.map((id) => <CiteChip key={id} id={id} onClick={onCite} active={activeId === id} />)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {action && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[12px]">
              <span><span className="eyebrow mr-2">Proposed response</span>{action.title} <Tag tone={status === "approved" ? "ink" : status === "rejected" ? "neutral" : "warn"} className="ml-1">{status ?? "proposed"} · simulated</Tag></span>
              <Link to="/investigations/$caseId" params={{ caseId }} className="text-primary hover:underline">Review in workspace →</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
