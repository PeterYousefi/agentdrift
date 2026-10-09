import type { Agent, DetectorResult, MovementEvent, RiskLevel } from "@/types";
import { ENTITIES } from "@/fixtures/entities";
import { fmtBytes } from "./format";

/**
 * Deterministic behavioral detector used by the demo.
 * Mirrors the shape the backend detector will return; weights and thresholds are illustrative.
 */
export const WEIGHTS = {
  volume: 0.35,
  destNovelty: 0.25,
  resourceNovelty: 0.2,
  sequence: 0.2,
} as const;
export const THRESHOLDS = { review: 0.4, elevated: 0.6, critical: 0.8 } as const;

export function levelFor(
  score: number,
  t: { review: number; elevated: number; critical: number } = THRESHOLDS,
): RiskLevel {
  if (score >= t.critical) return "critical";
  if (score >= t.elevated) return "elevated";
  if (score >= t.review) return "review";
  return "normal";
}

const isOutbound = (e: MovementEvent) => e.operation === "SEND";
const isRead = (e: MovementEvent) => e.operation === "READ";

export function scoreWindow(
  events: MovementEvent[],
  agent: Pick<Agent, "baseline">,
): DetectorResult {
  const { avgSendBytes, knownDestinations, knownResources } = agent.baseline;
  const sends = events.filter(isOutbound);
  const reads = events.filter(isRead);
  const sentBytes = sends.reduce((s, e) => s + e.bytes, 0);
  const readBytes = reads.reduce((s, e) => s + e.bytes, 0);

  const volumeRatio = avgSendBytes > 0 ? sentBytes / avgSendBytes : 0;
  const volumeRaw = Math.min(1, Math.max(0, (volumeRatio - 1) / 7));

  const novelSendBytes = sends
    .filter((e) => !knownDestinations.includes(e.target))
    .reduce((s, e) => s + e.bytes, 0);
  const destRaw = sentBytes > 0 ? novelSendBytes / sentBytes : 0;

  const novelReadBytes = reads
    .filter((e) => !knownResources.includes(e.target))
    .reduce((s, e) => s + e.bytes, 0);
  const resRaw = readBytes > 0 ? novelReadBytes / readBytes : 0;

  // Read of a novel resource followed (later in the window) by a send to a novel destination.
  let seqRaw = 0;
  const firstNovelRead = events.findIndex((e) => isRead(e) && !knownResources.includes(e.target));
  if (firstNovelRead >= 0) {
    const laterNovelSend = events
      .slice(firstNovelRead + 1)
      .some((e) => isOutbound(e) && !knownDestinations.includes(e.target));
    seqRaw = laterNovelSend ? 1 : 0;
  }

  const features: DetectorResult["features"] = [
    {
      key: "volume",
      label: "Transfer volume vs baseline",
      observed: `${fmtBytes(sentBytes)} (${volumeRatio.toFixed(1)}×)`,
      baseline: fmtBytes(avgSendBytes),
      raw: volumeRaw,
      weight: WEIGHTS.volume,
      contribution: volumeRaw * WEIGHTS.volume,
      explanation:
        "Outbound bytes in the window divided by the agent's typical per-window outbound volume. Saturates at 8×.",
    },
    {
      key: "destNovelty",
      label: "Destination novelty",
      observed: `${Math.round(destRaw * 100)}% of bytes to unseen destinations`,
      baseline: `${knownDestinations.length} known destinations`,
      raw: destRaw,
      weight: WEIGHTS.destNovelty,
      contribution: destRaw * WEIGHTS.destNovelty,
      explanation:
        "Share of outbound bytes sent to endpoints not present in the agent's historical baseline.",
    },
    {
      key: "resourceNovelty",
      label: "Resource novelty",
      observed: `${Math.round(resRaw * 100)}% of reads from unseen resources`,
      baseline: `${knownResources.length} known resources`,
      raw: resRaw,
      weight: WEIGHTS.resourceNovelty,
      contribution: resRaw * WEIGHTS.resourceNovelty,
      explanation:
        "Share of read bytes from resource classes the agent has not previously accessed.",
    },
    {
      key: "sequence",
      label: "Read → send sequence",
      observed: seqRaw ? "Novel read followed by novel send" : "Not observed",
      baseline: "Not observed in baseline",
      raw: seqRaw,
      weight: WEIGHTS.sequence,
      contribution: seqRaw * WEIGHTS.sequence,
      explanation:
        "Ordered pattern: a read of a novel resource followed within the same window by a transfer to a novel destination.",
    },
  ];

  const score = Math.min(
    1,
    features.reduce((s, f) => s + f.contribution, 0),
  );
  return { score, level: levelFor(score), features, sentBytes, readBytes, volumeRatio };
}

export function entityLabel(id: string) {
  return ENTITIES[id]?.label ?? id;
}
