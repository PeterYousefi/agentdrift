import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Activity,
  BookOpenText,
  Boxes,
  FlaskConical,
  Gauge,
  Info,
  Network,
  PlayCircle,
  ShieldCheck,
  RotateCcw,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/api";
import { resetDemo, startTour, useDemo } from "@/lib/demo-store";
import { SyntheticBadge } from "@/components/design-system/primitives";
import { GuidedTour } from "@/components/tour/GuidedTour";

const NAV = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/investigations", label: "Investigations", icon: Network },
  { to: "/agents", label: "Agent Fleet", icon: Boxes },
  { to: "/movement", label: "Movement", icon: Activity },
  { to: "/detection", label: "Detection Lab", icon: FlaskConical },
  { to: "/playground", label: "Playground", icon: PlayCircle },
  { to: "/investigator", label: "AI Investigator", icon: BookOpenText },
  { to: "/response", label: "Response", icon: ShieldCheck },
  { to: "/about", label: "About", icon: Info },
] as const;

const TITLES: Record<string, string> = {
  "/": "Mission control",
  "/investigations": "Investigations",
  "/agents": "Agent fleet",
  "/movement": "Movement explorer",
  "/detection": "Detection lab",
  "/playground": "Scenario playground",
  "/investigator": "AI investigator",
  "/response": "Response center",
  "/about": "About this demo",
};

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const section = "/" + (path.split("/")[1] ?? "");
  const open = useDemo((s) => Object.values(s.actionStatus).filter((v) => v === "proposed").length);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 z-30 flex h-screen w-[60px] shrink-0 flex-col items-center border-r border-sidebar-border bg-rail py-3 text-rail-foreground lg:w-[208px] lg:items-stretch lg:px-3">
        <Link
          to="/"
          className="mb-6 flex items-center gap-2 px-1 lg:px-2"
          aria-label="AgentDrift home"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <rect
              x="0.5"
              y="0.5"
              width="25"
              height="25"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.35"
            />
            <path
              d="M5 18 L10 12 L14 15 L21 7"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
            />
            <circle cx="21" cy="7" r="2.2" fill="var(--color-danger)" />
          </svg>
          <span className="hidden text-[14px] font-semibold tracking-tight text-sidebar-accent-foreground lg:inline">
            AgentDrift
          </span>
        </Link>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={n.label}
                className={cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-rail-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 bg-primary"
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden lg:inline">{n.label}</span>
                {n.to === "/response" && open > 0 && (
                  <span className="ml-auto hidden rounded-sm bg-warning px-1 font-mono text-[10px] text-ink lg:inline">
                    {open}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-sidebar-border pt-3 text-[10.5px] leading-snug text-rail-foreground/60 lg:block">
          Independent work-sample prototype. All data is synthetic.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              quant-ws
            </span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <span className="truncate font-medium text-foreground">
              {TITLES[section] ?? "AgentDrift"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground md:inline-flex">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", isDemoMode ? "bg-warning" : "bg-primary")}
              />
              env: {isDemoMode ? "demo · mock adapter" : "live api"}
            </span>
            <SyntheticBadge />
            <button
              onClick={startTour}
              className="inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Compass className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tour</span>
            </button>
            <button
              onClick={resetDemo}
              className="inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Reset demo state"
            >
              <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
      <GuidedTour />
    </div>
  );
}
