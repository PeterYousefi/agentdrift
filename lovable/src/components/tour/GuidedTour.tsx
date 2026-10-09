import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endTour, resetDemo, runScenario, setTourStep, startTour, TOUR_STEPS, useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  body: string;
  to: string;
  action?: { label: string; run: () => void };
}

const STEPS: Step[] = [
  { title: "Meet Research Agent 07", body: "An authorized quantitative research agent. It holds valid credentials for research data and the approved forecast model.", to: "/agents/ag-07" },
  { title: "Its normal baseline", body: "Fourteen days of outbound volume against its baseline (dashed line). Two known resources, two approved destinations. Note the spike on the last day.", to: "/agents/ag-07" },
  { title: "Trigger suspicious behavior", body: "Replay the sensitive-read-then-send scenario. Events are deterministic metadata, played back in order.", to: "/playground", action: { label: "Run scenario", run: () => runScenario("read-then-send") } },
  { title: "Watch metadata arrive", body: "Each event updates the live graph and the detector. The score climbs as novelty and the read→send sequence emerge. A simulated alert opens when it crosses review.", to: "/playground" },
  { title: "Reveal the anomalous sequence", body: "In the investigation workspace, the anomalous path is isolated: novel dataset → staging → unfamiliar endpoint. Click any edge to inspect its events.", to: "/investigations/CASE-2041" },
  { title: "Evidence-grounded investigation", body: "The notebook separates observed facts from inferences. Every claim cites synthetic event IDs you can open.", to: "/investigator" },
  { title: "Approve simulated containment", body: "Review policy checks, then approve or reject. Your decision changes case state and is written to the local audit trail.", to: "/response" },
  { title: "End of demo", body: "That's the loop: baseline → drift → evidence → grounded explanation → human-approved response. Everything here is synthetic and resettable.", to: "/about" },
];

export function GuidedTour() {
  const tour = useDemo((s) => s.tour);
  const approved = useDemo((s) => s.actionStatus["ACT-2041"]);
  const alerts = useDemo((s) => s.alerts.length);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const step = STEPS[tour.step];

  useEffect(() => {
    if (tour.active && step && path !== step.to) navigate({ to: step.to });
    // navigate only when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.active, tour.step]);

  if (!tour.active) {
    if (tour.seen) return null;
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[300px] rounded-md border border-border bg-card p-4 shadow-float animate-event-in">
        <div className="eyebrow">Guided demo · ~3 min</div>
        <p className="mt-1 text-[13px] leading-snug text-foreground">Follow one synthetic agent from normal baseline to a human-approved containment.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={startTour}><Compass /> Start tour</Button>
          <Button size="sm" variant="ghost" onClick={endTour}>Not now</Button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Guided tour" className="fixed bottom-5 right-5 z-50 w-[340px] rounded-md border border-ink/20 bg-card shadow-float">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{String(tour.step + 1).padStart(2, "0")} / {String(TOUR_STEPS).padStart(2, "0")}</span>
          <div className="flex gap-0.5" aria-hidden>
            {STEPS.map((_, i) => <span key={i} className={cn("h-1 w-3 rounded-full", i <= tour.step ? "bg-primary" : "bg-border")} />)}
          </div>
        </div>
        <button onClick={endTour} className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Skip tour"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="px-4 py-3">
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">{step.title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
        {tour.step === STEPS.length - 1 && (
          <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-foreground">
            <li>scenario alerts raised: {alerts}</li>
            <li>CASE-2041 containment: {approved}</li>
          </ul>
        )}
        {step.action && <Button size="sm" variant="ink" className="mt-3" onClick={() => { step.action!.run(); setTourStep(tour.step + 1); }}>{step.action.label}</Button>}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={endTour}>Skip</Button>
          <Button size="sm" variant="ghost" onClick={() => { resetDemo(); startTour(); }}>Reset demo</Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={tour.step === 0} onClick={() => setTourStep(tour.step - 1)} aria-label="Previous"><ArrowLeft /></Button>
          {tour.step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setTourStep(tour.step + 1)}>Next <ArrowRight /></Button>
          ) : (
            <Button size="sm" onClick={endTour}>Finish</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const TOUR_FOCUS_STEP = 4;
