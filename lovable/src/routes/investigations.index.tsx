import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import { useDemo } from "@/lib/demo-store";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { fmtDateTime } from "@/lib/format";
import {
  Mono,
  PageHeader,
  RiskTag,
  SyntheticBadge,
  Tag,
} from "@/components/design-system/primitives";
import { ScoreScale } from "@/components/investigation/DetectorReadout";

export const Route = createFileRoute("/investigations/")({
  head: () =>
    pageMeta(
      "Investigations",
      "Open and closed synthetic investigations of AI-agent behavioral drift.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.investigations()),
  component: InvestigationsList,
});

function InvestigationsList() {
  const { data } = useSuspenseQuery(q.investigations());
  const statuses = useDemo((s) => s.actionStatus);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow="Cases"
        title="Investigations"
        description="Each case is a window of events whose sequence drifted from the agent's own baseline."
        actions={<SyntheticBadge />}
      />
      <div className="grid gap-3">
        {data.map((c) => {
          const status = c.actionId && statuses[c.actionId] === "approved" ? "contained" : c.status;
          return (
            <Link
              key={c.id}
              to="/investigations/$caseId"
              params={{ caseId: c.id }}
              className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-panel transition-colors hover:border-primary/50 md:grid-cols-[1fr_200px_120px]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Mono className="text-muted-foreground">{c.id}</Mono>
                  <Tag>{c.kind}</Tag>
                  <Tag
                    tone={status === "contained" ? "ink" : status === "closed" ? "neutral" : "warn"}
                  >
                    {status}
                  </Tag>
                </div>
                <div className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
                  {c.title}
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{c.summary}</p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="eyebrow">Score</span>
                  <Mono>{c.score.toFixed(2)}</Mono>
                </div>
                <div className="mt-2">
                  <ScoreScale score={c.score} compact />
                </div>
                <div className="mt-2 text-[11.5px] text-muted-foreground">
                  {AGENT_BY_ID[c.agentId].name}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 md:items-end">
                <RiskTag level={c.severity} />
                <Mono className="text-muted-foreground">{fmtDateTime(c.openedAt)}</Mono>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
