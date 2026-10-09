import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Operation, RiskLevel } from "@/types";

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("border border-border bg-card shadow-panel rounded-md", className)}
    >
      {(title || eyebrow || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
            {title && (
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] tabular", className)}>{children}</span>;
}

const tagVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-px font-mono text-[10.5px] font-medium uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        teal: "border-primary/25 bg-accent text-accent-foreground",
        warn: "border-warning/50 bg-warning-soft text-warning-ink",
        danger: "border-danger/40 bg-danger-soft text-danger",
        ink: "border-ink bg-ink text-primary-foreground",
        outline: "border-border bg-card text-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Tag({
  tone,
  children,
  className,
}: VariantProps<typeof tagVariants> & { children: ReactNode; className?: string }) {
  return <span className={cn(tagVariants({ tone }), className)}>{children}</span>;
}

export const riskTone: Record<RiskLevel, "teal" | "warn" | "danger" | "neutral"> = {
  normal: "teal",
  review: "neutral",
  elevated: "warn",
  critical: "danger",
};

export function RiskTag({ level }: { level: RiskLevel }) {
  return (
    <Tag tone={riskTone[level]}>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          level === "critical"
            ? "bg-danger"
            : level === "elevated"
              ? "bg-warning"
              : level === "normal"
                ? "bg-primary"
                : "bg-muted-foreground",
        )}
      />
      {level}
    </Tag>
  );
}

const opGlyph: Record<Operation | "ATTR", string> = {
  READ: "R",
  WRITE: "W",
  CONNECT: "C",
  SEND: "S",
  ATTR: "·",
};
export function OpTag({ op, anomalous }: { op: Operation | "ATTR"; anomalous?: boolean }) {
  return (
    <Tag
      tone={anomalous ? "danger" : op === "SEND" ? "outline" : "neutral"}
      className="min-w-[68px] justify-center"
    >
      <span aria-hidden className="opacity-60">
        {opGlyph[op]}
      </span>
      {op}
    </Tag>
  );
}

export function SyntheticBadge({
  className,
  label = "Synthetic data",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-dashed border-warning/70 bg-warning-soft px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-warning-ink",
        className,
      )}
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-warning" />
      {label}
    </span>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "danger" | "warn" | "teal";
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-[22px] leading-none tracking-tight tabular",
          tone === "danger" && "text-danger",
          tone === "warn" && "text-warning-ink",
          tone === "teal" && "text-primary",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>}
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {children && <div className="max-w-sm text-[12px] text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-sm border border-border bg-muted p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[3px] px-2.5 py-1 text-[12px] font-medium transition-colors",
            value === o.value
              ? "bg-card text-foreground shadow-panel"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProvenanceLabel({
  kind,
}: {
  kind: "evidence" | "detector" | "genai" | "human" | "demo";
}) {
  const map = {
    evidence: { t: "Observed evidence", tone: "outline" as const },
    detector: { t: "Detector output", tone: "teal" as const },
    genai: { t: "GenAI interpretation · illustrative", tone: "warn" as const },
    human: { t: "Human decision", tone: "ink" as const },
    demo: { t: "Demonstration data", tone: "neutral" as const },
  }[kind];
  return <Tag tone={map.tone}>{map.t}</Tag>;
}
