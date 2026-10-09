import type { MovementEvent } from "@/types";
import { ENTITIES } from "@/fixtures/entities";
import { fmtBytes, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OpTag } from "@/components/design-system/primitives";

export function EventTimeline({
  events,
  selectedIds,
  onSelect,
  animate,
}: {
  events: MovementEvent[];
  selectedIds?: Set<string>;
  onSelect?: (e: MovementEvent) => void;
  animate?: boolean;
}) {
  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-2 left-[71px] top-2 w-px bg-border" />
      {events.map((e) => {
        const sel = selectedIds?.has(e.id);
        return (
          <li key={e.id} className={cn(animate && "animate-event-in")}>
            <button
              type="button"
              onClick={() => onSelect?.(e)}
              className={cn(
                "group relative grid w-full grid-cols-[60px_24px_1fr_auto] items-center gap-2 rounded-sm px-1 py-1.5 text-left transition-colors hover:bg-muted",
                sel && "bg-accent hover:bg-accent",
              )}
            >
              <span className="font-mono text-[11px] text-muted-foreground tabular">{fmtTime(e.ts)}</span>
              <span className="flex justify-center">
                <span className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 bg-card", e.novel ? "border-danger" : "border-primary", sel && "bg-primary")} />
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <OpTag op={e.operation} anomalous={e.novel} />
                <span className="truncate text-[12.5px] text-foreground">{ENTITIES[e.target]?.label ?? e.target}</span>
                <span className="hidden font-mono text-[10.5px] text-muted-foreground lg:inline">{e.id}</span>
              </span>
              <span className={cn("font-mono text-[11.5px] tabular", e.novel ? "text-danger" : "text-foreground")}>{fmtBytes(e.bytes)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
