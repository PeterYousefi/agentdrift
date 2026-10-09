import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Play, Pause, RotateCcw } from "lucide-react";
import { api, liveRequest, q } from "@/api";
import type { DetectorResult, MovementGraph as Graph, ScenarioRun } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Mono,
  PageHeader,
  Panel,
  RiskTag,
  SyntheticBadge,
} from "@/components/design-system/primitives";
import { MovementGraph } from "@/components/movement-graph/MovementGraph";
import { EventTimeline } from "@/components/investigation/EventTimeline";
import { AnomalyScore, FeatureBreakdown } from "@/components/investigation/DetectorReadout";

type Run = ScenarioRun & {
  status: "running" | "paused" | "done";
  eventCount: number;
  caseId: string | null;
  features: DetectorResult;
  graph: Graph;
};

export function LivePlayground() {
  const client = useQueryClient();
  const scenarios = useQuery(q.scenarios());
  const [selected, setSelected] = useState("read-then-send");
  const [runId, setRunId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("agentdrift-active-run"),
  );
  const run = useQuery({
    queryKey: ["run", runId],
    enabled: !!runId,
    queryFn: () => liveRequest<Run>(`/scenario-runs/${runId}`),
    refetchInterval: 500,
  });
  const events = useQuery({
    queryKey: ["run-events", runId],
    enabled: !!runId,
    queryFn: () => api.getScenarioEvents(runId!),
    refetchInterval: 500,
  });
  const mutation = useMutation({
    mutationFn: async (operation: string) =>
      operation === "start"
        ? api.runScenario(selected)
        : liveRequest<ScenarioRun>(`/scenario-runs/${runId}/${operation}`, { method: "POST" }),
    onSuccess: (result) => {
      setRunId(result.runId);
      sessionStorage.setItem("agentdrift-active-run", result.runId);
      void client.invalidateQueries();
    },
  });
  const scenario = scenarios.data?.find((s) => s.id === selected);
  const error = scenarios.error ?? run.error ?? events.error ?? mutation.error;
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Interactive"
        title="Scenario playground"
        description="Synthetic events pass through the Python ingestion and detection pipeline. Evidence is stored in your isolated demo session."
        actions={<SyntheticBadge />}
      />
      {error && (
        <p role="alert" className="mb-4 rounded border border-danger p-3">
          Backend unavailable: {error.message}. Results have not been substituted with fixtures.
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <nav aria-label="Scenarios" className="space-y-1.5">
          {scenarios.data?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={cn(
                "w-full rounded-md border bg-card px-3 py-2.5 text-left shadow-panel",
                selected === s.id ? "border-primary" : "border-border",
              )}
            >
              <Mono>0{s.index}</Mono>
              <div className="mt-1 text-[13px] font-semibold">{s.name}</div>
              <p className="text-[11.5px] text-muted-foreground">{s.description}</p>
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          <Panel eyebrow="Python replay" title={scenario?.name ?? "Loading scenarios"}>
            <p className="text-[13px]">{scenario?.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="ink"
                disabled={mutation.isPending || !scenario || run.data?.status === "running"}
                onClick={() => mutation.mutate("start")}
              >
                <Play />
                Run scenario
              </Button>
              {run.data?.status === "running" && (
                <Button variant="outline" onClick={() => mutation.mutate("pause")}>
                  <Pause />
                  Pause
                </Button>
              )}
              {run.data?.status === "paused" && (
                <Button variant="outline" onClick={() => mutation.mutate("resume")}>
                  <Play />
                  Resume
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={!runId || mutation.isPending}
                onClick={() => mutation.mutate("reset")}
              >
                <RotateCcw />
                Reset / replay
              </Button>
            </div>
            <p className="mt-3 font-mono text-[11px]">
              {run.data?.status ?? "Ready"} · {events.data?.length ?? 0} persisted events
            </p>
          </Panel>
          <Panel
            eyebrow="Live movement preview"
            title="Graph builds as events arrive"
            bodyClassName="p-0"
          >
            {run.data?.graph.nodes.length ? (
              <MovementGraph
                graph={run.data.graph}
                events={events.data ?? []}
                height={340}
                compact
              />
            ) : (
              <div className="p-6">
                <Empty title="Waiting for events">Run a scenario to begin.</Empty>
              </div>
            )}
          </Panel>
          <Panel eyebrow="Event stream" title="Persisted metadata events">
            <EventTimeline events={[...(events.data ?? [])].reverse()} animate />
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel eyebrow="Detector · Python" title="Computed window score">
            {run.data?.features && (
              <>
                <AnomalyScore result={run.data.features} />
                <FeatureBreakdown result={run.data.features} dense />
              </>
            )}
          </Panel>
          <Panel eyebrow="Evidence reconstruction" title="Investigation">
            {run.data?.caseId ? (
              <>
                <RiskTag level={run.data.features.level} />
                <p className="my-2 text-[12px]">
                  Anomaly warrants review. Malicious intent is unproven.
                </p>
                <Link
                  className="text-primary hover:underline"
                  to="/investigations/$caseId"
                  params={{ caseId: run.data.caseId }}
                >
                  Open investigation →
                </Link>
              </>
            ) : (
              <p className="text-[12px]">No finding has crossed the review threshold.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
