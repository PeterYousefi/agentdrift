import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { MovementEvent } from "@/types";
import { ENTITIES, destClassOf, resourceClassOf } from "@/fixtures/entities";
import { AGENT_BY_ID } from "@/fixtures/agents";
import { fmtBytes } from "@/lib/format";
import { Mono, OpTag, Tag } from "@/components/design-system/primitives";

export function CopyId({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(id).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-mono text-[11.5px] text-foreground hover:bg-muted"
      aria-label={`Copy event ID ${id}`}
    >
      {id}
      {done ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border-b border-border/70 py-1.5 last:border-0">
      <dt className="eyebrow pt-0.5">{k}</dt>
      <dd className="min-w-0 break-words text-[12.5px] text-foreground">{children}</dd>
    </div>
  );
}

export function EventDetail({ event }: { event: MovementEvent }) {
  const ent = ENTITIES[event.target];
  const agent = AGENT_BY_ID[event.agentId];
  const isOut = event.operation === "SEND" || event.operation === "CONNECT";
  return (
    <div className="animate-event-in">
      <div className="mb-2 flex items-center justify-between gap-2">
        <CopyId id={event.id} />
        <div className="flex items-center gap-1.5">
          {event.novel && <Tag tone="danger">first-seen</Tag>}
          <OpTag op={event.operation} anomalous={event.novel} />
        </div>
      </div>
      <dl>
        <Row k="Timestamp"><Mono>{event.ts}</Mono></Row>
        <Row k="Source">
          {isOut ? <Mono>{event.workloadId}</Mono> : <span>{ent?.label} <Mono className="text-muted-foreground">({resourceClassOf(event.target)})</Mono></span>}
        </Row>
        <Row k="Destination">
          {isOut ? (
            <span>
              {ent?.label}
              <div><Mono className="text-muted-foreground">{ent?.host}</Mono></div>
            </span>
          ) : (
            <Mono>{event.workloadId}</Mono>
          )}
        </Row>
        <Row k={isOut ? "Dest. class" : "Resource class"}>
          <Tag tone={destClassOf(event.target) === "external-unknown" ? "danger" : "neutral"}>{isOut ? destClassOf(event.target) ?? "—" : resourceClassOf(event.target)}</Tag>
        </Row>
        <Row k="Bytes"><Mono>{fmtBytes(event.bytes)}</Mono> <Mono className="text-muted-foreground">({event.bytes.toLocaleString()} B)</Mono></Row>
        <Row k="Identity">
          <Mono>{event.identity}</Mono>
          <div className="text-[11.5px] text-muted-foreground">Attribution confidence <Mono>{event.identityConfidence.toFixed(2)}</Mono> · agent {agent?.name}</div>
        </Row>
        {event.caseId && <Row k="Linked case"><Mono>{event.caseId}</Mono></Row>}
      </dl>
      <div className="mt-3 rounded-sm border-l-2 border-primary bg-muted px-3 py-2">
        <div className="eyebrow mb-0.5">Why this event matters</div>
        <p className="text-[12.5px] leading-relaxed text-foreground">{event.note ?? "Baseline-consistent activity. Shown for context; it does not contribute to the anomaly score."}</p>
      </div>
      <p className="mt-2 text-[10.5px] text-muted-foreground">Metadata only — no file contents, prompts or completions are captured.</p>
    </div>
  );
}
