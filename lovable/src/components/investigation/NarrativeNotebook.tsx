import type { NarrativeClaim, NarrativeEntry } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { CASE_EVENTS } from "@/fixtures/events";
import { INVESTIGATION_BY_ID } from "@/fixtures/investigations";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { scoreWindow } from "@/lib/detector";
import { ProvenanceLabel, Tag } from "@/components/design-system/primitives";

export function CiteChip({
  id,
  onClick,
  active,
}: {
  id: string;
  onClick?: (id: string) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      title={`Open evidence ${id}`}
      aria-label={`Open cited evidence ${id}`}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-0.5 rounded-sm border px-1 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono text-[10.5px] leading-[18px] transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-primary/30 bg-accent text-accent-foreground hover:border-primary",
      )}
    >
      {id}
      <ArrowUpRight className="h-2.5 w-2.5" aria-hidden />
    </button>
  );
}

function Claims({
  items,
  onCite,
  activeId,
  numbered,
}: {
  items: NarrativeClaim[];
  onCite?: (id: string) => void;
  activeId?: string | null;
  numbered?: string;
}) {
  return (
    <ol className="space-y-2.5">
      {items.map((c, i) => (
        <li key={i} className="grid grid-cols-[24px_1fr] gap-1">
          <span className="font-mono text-[10.5px] text-muted-foreground pt-0.5">
            {numbered}
            {i + 1}
          </span>
          <div>
            <p className="text-[13px] leading-relaxed text-foreground">
              {c.text}
              {c.confidence && (
                <Tag
                  tone={
                    c.confidence === "high"
                      ? "teal"
                      : c.confidence === "medium"
                        ? "warn"
                        : "neutral"
                  }
                  className="ml-1.5 align-middle"
                >
                  {c.confidence} confidence
                </Tag>
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.evidenceIds.map((id) => (
                <CiteChip key={id} id={id} onClick={onCite} active={activeId === id} />
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function NarrativeNotebook({
  entry,
  onCite,
  activeId,
  compact,
}: {
  entry: NarrativeEntry;
  onCite?: (id: string) => void;
  activeId?: string | null;
  compact?: boolean;
}) {
  return (
    <article className="animate-event-in">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag tone="outline">
          {entry.generatedBy === "deterministic"
            ? "Deterministic summary · no LLM"
            : entry.generatedBy === "azure-openai"
              ? "Azure OpenAI"
              : "Illustrative fixture copy"}
        </Tag>
        <Tag tone="warn">Synthetic metadata</Tag>
        <Tag tone="outline">
          grounded in{" "}
          {new Set([...entry.facts, ...entry.inferences].flatMap((c) => c.evidenceIds)).size} events
        </Tag>
      </div>
      <h3
        className={cn(
          "mt-3 font-semibold tracking-tight text-foreground",
          compact ? "text-[14px]" : "text-[17px]",
        )}
      >
        {entry.question}
      </h3>
      <p
        className={cn(
          "mt-2 border-l-2 border-ink pl-3 leading-relaxed text-foreground",
          compact ? "text-[13px]" : "text-[15px]",
        )}
      >
        {entry.answer}
      </p>

      <div className="mt-5 space-y-5">
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="eyebrow">1 · Observed facts</span>
            <span className="h-px flex-1 bg-border" />
            <ProvenanceLabel kind="evidence" />
          </div>
          <Claims items={entry.facts} onCite={onCite} activeId={activeId} numbered="F" />
        </section>
        <DetectorFindings caseId={entry.caseId} />
        {entry.inferences.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="eyebrow">3 · AI interpretation</span>
              <span className="h-px flex-1 bg-border" />
              <ProvenanceLabel kind="genai" />
            </div>
            <Claims items={entry.inferences} onCite={onCite} activeId={activeId} numbered="H" />
          </section>
        )}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="eyebrow mb-1.5">Limitations</div>
            <ul className="space-y-1.5">
              {entry.limitations.map((l) => (
                <li key={l} className="text-[12px] leading-snug text-muted-foreground">
                  — {l}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-1.5">4 · Recommended actions</div>
            <ul className="space-y-1.5">
              {entry.nextSteps.map((l) => (
                <li key={l} className="text-[12px] leading-snug text-foreground">
                  → {l}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <p className="mt-4 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
        Illustrative synthetic demo copy. Not produced by a live model. In production the backend
        generates narratives server-side from retrieved evidence only.
      </p>
    </article>
  );
}

function DetectorFindings({ caseId }: { caseId: string }) {
  const inv = INVESTIGATION_BY_ID[caseId];
  if (!inv) return null;
  const res = scoreWindow(
    CASE_EVENTS.filter((e) => e.caseId === caseId),
    AGENT_BY_ID[inv.agentId],
  );
  const fired = res.features.filter((f) => f.contribution > 0.005);
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="eyebrow">2 · Detector findings</span>
        <span className="h-px flex-1 bg-border" />
        <ProvenanceLabel kind="detector" />
      </div>
      <p className="text-[12.5px] text-foreground">
        Window score <span className="font-mono">{res.score.toFixed(2)}</span> ({res.level}).
        Computed by the deterministic demo detector, not by the AI.
      </p>
      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
        {fired.map((f) => (
          <li
            key={f.key}
            className="flex justify-between rounded-sm bg-muted px-2 py-1 text-[11.5px]"
          >
            <span>{f.label}</span>
            <span className="font-mono">+{f.contribution.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
