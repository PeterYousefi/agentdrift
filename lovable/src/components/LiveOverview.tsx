import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api";
import {
  Metric,
  PageHeader,
  Panel,
  RiskTag,
  SyntheticBadge,
} from "@/components/design-system/primitives";
import { fmtBytes } from "@/lib/format";
import { TrendArea } from "@/components/charts/Charts";

export function LiveOverview() {
  const overview = useQuery({ ...q.overview(), refetchInterval: false });
  const investigations = useQuery({ ...q.investigations(), refetchInterval: false });
  const error = overview.error ?? investigations.error;
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Operations briefing"
        title="Every permission was valid. The sequence wasn't."
        description="A personal engineering project by Peter Yousefi. AI-agent metadata investigation backed by Python behavioral detection; all activity is synthetic."
        actions={<SyntheticBadge />}
      />
      {error && (
        <p role="alert" className="mb-4 border border-danger p-3">
          Unable to reach the backend: {error.message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-6 border-b border-border py-5 md:grid-cols-4">
        <Metric label="Monitored agents" value={overview.data?.monitoredAgents ?? "—"} />
        <Metric label="Open investigations" value={overview.data?.openInvestigations ?? "—"} />
        <Metric
          label="Movement in this session"
          value={overview.data ? fmtBytes(overview.data.movement24h) : "—"}
        />
        <Metric label="Novel destinations" value={overview.data?.novelDestinations ?? "—"} />
      </div>
      <Panel className="mt-6" eyebrow="Start here" title="Run the investigation workflow">
        <p className="text-[13px]">
          Replay a sensitive read → stage → send sequence, inspect its graph and cited events, then
          approve a simulated response.
        </p>
        <Link
          className="mt-3 inline-block rounded bg-primary px-4 py-2 text-primary-foreground"
          to="/playground"
        >
          Run live demo →
        </Link>
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Computed findings" title="Your investigations">
          {investigations.data?.length ? (
            investigations.data.map((c) => (
              <Link
                key={c.id}
                to="/investigations/$caseId"
                params={{ caseId: c.id }}
                className="mb-3 block rounded border border-border p-3"
              >
                <RiskTag level={c.severity} />
                <h3 className="mt-1 font-semibold">{c.title}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {c.status} · {c.evidenceIds.length} cited events · score {c.score.toFixed(2)}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Run a scenario to generate events and findings.
            </p>
          )}
        </Panel>
        <Panel eyebrow="Stored telemetry" title="Movement by event">
          {overview.data && <TrendArea data={overview.data.movementTrend} />}
        </Panel>
      </div>
    </div>
  );
}
