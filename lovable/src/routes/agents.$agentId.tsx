import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { ENTITIES } from "@/fixtures/entities";
import { INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import { baselinePeriod, fmtBytes, fmtDateTime } from "@/lib/format";
import {
  Metric,
  Mono,
  OpTag,
  PageHeader,
  Panel,
  RiskTag,
  SyntheticBadge,
  Tag,
} from "@/components/design-system/primitives";
import { BaselineChart } from "@/components/charts/Charts";

export const Route = createFileRoute("/agents/$agentId")({
  head: ({ params }) => {
    const a = AGENT_BY_ID[params.agentId];
    return a
      ? pageMeta(a.name, a.description)
      : { meta: [{ title: "Unavailable — AgentDrift" }, { name: "robots", content: "noindex" }] };
  },
  loader: async ({ context, params }) => {
    if (!AGENT_BY_ID[params.agentId]) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(q.agent(params.agentId)),
      context.queryClient.ensureQueryData(q.events({ agentId: params.agentId })),
    ]);
  },
  component: AgentProfile,
});

function AgentProfile() {
  const { agentId } = Route.useParams();
  const { data: a } = useSuspenseQuery(q.agent(agentId));
  const { data: events } = useSuspenseQuery(q.events({ agentId }));
  const destCounts = new Map<string, number>();
  events
    .filter((e) => e.operation === "SEND")
    .forEach((e) => destCounts.set(e.target, (destCounts.get(e.target) ?? 0) + e.bytes));

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        eyebrow={`Agent · ${a.id}`}
        title={a.name}
        description={a.description}
        actions={
          <>
            <SyntheticBadge />
            <RiskTag level={a.risk} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-6 border-b border-border pb-5 md:grid-cols-5">
        <Metric
          label="Workload"
          value={<span className="text-[14px]">{a.workload}</span>}
          hint={a.namespace}
        />
        <Metric
          label="Identity"
          value={<span className="text-[14px]">{a.identity}</span>}
          hint={`attribution ${a.identityConfidence.toFixed(2)}`}
        />
        <Metric
          label="Typical outbound"
          value={fmtBytes(a.baseline.avgSendBytes)}
          hint="per 1h window"
        />
        <Metric
          label="Outbound 24h"
          value={fmtBytes(a.outbound24h)}
          tone={a.risk === "critical" ? "danger" : "default"}
        />
        <Metric
          label="Baseline"
          value={<span className="text-[14px]">{a.baselineState}</span>}
          hint="30-day synthetic history"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          id="baseline"
          eyebrow="Historical baseline"
          title={`Outbound volume · ${baselinePeriod(a.history)}`}
        >
          <BaselineChart agent={a} height={240} />
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            Dashed line is the mean of the first 10 days. Amber &gt;1.3×, vermilion &gt;1.8×.
          </p>
        </Panel>
        <div className="space-y-6">
          <Panel
            eyebrow="Baseline"
            title="Known resources & destinations"
            bodyClassName="space-y-3"
          >
            <div>
              <div className="eyebrow mb-1">Resources</div>
              <div className="flex flex-wrap gap-1">
                {a.baseline.knownResources.map((r) => (
                  <Tag key={r} tone="teal">
                    {ENTITIES[r]?.label}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Destinations</div>
              <div className="flex flex-wrap gap-1">
                {a.baseline.knownDestinations.map((r) => (
                  <Tag key={r} tone="teal">
                    {ENTITIES[r]?.label}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Observed send destinations (all time)</div>
              <ul className="space-y-1">
                {[...destCounts].map(([d, b]) => (
                  <li key={d} className="flex justify-between text-[12px]">
                    <span className={a.baseline.knownDestinations.includes(d) ? "" : "text-danger"}>
                      {ENTITIES[d]?.label}
                      {!a.baseline.knownDestinations.includes(d) && " · novel"}
                    </span>
                    <Mono>{fmtBytes(b)}</Mono>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
          <Panel eyebrow="Investigations" title="Linked cases" bodyClassName="p-0">
            {a.caseIds.length ? (
              a.caseIds.map((id) => {
                const c = INVESTIGATION_BY_ID[id];
                return (
                  <Link
                    key={id}
                    to="/investigations/$caseId"
                    params={{ caseId: id }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted"
                  >
                    <span>
                      <Mono className="text-muted-foreground">{id}</Mono>
                      <div className="text-[13px] font-medium">{c.title}</div>
                    </span>
                    <RiskTag level={c.severity} />
                  </Link>
                );
              })
            ) : (
              <p className="px-4 py-3 text-[12.5px] text-muted-foreground">
                No investigations for this agent.
              </p>
            )}
          </Panel>
        </div>
      </div>
      <Panel
        className="mt-6"
        eyebrow="Recent movement"
        title={`Latest ${Math.min(15, events.length)} events`}
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {events.slice(0, 15).map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[110px_86px_1fr_auto] items-center gap-3 px-4 py-2"
            >
              <Mono className="text-muted-foreground">{fmtDateTime(e.ts)}</Mono>
              <OpTag op={e.operation} anomalous={e.novel} />
              <span className="truncate text-[12.5px]">
                {ENTITIES[e.target]?.label} <Mono className="text-muted-foreground">{e.id}</Mono>
              </span>
              <Mono className={e.novel ? "text-danger" : ""}>{fmtBytes(e.bytes)}</Mono>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
