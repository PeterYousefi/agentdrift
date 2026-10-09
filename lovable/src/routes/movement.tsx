import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Lock, Search } from "lucide-react";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import type { DestinationClass, MovementEvent, Operation } from "@/types";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { ENTITIES, destClassOf, resourceClassOf } from "@/fixtures/entities";
import { fmtBytes, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Empty, Mono, OpTag, PageHeader, Segmented, SyntheticBadge, Tag } from "@/components/design-system/primitives";
import { CopyId, EventDetail } from "@/components/evidence/EventDetail";

export const Route = createFileRoute("/movement")({
  head: () => pageMeta("Movement explorer", "Search, sort and filter metadata-only data-movement events from synthetic AI agents."),
  component: Explorer,
});

const PAGE = 20;
type SortKey = "ts" | "bytes";

function Explorer() {
  const [search, setSearch] = useState("");
  const [op, setOp] = useState<Operation | "ALL">("ALL");
  const [dc, setDc] = useState<DestinationClass | "ALL">("ALL");
  const [caseOnly, setCaseOnly] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "ts", dir: -1 });
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<MovementEvent | null>(null);

  const filters = { q: search, operation: op, destClass: dc, caseOnly };
  const { data = [], isFetching, isError, refetch } = useQuery({ ...q.events(filters), placeholderData: keepPreviousData });

  const sorted = useMemo(() => [...data].sort((a, b) => (sort.k === "ts" ? a.ts.localeCompare(b.ts) : a.bytes - b.bytes) * sort.dir), [data, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const rows = sorted.slice(page * PAGE, page * PAGE + PAGE);
  const reset = () => setPage(0);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))} className="inline-flex items-center gap-1 hover:text-foreground" aria-label={`Sort by ${label}`}>
      {label}
      {sort.k === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader eyebrow="Telemetry" title="Movement explorer" description="Every row is metadata about a single operation." actions={<SyntheticBadge />} />
      <div className="mb-4 flex items-start gap-2 rounded-sm border border-primary/25 bg-accent px-3 py-2 text-[12px] text-accent-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span><strong className="font-semibold">Metadata-only telemetry.</strong> Operation, target class, byte counts, timestamps and identity context. No file contents, prompt bodies, model completions or customer documents are collected or displayed.</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder="Event ID, agent, resource, case" aria-label="Search events" className="h-8 w-64 rounded-sm border border-border bg-card pl-7 pr-2 text-[12.5px] outline-none focus:border-primary" />
        </label>
        <Segmented label="Operation" value={op} onChange={(v) => { setOp(v); reset(); }} options={(["ALL", "READ", "WRITE", "CONNECT", "SEND"] as const).map((v) => ({ value: v, label: v === "ALL" ? "All ops" : v }))} />
        <select value={dc} onChange={(e) => { setDc(e.target.value as DestinationClass | "ALL"); reset(); }} aria-label="Destination class" className="h-8 rounded-sm border border-border bg-card px-2 text-[12.5px]">
          <option value="ALL">All destination classes</option>
          <option value="internal">internal</option>
          <option value="approved-model">approved-model</option>
          <option value="staging">staging</option>
          <option value="external-unknown">external-unknown</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={caseOnly} onChange={(e) => { setCaseOnly(e.target.checked); reset(); }} className="accent-[var(--color-primary)]" /> Linked to a case</label>
        <span className={cn("ml-auto font-mono text-[11px] text-muted-foreground", isFetching && "animate-pulse")}>{sorted.length} events</span>
      </div>

      {isError ? (
        <Empty title="Couldn't load events"><Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>Retry</Button></Empty>
      ) : rows.length === 0 ? (
        <Empty title="No events match these filters">Clear the search or choose another operation.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-panel">
          <table className="w-full min-w-[1080px] text-[12.5px]">
            <thead className="border-b border-border bg-muted/60 text-left">
              <tr className="eyebrow">
                <th className="px-3 py-2 font-normal"><SortBtn k="ts" label="Timestamp" /></th>
                <th className="px-3 font-normal">Event</th>
                <th className="px-3 font-normal">Agent</th>
                <th className="px-3 font-normal">Operation</th>
                <th className="px-3 font-normal">Resource class</th>
                <th className="px-3 font-normal">Destination</th>
                <th className="px-3 text-right font-normal"><SortBtn k="bytes" label="Bytes" /></th>
                <th className="px-3 text-right font-normal">Id. conf.</th>
                <th className="px-3 font-normal">Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((e) => {
                const out = e.operation === "SEND" || e.operation === "CONNECT";
                return (
                  <tr key={e.id} onClick={() => setOpen(e)} className={cn("cursor-pointer hover:bg-muted/60", e.novel && "bg-danger-soft/40")}>
                    <td className="px-3 py-2"><Mono className="text-muted-foreground">{fmtDateTime(e.ts)}</Mono></td>
                    <td className="px-3" onClick={(ev) => ev.stopPropagation()}><CopyId id={e.id} /></td>
                    <td className="px-3">{AGENT_BY_ID[e.agentId].name}</td>
                    <td className="px-3"><OpTag op={e.operation} anomalous={e.novel} /></td>
                    <td className="px-3"><Mono className="text-muted-foreground">{out ? "—" : resourceClassOf(e.target)}</Mono></td>
                    <td className="px-3">{out ? <span className={destClassOf(e.target) === "external-unknown" ? "text-danger" : ""}>{ENTITIES[e.target]?.label}</span> : <Mono className="text-muted-foreground">{ENTITIES[e.target]?.label}</Mono>}</td>
                    <td className="px-3 text-right"><Mono>{fmtBytes(e.bytes)}</Mono></td>
                    <td className="px-3 text-right"><Mono>{e.identityConfidence.toFixed(2)}</Mono></td>
                    <td className="px-3" onClick={(ev) => ev.stopPropagation()}>{e.caseId ? <Link to="/investigations/$caseId" params={{ caseId: e.caseId }} className="font-mono text-[11.5px] text-primary hover:underline">{e.caseId}</Link> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <Mono className="text-muted-foreground">page {page + 1} / {pages}</Mono>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto bg-card sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-[15px]">Event detail</SheetTitle>
            <SheetDescription className="flex items-center gap-2"><Tag>metadata only</Tag><SyntheticBadge /></SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{open && <EventDetail event={open} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
