import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { q } from "@/api";
import { pageMeta } from "@/lib/seo";
import { fmtBytes, fmtDateTime } from "@/lib/format";
import type { RiskLevel } from "@/types";
import { Mono, PageHeader, RiskTag, Segmented, SyntheticBadge, Tag, Empty } from "@/components/design-system/primitives";
import { Sparkline } from "@/components/charts/Charts";

export const Route = createFileRoute("/agents/")({
  head: () => pageMeta("Agent fleet", "Directory of synthetic AI agents with baselines, identity attribution and outbound movement."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q.agents()),
  component: Fleet,
});

function Fleet() {
  const { data } = useSuspenseQuery(q.agents());
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const rows = useMemo(() => {
    const s = query.toLowerCase();
    return data.filter((a) => (risk === "all" || a.risk === risk) && `${a.name} ${a.workload} ${a.namespace} ${a.identity}`.toLowerCase().includes(s));
  }, [data, query, risk]);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader eyebrow="Fleet" title="Agent fleet" description="Each agent is judged against its own baseline, not a fleet-wide rule." actions={<SyntheticBadge />} />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agent, workload, identity" aria-label="Search agents" className="h-8 w-72 rounded-sm border border-border bg-card pl-7 pr-2 text-[12.5px] outline-none focus:border-primary" />
        </label>
        <Segmented label="Risk filter" value={risk} onChange={setRisk} options={[{ value: "all", label: "All" }, { value: "critical", label: "Critical" }, { value: "elevated", label: "Elevated" }, { value: "review", label: "Review" }, { value: "normal", label: "Normal" }]} />
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{rows.length} of {data.length}</span>
      </div>
      {rows.length === 0 ? <Empty title="No agents match">Try clearing the search or risk filter.</Empty> : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-panel">
          <table className="w-full min-w-[960px] text-[12.5px]">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-left">
                {["Agent", "Workload / namespace", "Identity", "Baseline", "Last activity", "Outbound 24h", "14d trend", "Dest. diversity", "Risk"].map((h) => <th key={h} className="eyebrow px-3 py-2 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-muted/60">
                  <td className="px-3 py-2.5"><Link to="/agents/$agentId" params={{ agentId: a.id }} className="font-medium text-foreground hover:text-primary">{a.name}</Link><div><Mono className="text-muted-foreground">{a.id}</Mono></div></td>
                  <td className="px-3"><Mono>{a.workload}</Mono><div className="text-[11px] text-muted-foreground">{a.namespace}</div></td>
                  <td className="px-3"><Mono>{a.identity}</Mono><div className="text-[11px] text-muted-foreground">conf. {a.identityConfidence.toFixed(2)}</div></td>
                  <td className="px-3"><Tag tone={a.baselineState === "drifting" ? "warn" : a.baselineState === "learning" ? "neutral" : "teal"}>{a.baselineState}</Tag></td>
                  <td className="px-3"><Mono>{fmtDateTime(a.lastActivity)}</Mono></td>
                  <td className="px-3"><Mono>{fmtBytes(a.outbound24h)}</Mono></td>
                  <td className="w-28 px-3"><Sparkline data={a.history.map((h) => ({ v: h.sent }))} tone={a.risk === "critical" ? "danger" : a.risk === "elevated" ? "warn" : "teal"} height={24} /></td>
                  <td className="px-3"><Mono>{a.destinationDiversity}</Mono></td>
                  <td className="px-3"><RiskTag level={a.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
