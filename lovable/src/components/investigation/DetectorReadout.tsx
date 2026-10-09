import type { DetectorResult } from "@/types";
import { THRESHOLDS } from "@/lib/detector";
import { cn } from "@/lib/utils";
import { RiskTag } from "@/components/design-system/primitives";

export function ScoreScale({ score, compact }: { score: number; compact?: boolean }) {
  const pct = Math.round(score * 100);
  return (
    <div>
      <div className={cn("relative rounded-sm bg-muted", compact ? "h-1.5" : "h-2")}>
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-ink transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {Object.entries(THRESHOLDS).map(([k, v]) => (
          <span
            key={k}
            className="absolute -top-1 bottom-[-4px] w-px bg-muted-foreground/60"
            style={{ left: `${v * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      {!compact && (
        <div className="relative mt-1 h-3 font-mono text-[9.5px] uppercase text-muted-foreground">
          {Object.entries(THRESHOLDS).map(([k, v]) => (
            <span key={k} className="absolute -translate-x-1/2" style={{ left: `${v * 100}%` }}>
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnomalyScore({ result }: { result: DetectorResult }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-mono text-[34px] leading-none tracking-tight tabular",
              result.level === "critical" && "text-danger",
              result.level === "elevated" && "text-warning-ink",
            )}
          >
            {result.score.toFixed(2)}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">/ 1.00</span>
        </div>
        <RiskTag level={result.level} />
      </div>
      <div className="mt-3">
        <ScoreScale score={result.score} />
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        A weighted sum of four behavioral features for this window, relative to the agent's own
        baseline. It ranks how unusual the sequence is — it is not a probability of malicious
        intent.
      </p>
    </div>
  );
}

export function FeatureBreakdown({ result, dense }: { result: DetectorResult; dense?: boolean }) {
  return (
    <ul className="space-y-3">
      {result.features.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12.5px] font-medium text-foreground">{f.label}</span>
            <span className="font-mono text-[11.5px] tabular text-foreground">
              +{f.contribution.toFixed(2)}{" "}
              <span className="text-muted-foreground">/ {f.weight.toFixed(2)}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-sm bg-muted">
            <div
              className={cn(
                "h-full rounded-sm transition-all duration-500",
                f.raw > 0.66 ? "bg-danger" : f.raw > 0.25 ? "bg-warning" : "bg-primary",
              )}
              style={{ width: `${(f.contribution / f.weight) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between gap-2 font-mono text-[10.5px] text-muted-foreground">
            <span>obs: {f.observed}</span>
            <span className="text-right">base: {f.baseline}</span>
          </div>
          {!dense && (
            <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{f.explanation}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
