import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { liveRequest, q } from "@/api";
import type { ContainmentAction } from "@/types";
import { Mono, PageHeader, Panel, SyntheticBadge } from "@/components/design-system/primitives";
import { ContainmentCard } from "@/components/investigation/ContainmentCard";
import { NarrativeNotebook } from "@/components/investigation/NarrativeNotebook";
import { EventDetail } from "@/components/evidence/EventDetail";

type Action = ContainmentAction & {
  audit: { ts: number; decision: string; actor: string; note?: string }[];
};
export function LiveResponse() {
  const actions = useQuery({
    queryKey: ["actions"],
    queryFn: () => liveRequest<Action[]>("/containment"),
    refetchInterval: 2000,
  });
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Human in the loop"
        title="Response center"
        description="Human decisions and simulated execution are persisted by the backend. No real infrastructure is modified."
        actions={<SyntheticBadge />}
      />
      {actions.error && <p role="alert">{actions.error.message}</p>}
      {!actions.data?.length && (
        <p className="text-sm">
          Open an{" "}
          <Link className="text-primary" to="/investigations">
            investigation
          </Link>{" "}
          to propose a simulated response.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {actions.data?.map((action) => (
          <Panel key={action.id} eyebrow={action.caseId} title={action.title}>
            <ContainmentCard key={action.id + action.status} action={action} />
            <div className="mt-4 border-t border-border pt-3">
              <Mono>Persisted audit</Mono>
              {action.audit.map((entry, i) => (
                <p key={i} className="mt-1 text-[12px]">
                  {new Date(entry.ts * 1000).toISOString()} · {entry.decision} · {entry.actor}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

export function LiveInvestigator() {
  const cases = useQuery(q.investigations());
  const [chosen, setChosen] = useState<string | null>(null);
  const caseId = chosen ?? cases.data?.[0]?.id;
  const report = useQuery({ ...q.narrative(caseId ?? ""), enabled: !!caseId });
  const evidence = useQuery({ ...q.evidence(caseId ?? ""), enabled: !!caseId });
  const [cite, setCite] = useState<string | null>(null);
  const event = evidence.data?.find((e) => e.id === cite);
  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Evidence notebook"
        title="AI investigator"
        description="Observed facts and detector findings cite stored events. Azure OpenAI is used when configured; deterministic summaries are explicitly labeled."
        actions={<SyntheticBadge />}
      />
      {(cases.error ?? report.error ?? evidence.error) && (
        <p role="alert">{(cases.error ?? report.error ?? evidence.error)?.message}</p>
      )}
      {!caseId && <p>Run a scenario to open an investigation.</p>}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <nav className="space-y-2">
          {cases.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setChosen(c.id);
                setCite(null);
              }}
              className="w-full rounded border border-border bg-card p-3 text-left text-[13px]"
            >
              {c.title}
            </button>
          ))}
        </nav>
        <Panel eyebrow="Grounded report" title="What does the evidence support?">
          {report.data?.map((entry) => (
            <NarrativeNotebook key={entry.id} entry={entry} onCite={setCite} activeId={cite} />
          ))}
        </Panel>
        <Panel eyebrow="Cited evidence" title={event?.id ?? "Select an evidence citation"}>
          {event && <EventDetail event={event} />}
        </Panel>
      </div>
    </div>
  );
}
