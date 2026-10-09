import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, PlayCircle } from "lucide-react";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import { startTour, useDemo } from "@/lib/demo-store";
import { fmtBytes, fmtDateTime, fmtTime } from "@/lib/format";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { ENTITIES } from "@/fixtures/entities";
import { Button } from "@/components/ui/button";
import { Metric, Mono, OpTag, Panel, RiskTag, SyntheticBadge, Tag } from "@/components/design-system/primitives";
import { Sparkline, TrendArea } from "@/components/charts/Charts";
import { ScoreScale } from "@/components/investigation/DetectorReadout";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Mission control", "A curated operations briefing on AI-agent data movement: monitored agents, open investigations and novel destinations (synthetic demo)."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(q.overview()),
      context.queryClient.ensureQueryData(q.investigations()),
      context.queryClient.ensureQueryData(q.events({ caseOnly: true })),
    ]),
  component: Overview,
});

function Overview() {
  const { data: ov } = useSuspenseQuery(q.overview());
  const { data: cases } = useSuspenseQuery(q.investigations());
  const { data: caseEvents } = useSuspenseQuery(q.events({ caseOnly: true }));
  const statuses = useDemo((s) => s.actionStatus);
  const featured = cases.find((c) => c.id === ov.featuredCaseId)!;
  const agent = AGENT_BY_ID[featured.agentId];
  const contained = featured.actionId && statuses[featured.actionId] === "approved";
  const spark = ov.movementTrend.map((d) => ({ v: d.bytes }));

  return (
    <div className="mx-auto max-w-[1360px]">
      {/* Briefing masthead */}
      <div className="grid gap-6 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2"><span className="eyebrow">Operations briefing · Thu 08 Oct 2026, 14:10 UTC</span><SyntheticBadge /></div>
          <h1 className="mt-2 max-w-3xl text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground">
            Every permission was valid. <span className="text-muted-foreground">The sequence wasn't.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            AgentDrift watches metadata-only data movement by AI agents and flags sequences that drift from each agent's own baseline.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" variant="ink" onClick={startTour}><Compass /> Run live demo</Button>
          <Button size="lg" variant="outline" asChild><Link to="/playground"><PlayCircle /> Playground</Link></Button>
        </div>
      </div>

      {/* Inline metrics strip */}
      <div className="grid grid-cols-2 divide-border border-b border-border py-5 md:grid-cols-4 md:divide-x">
        <div className="pr-6"><Metric label="Monitored agents" value={ov.monitoredAgents} hint="6 workloads · 5 identities" /></div>
        <div className="md:px-6"><Metric label="Open investigations" value={ov.openInvestigations} tone="warn" hint="1 critical · 1 elevated · 1 review" /></div>
        <div className="mt-4 md:mt-0 md:px-6">
          <Metric label="Movement · 24h" value={fmtBytes(ov.movement24h)} hint="reads + writes + sends" />
          <div className="mt-2"><Sparkline data={spark} /></div>
        </div>
        <div className="mt-4 md:mt-0 md:pl-6"><Metric label="Novel destinations" value={ov.novelDestinations} tone="danger" hint="first-seen endpoints across fleet" /></div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Featured investigation */}
        <Panel eyebrow="Featured investigation" title={<span className="flex items-center gap-2"><Mono>{featured.id}</Mono> {featured.title}</span>} actions={<RiskTag level={featured.severity} />}>
          <div className="grid gap-6 md:grid-cols-[1fr_200px]">
            <div>
              <p className="text-[14px] leading-relaxed text-foreground">{featured.summary}</p>
              {/* Path strip */}
              <ol className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
                {[
                  { k: "Agent", v: agent.name, s: agent.identity, novel: false },
                  { k: "Novel dataset", v: "Strategy Archive", s: "1.2 GB read", novel: true },
                  { k: "Data transfer", v: "tmp-export staging", s: "1.1 GB written", novel: true },
                  { k: "Unfamiliar endpoint", v: "nimbus-relay", s: "998 MB sent", novel: true },
                ].map((p, i) => (
                  <li key={p.k} className="relative bg-card px-3 py-3">
                    <div className="flex items-center gap-1.5"><Mono className="text-muted-foreground">{i + 1}</Mono><span className="eyebrow">{p.k}</span></div>
                    <div className="mt-1 truncate text-[13px] font-semibold text-foreground">{p.v}</div>
                    <div className={p.novel ? "font-mono text-[11px] text-danger" : "font-mono text-[11px] text-muted-foreground"}>{p.s}</div>
                    {i < 3 && <ArrowRight aria-hidden className="absolute right-1.5 top-3 hidden h-3 w-3 text-muted-foreground sm:block" />}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild><Link to="/investigations/$caseId" params={{ caseId: featured.id }}>Open workspace <ArrowRight /></Link></Button>
                <Button variant="outline" asChild><Link to="/investigator">Read grounded narrative</Link></Button>
              </div>
            </div>
            <div className="border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div className="eyebrow">Anomaly score</div>
              <div className="mt-1 font-mono text-[40px] leading-none tracking-tight text-danger tabular">{featured.score.toFixed(2)}</div>
              <div className="mt-3"><ScoreScale score={featured.score} compact /></div>
              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex justify-between"><dt className="text-muted-foreground">Outbound vs baseline</dt><dd className="font-mono">8.4×</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Evidence events</dt><dd className="font-mono">{featured.evidenceIds.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Opened</dt><dd className="font-mono">{fmtTime(featured.openedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Containment</dt><dd>{contained ? <Tag tone="ink">approved</Tag> : <Tag tone="warn">awaiting human</Tag>}</dd></div>
              </dl>
            </div>
          </div>
        </Panel>

        {/* Case queue */}
        <Panel eyebrow="Queue" title="Investigations" bodyClassName="p-0" actions={<Link to="/investigations" className="text-[12px] text-primary hover:underline">All</Link>}>
          <ul className="divide-y divide-border">
            {cases.map((c) => (
              <li key={c.id}>
                <Link to="/investigations/$caseId" params={{ caseId: c.id }} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 hover:bg-muted">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><Mono className="text-muted-foreground">{c.id}</Mono><span className="text-[11px] text-muted-foreground">{c.kind}</span></div>
                    <div className="truncate text-[13px] font-medium text-foreground">{c.title}</div>
                    <div className="text-[11.5px] text-muted-foreground">{AGENT_BY_ID[c.agentId].name} · {c.status}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RiskTag level={c.severity} />
                    <Mono className="text-muted-foreground">{c.score.toFixed(2)}</Mono>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Panel eyebrow="Fleet outbound · last 24h" title="Movement activity">
          <TrendArea data={ov.movementTrend} height={160} />
          <p className="mt-2 text-[11.5px] text-muted-foreground">Hourly SEND volume across all agents. Step at 14:00 is CASE-2041.</p>
        </Panel>
        <Panel eyebrow="Recent movement" title="Linked case events" bodyClassName="p-0" actions={<Link to="/movement" className="text-[12px] text-primary hover:underline">Explorer</Link>}>
          <ul className="max-h-[260px] divide-y divide-border overflow-auto">
            {caseEvents.slice(0, 14).map((e) => (
              <li key={e.id} className="grid grid-cols-[86px_80px_1fr_auto] items-center gap-3 px-4 py-2">
                <Mono className="text-muted-foreground">{fmtDateTime(e.ts)}</Mono>
                <OpTag op={e.operation} anomalous={e.novel} />
                <span className="min-w-0 truncate text-[12.5px]"><span className="text-muted-foreground">{AGENT_BY_ID[e.agentId].name} →</span> {ENTITIES[e.target]?.label}</span>
                <Mono className={e.novel ? "text-danger" : ""}>{fmtBytes(e.bytes)}</Mono>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
