import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { pageMeta } from "@/lib/seo";
import { NARRATIVES, INVESTIGATIONS } from "@/fixtures/investigations";
import { EVENT_BY_ID } from "@/fixtures/events";
import { cn } from "@/lib/utils";
import { Mono, PageHeader, Panel, RiskTag, SyntheticBadge } from "@/components/design-system/primitives";
import { NarrativeNotebook } from "@/components/investigation/NarrativeNotebook";
import { CaseSummary } from "@/components/investigation/CaseSummary";
import { EventDetail } from "@/components/evidence/EventDetail";

export const Route = createFileRoute("/investigator")({
  head: () => pageMeta("AI investigator", "An evidence notebook separating observed facts from AI-generated inferences, with every claim citing synthetic event IDs."),
  component: Investigator,
});

function Investigator() {
  const [entryId, setEntryId] = useState(NARRATIVES[0].id);
  const [cite, setCite] = useState<string | null>(null);
  const entry = NARRATIVES.find((n) => n.id === entryId)!;
  const ev = cite ? EVENT_BY_ID[cite] : null;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader eyebrow="Evidence notebook" title="AI investigator" description="Questions on the left, grounded findings in the centre, cited evidence on the right. Answers shown are illustrative synthetic copy — the live backend will generate them server-side from retrieved evidence only." actions={<SyntheticBadge label="Illustrative GenAI copy" />} />
      <div className="mb-4"><CaseSummary caseId={entry.caseId} onCite={setCite} activeId={cite} /></div>
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <nav aria-label="Investigation questions" className="space-y-4">
          {INVESTIGATIONS.map((c) => {
            const qs = NARRATIVES.filter((n) => n.caseId === c.id);
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between px-1"><Mono className="text-muted-foreground">{c.id}</Mono><RiskTag level={c.severity} /></div>
                <ul className="space-y-1">
                  {qs.map((n) => (
                    <li key={n.id}>
                      <button onClick={() => { setEntryId(n.id); setCite(null); }} className={cn("w-full rounded-sm border px-3 py-2 text-left text-[12.5px] transition-colors", n.id === entryId ? "border-primary bg-accent text-foreground" : "border-border bg-card text-foreground hover:border-primary/40")}>
                        <span className="mr-1 font-mono text-muted-foreground">Q</span>{n.question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="min-w-0 rounded-md border border-border bg-card px-6 py-6 shadow-panel lg:px-10">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <Mono className="text-muted-foreground">notebook / {entry.caseId} / {entry.id}</Mono>
            <Link to="/investigations/$caseId" params={{ caseId: entry.caseId }} className="text-[12px] text-primary hover:underline">Open workspace →</Link>
          </div>
          <NarrativeNotebook key={entry.id} entry={entry} onCite={setCite} activeId={cite} />
        </div>
        <aside className="xl:sticky xl:top-16 xl:self-start">
          <Panel eyebrow="Citation" title={cite ?? "Select an evidence ID"}>
            {ev ? <EventDetail event={ev} /> : <p className="text-[12.5px] leading-relaxed text-muted-foreground">Click any teal event ID in the notebook to expand the underlying metadata record. Claims without a citation are not shown.</p>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
