import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { liveRequest } from "@/api";
import { Button } from "@/components/ui/button";

type Status = { configured: boolean; available: string };
type Outcome = { generated_by: string; fallback_reason: string | null };
const reasons: Record<string, string> = {
  not_configured: "Azure OpenAI is not configured. Deterministic evidence summary used.",
  quota_exhausted: "The demo model quota is exhausted. Deterministic evidence summary used.",
  busy: "Another analysis is in progress. Deterministic evidence summary remains available.",
  validation_failed:
    "The model response failed evidence checks. Deterministic evidence summary used.",
  authentication_or_deployment:
    "The model deployment is unavailable. Deterministic evidence summary used.",
};

export function AnalysisControls({
  caseId,
  evidenceCount,
}: {
  caseId: string;
  evidenceCount: number;
}) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["analysis-status"],
    queryFn: () => liveRequest<Status>("/analysis/status"),
    staleTime: 60000,
  });
  const generate = useMutation({
    mutationFn: () =>
      liveRequest<Outcome>(`/investigations/${encodeURIComponent(caseId)}/report`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["narrative", caseId] });
    },
  });
  return (
    <div className="mb-4 space-y-2 rounded-sm border border-border bg-muted p-3">
      <p className="text-[12px]">{evidenceCount} stored evidence events available for analysis.</p>
      <p className="text-[11px] text-muted-foreground">
        {status.data?.configured
          ? "Azure OpenAI configured; availability is checked when you generate analysis."
          : "Azure OpenAI is unconfigured; the deterministic evidence summary remains available."}
      </p>
      <Button
        onClick={() => generate.mutate()}
        disabled={generate.isPending || evidenceCount === 0}
      >
        {generate.isPending ? "Generating analysis…" : "Generate AI Analysis"}
      </Button>
      {generate.isPending && (
        <p role="status" className="text-[12px]">
          Validating evidence and generating analysis. You can continue inspecting the
          investigation.
        </p>
      )}
      {generate.error && (
        <p role="alert" className="text-[12px]">
          Analysis request failed. {generate.error.message}
        </p>
      )}
      {generate.data?.generated_by === "deterministic" && (
        <p role="status" className="text-[12px]">
          {reasons[generate.data.fallback_reason ?? ""] ??
            "Live AI analysis was unavailable. Deterministic evidence summary used."}
        </p>
      )}
    </div>
  );
}
