import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { isDemoMode } from "@/api";
import {
  Mono,
  PageHeader,
  Panel,
  SyntheticBadge,
  Tag,
} from "@/components/design-system/primitives";

export const Route = createFileRoute("/about")({
  head: () =>
    pageMeta(
      "About this demo",
      "Architecture, privacy model and limitations of the AgentDrift work-sample prototype.",
    ),
  component: About,
});

const ARCH = [
  {
    k: "Ingest",
    v: "Metadata-only activity events",
    s: "operation · target class · bytes · identity",
  },
  { k: "Detect", v: "Behavioral detector", s: "per-agent baselines · sliding windows" },
  { k: "Reconstruct", v: "Evidence graph", s: "event IDs → movement graph" },
  { k: "Explain", v: "Grounded narrative", s: "Azure OpenAI, server-side, cites evidence" },
  { k: "Respond", v: "Human approval", s: "simulated containment · audit trail" },
];

function About() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow="Transparency"
        title="About this demo"
        description="AgentDrift is an independent educational work-sample prototype. It is not affiliated with or endorsed by Hilt."
        actions={<SyntheticBadge />}
      />

      <section className="mb-8">
        <h2 className="text-[17px] font-semibold tracking-tight">What it demonstrates</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-foreground">
          An AI agent may have legitimate permission for every individual action while its sequence
          of actions indicates dangerous behavioral drift. AgentDrift scores sequences against each
          agent's own baseline, reconstructs the evidence, explains it with clearly separated facts
          and inferences, and requires a human to approve any response.
        </p>
      </section>

      <Panel eyebrow="Architecture" title="Pipeline (proposed)">
        <ol className="grid gap-2 md:grid-cols-5">
          {ARCH.map((a, i) => (
            <li key={a.k} className="relative rounded-sm border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-1.5">
                <Mono className="text-muted-foreground">0{i + 1}</Mono>
                <span className="eyebrow">{a.k}</span>
              </div>
              <div className="mt-1 text-[13px] font-semibold">{a.v}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{a.s}</div>
              {i < ARCH.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-card text-muted-foreground md:block"
                />
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-2 text-[12px] md:grid-cols-3">
          <div className="rounded-sm border border-border p-3">
            <div className="eyebrow">Browser</div>React + TanStack Router/Query · mock or HTTP
            adapter · no secrets
          </div>
          <div className="rounded-sm border border-border p-3">
            <div className="eyebrow">Backend (planned)</div>Python FastAPI on Azure · owns all
            credentials
          </div>
          <div className="rounded-sm border border-border p-3">
            <div className="eyebrow">Models (planned)</div>Detector in backend · Azure OpenAI called
            server-side only
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Panel eyebrow="Privacy" title="Metadata-only model">
          <p className="text-[13px] leading-relaxed">
            Events carry operation, target class, byte counts, timestamps and identity context. No
            file contents, prompt bodies, model completions or customer documents.
          </p>
        </Panel>
        <Panel eyebrow="Separation" title="Detection vs GenAI">
          <p className="text-[13px] leading-relaxed">
            Scores come from the detector alone. GenAI only explains, never decides, and every
            factual claim must cite an evidence ID. Labels in the UI distinguish observed evidence,
            detector output, GenAI interpretation and human decisions.
          </p>
        </Panel>
        <Panel eyebrow="Provenance" title="Evidence chain">
          <p className="text-[13px] leading-relaxed">
            Case → evidence IDs → events → graph edges. The same IDs appear on the overview,
            workspace, notebook and explorer.
          </p>
        </Panel>
        <Panel eyebrow="Response" title="Human-approved, simulated">
          <p className="text-[13px] leading-relaxed">
            Approvals change local state and the session audit trail. No cloud quarantine, network
            policy or credential access is implemented.
          </p>
        </Panel>
      </div>

      <Panel className="mt-6" eyebrow="Status" title="Deployment & evaluation">
        <dl className="grid gap-3 text-[12.5px] md:grid-cols-2">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Data mode</dt>
            <dd>
              <Tag tone="warn">{isDemoMode ? "synthetic fixtures" : "live API"}</Tag>
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">GitHub repository</dt>
            <dd>
              <Mono className="text-muted-foreground">to be added</Mono>
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Azure demo deployment</dt>
            <dd>
              <Mono className="text-muted-foreground">not yet deployed</Mono>
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Measured evaluation results</dt>
            <dd>
              <Mono className="text-muted-foreground">not yet measured</Mono>
            </dd>
          </div>
        </dl>
        <div className="mt-4 eyebrow">Stack</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {[
            "React 19",
            "TypeScript",
            "TanStack Router",
            "TanStack Query",
            "Tailwind v4",
            "React Flow",
            "Recharts",
            "Zod",
            "Lucide",
          ].map((t) => (
            <Tag key={t} tone="outline">
              {t}
            </Tag>
          ))}
        </div>
      </Panel>

      <p className="mt-6 text-[12px] text-muted-foreground">
        All agents, identities, resources, endpoints, events and incidents are fictional and
        deterministic. No real incidents, customers or detections are represented.
      </p>
    </div>
  );
}
