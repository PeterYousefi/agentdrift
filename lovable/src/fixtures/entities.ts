import type { Entity } from "@/types";

/** SYNTHETIC catalog of fictional resources, workloads and endpoints. */
export const ENTITIES: Record<string, Entity> = {
  "res:research-features": {
    id: "res:research-features",
    label: "Research Feature Store",
    kind: "resource",
    cls: "research-dataset",
  },
  "res:market-ticks": {
    id: "res:market-ticks",
    label: "Market Tick Cache",
    kind: "resource",
    cls: "market-data",
  },
  "res:strategy-archive": {
    id: "res:strategy-archive",
    label: "Strategy Archive",
    kind: "resource",
    cls: "restricted-strategy",
  },
  "res:report-store": {
    id: "res:report-store",
    label: "Quarterly Report Store",
    kind: "resource",
    cls: "internal-reporting",
  },
  "res:signals-lake": {
    id: "res:signals-lake",
    label: "Alt-Signals Lake",
    kind: "resource",
    cls: "research-dataset",
  },
  "stg:tmp-export": {
    id: "stg:tmp-export",
    label: "tmp-export staging",
    kind: "staging",
    cls: "staging",
    destClass: "staging",
    host: "blob://quant-ws/tmp-export",
  },
  "dst:forecast-model": {
    id: "dst:forecast-model",
    label: "Forecast Model Endpoint",
    kind: "endpoint",
    cls: "approved-model",
    destClass: "approved-model",
    host: "forecast.models.quant-ws.internal",
  },
  "dst:forecast-model-eu2": {
    id: "dst:forecast-model-eu2",
    label: "Forecast Model Endpoint (eu2)",
    kind: "endpoint",
    cls: "approved-model",
    destClass: "approved-model",
    host: "forecast-eu2.models.quant-ws.internal",
  },
  "dst:unknown-ext": {
    id: "dst:unknown-ext",
    label: "Unknown External Model Endpoint",
    kind: "endpoint",
    cls: "external-unknown",
    destClass: "external-unknown",
    host: "inference.nimbus-relay.example",
  },
  "dst:partner-bucket": {
    id: "dst:partner-bucket",
    label: "partner-analytics-bucket",
    kind: "endpoint",
    cls: "external-unknown",
    destClass: "external-unknown",
    host: "s3://partner-analytics.example",
  },
  "dst:report-portal": {
    id: "dst:report-portal",
    label: "Internal Report Portal",
    kind: "endpoint",
    cls: "internal",
    destClass: "internal",
    host: "reports.quant-ws.internal",
  },
  "dst:embeddings": {
    id: "dst:embeddings",
    label: "Embeddings Endpoint",
    kind: "endpoint",
    cls: "approved-model",
    destClass: "approved-model",
    host: "embed.models.quant-ws.internal",
  },
};

export function destClassOf(target: string) {
  return ENTITIES[target]?.destClass;
}
export function resourceClassOf(target: string) {
  return ENTITIES[target]?.cls ?? "unknown";
}
