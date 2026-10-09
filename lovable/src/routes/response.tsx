import { isDemoMode } from "@/api";
import { LiveResponse } from "@/components/LiveResponse";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { pageMeta } from "@/lib/seo";
import { ACTIONS, INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import { useDemo } from "@/lib/demo-store";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Mono,
  PageHeader,
  Panel,
  ProvenanceLabel,
  RiskTag,
  Tag,
} from "@/components/design-system/primitives";
import { ContainmentCard, SimulatedBanner } from "@/components/investigation/ContainmentCard";

export const Route = createFileRoute("/response")({
  head: () =>
    pageMeta(
      "Response center",
      "Human-approval workflow for simulated containment, with policy checks and a local audit trail.",
    ),
  component: () => (isDemoMode ? <Response /> : <LiveResponse />),
});

function Response() {
  const statuses = useDemo((s) => s.actionStatus);
  const audit = useDemo((s) => s.audit);
  const [sel, setSel] = useState(ACTIONS[0].id);
  const action = ACTIONS.find((a) => a.id === sel)!;

  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Human in the loop"
        title="Response center"
        description="The detector proposes; a human decides. Nothing on this page touches real infrastructure."
        actions={<ProvenanceLabel kind="human" />}
      />
      <div className="mb-5">
        <SimulatedBanner />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ul className="space-y-2">
          {ACTIONS.map((a) => {
            const st = statuses[a.id];
            const c = INVESTIGATION_BY_ID[a.caseId];
            return (
              <li key={a.id}>
                <button
                  onClick={() => setSel(a.id)}
                  className={cn(
                    "w-full rounded-md border bg-card px-3 py-3 text-left shadow-panel",
                    a.id === sel
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Mono className="text-muted-foreground">{a.id}</Mono>
                    <Tag tone={st === "approved" ? "ink" : st === "rejected" ? "neutral" : "warn"}>
                      {st}
                    </Tag>
                  </div>
                  <div className="mt-1 text-[13px] font-medium leading-snug">{a.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Mono className="text-muted-foreground">{a.caseId}</Mono>
                    <RiskTag level={c.severity} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <Panel
          eyebrow="Proposed action"
          title={
            <Link
              to="/investigations/$caseId"
              params={{ caseId: action.caseId }}
              className="hover:text-primary"
            >
              {INVESTIGATION_BY_ID[action.caseId].title}
            </Link>
          }
        >
          <div className="max-w-2xl">
            <ContainmentCard key={action.id} action={action} />
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-6"
        eyebrow="Local demonstration audit trail"
        title={`${audit.length} entries · this browser session`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="border-b border-border bg-muted/60 text-left">
              <tr>
                {["Time", "Entry", "Action", "Case", "Decision", "Actor", "Note"].map((h) => (
                  <th key={h} className="eyebrow px-4 py-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audit.map((e) => (
                <tr key={e.id} className="animate-event-in">
                  <td className="px-4 py-2">
                    <Mono className="text-muted-foreground">{fmtDateTime(e.ts)}</Mono>
                  </td>
                  <td className="px-4">
                    <Mono>{e.id}</Mono>
                  </td>
                  <td className="px-4">
                    <Mono>{e.actionId}</Mono>
                  </td>
                  <td className="px-4">
                    <Mono>{e.caseId}</Mono>
                  </td>
                  <td className="px-4">
                    <Tag
                      tone={
                        e.decision === "approved"
                          ? "ink"
                          : e.decision === "rejected"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {e.decision}
                    </Tag>
                  </td>
                  <td className="px-4">{e.actor}</td>
                  <td className="px-4 text-muted-foreground">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
