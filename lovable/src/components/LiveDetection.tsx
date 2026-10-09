import { useQuery } from "@tanstack/react-query";
import { liveRequest } from "@/api";
import { Metric, PageHeader, Panel, SyntheticBadge } from "@/components/design-system/primitives";

type Evaluation = {
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
  const result = useQuery({
    queryKey: ["evaluation"],
    queryFn: () => liveRequest<Evaluation>("/detection/evaluation"),
  });
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
          <div className="grid grid-cols-2 gap-6 py-5 md:grid-cols-4">
            {(
              [
                ["Precision", result.data.precision],
                ["Recall", result.data.recall],
                ["F1", result.data.f1],
                ["False-positive rate", result.data.falsePositiveRate],
              ] as const
            ).map(([label, value]) => (
              <Metric key={label} label={label} value={`${(value * 100).toFixed(1)}%`} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel eyebrow={`${result.data.runs} synthetic runs`} title="Confusion matrix">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(result.data.confusionMatrix).map(([key, value]) => (
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
                  {Object.entries(result.data.byScenario).map(([key, value]) => (
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
          <Panel className="mt-6" eyebrow="Measured limits" title="Interpretation">
            <p className="mb-2 text-sm">
              {result.data.detector} · {result.data.dataset}
            </p>
            <p className="text-sm">
              Detector computation: {result.data.meanProcessingMs.toFixed(3)} ms mean on the
              evaluation machine.
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
