import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { liveRequest } from "@/api";
import { Metric, PageHeader, Panel, SyntheticBadge } from "@/components/design-system/primitives";

type Evaluation = {
  expandedEvaluation?: {
    runs: number;
    dataset: string;
    task: string;
    investigation: {
      precision: number;
      recall: number;
      f1: number;
      falsePositiveRate: number;
      confusionMatrix: Record<string, number>;
    };
    highSeverity: { precision: number; recall: number; f1: number; falsePositiveRate: number };
    trivialBaselines: Record<
      string,
      { precision: number; recall: number; f1: number; falsePositiveRate: number }
    >;
    thresholdSensitivity: Record<
      string,
      { precision: number; recall: number; falsePositiveRate: number }
    >;
    byScenario: Record<string, { runs: number; alerts: number; investigationTarget: boolean }>;
    limitations: string[];
    falseAlertsPerBenignRun: number;
    falseAlertsPerSyntheticBenignHour: number;
    meanDetectedPositiveDelaySeconds: number;
  };
  runs: number;
  detector: string;
  dataset: string;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  confusionMatrix: Record<string, number>;
  limitations: string[];
  meanProcessingMs: number;
  eventToAlertLatency: string;
  byScenario: Record<string, { runs: number; alerts: number }>;
};
export function LiveDetection() {
  const [mode, setMode] = useState<"expanded" | "baseline">("expanded");
  const result = useQuery({
    queryKey: ["evaluation"],
    queryFn: () => liveRequest<Evaluation>("/detection/evaluation"),
  });
  const expanded = result.data?.expandedEvaluation;
  const active = mode === "expanded" && expanded ? expanded.investigation : result.data;
  const scenarios = mode === "expanded" && expanded ? expanded.byScenario : result.data?.byScenario;
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Executed benchmark"
        title="Detection lab"
        description="Transparent statistical and sequence rules evaluated on held-out synthetic seeds. Anomaly is a review signal, not proof of malicious intent."
        actions={<SyntheticBadge />}
      />
      {result.error && <p role="alert">{result.error.message}</p>}
      {result.data && (
        <>
          <div className="my-4 flex gap-3" role="group" aria-label="Benchmark dataset">
            <button
              aria-pressed={mode === "expanded"}
              className="rounded border border-border px-3 py-2 text-sm"
              onClick={() => setMode("expanded")}
            >
              Challenging evaluation · 260 runs
            </button>
            <button
              aria-pressed={mode === "baseline"}
              className="rounded border border-border px-3 py-2 text-sm"
              onClick={() => setMode("baseline")}
            >
              Core regression · 120 runs
            </button>
          </div>
          <p className="text-sm">
            {mode === "expanded" && expanded ? expanded.dataset : result.data.dataset}
          </p>
          <div className="grid grid-cols-2 gap-6 py-5 md:grid-cols-4">
            {(
              [
                ["Precision", active!.precision],
                ["Recall", active!.recall],
                ["F1", active!.f1],
                ["False-positive rate", active!.falsePositiveRate],
              ] as const
            ).map(([label, value]) => (
              <Metric key={label} label={label} value={`${(value * 100).toFixed(1)}%`} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              eyebrow={`${mode === "expanded" && expanded ? expanded.runs : result.data.runs} synthetic runs`}
              title="Confusion matrix"
            >
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(active!.confusionMatrix).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel eyebrow="Per scenario" title="Review signals">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Scenario</th>
                    <th>Alerts / runs</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(scenarios ?? {}).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="text-center">
                        {value.alerts} / {value.runs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
          {expanded && mode === "expanded" && (
            <Panel
              className="mt-6"
              eyebrow="Harder synthetic distribution"
              title="Comparisons and limitations"
            >
              <p className="text-sm mb-3">
                {expanded.task}. False alerts per benign run:{" "}
                {expanded.falseAlertsPerBenignRun.toFixed(2)}. Detected-positive delay:{" "}
                {expanded.meanDetectedPositiveDelaySeconds.toFixed(1)} simulated seconds; misses are
                excluded from this delay.
              </p>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr>
                    <th className="text-left">Trivial baseline</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expanded.trivialBaselines).map(([name, v]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{(v.precision * 100).toFixed(1)}%</td>
                      <td>{(v.recall * 100).toFixed(1)}%</td>
                      <td>{(v.f1 * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-sm mb-4">
                <caption className="text-left">
                  Threshold sensitivity · comparison only, no retuning
                </caption>
                <thead>
                  <tr>
                    <th>Score threshold</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>FPR</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expanded.thresholdSensitivity).map(([t, v]) => (
                    <tr key={t}>
                      <td>{t}/100</td>
                      <td>{(v.precision * 100).toFixed(1)}%</td>
                      <td>{(v.recall * 100).toFixed(1)}%</td>
                      <td>{(v.falsePositiveRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm mb-2">
                High-severity task: precision {(expanded.highSeverity.precision * 100).toFixed(1)}%,
                recall {(expanded.highSeverity.recall * 100).toFixed(1)}%.
              </p>
              <ul className="list-disc pl-5 text-sm">
                {expanded.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel className="mt-6" eyebrow="Measured limits" title="Interpretation">
            <p className="mb-2 text-sm">
              {result.data.detector} · {result.data.dataset}
            </p>
            <p className="text-sm">
              Core regression detector computation: {result.data.meanProcessingMs.toFixed(3)} ms
              mean on the evaluation machine.
            </p>
            <p className="my-2 text-sm">{result.data.eventToAlertLatency}</p>
            <ul className="list-disc pl-5 text-sm">
              {result.data.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
