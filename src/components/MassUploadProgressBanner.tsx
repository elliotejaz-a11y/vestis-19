import { useMassUpload } from "@/contexts/MassUploadContext";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, X } from "lucide-react";

export function MassUploadProgressBanner() {
  const { phase, extracted, total, candidates, openReview, reset } = useMassUpload();

  if (phase === "idle") return null;

  const isReady = phase === "ready";
  const readyCount = candidates.filter((c) => c.previewStatus === "ready").length;

  const completion =
    phase === "analysing"
      ? 10
      : phase === "extracting"
      ? Math.max(15, Math.min(95, 10 + Math.round((extracted / Math.max(1, total)) * 85)))
      : 100;

  const label =
    phase === "analysing"
      ? "Analysing your photo…"
      : phase === "extracting"
      ? `Processing ${extracted}/${total} item${total === 1 ? "" : "s"}…`
      : `${readyCount} item${readyCount === 1 ? "" : "s"} ready to review — tap to view`;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-lg pointer-events-auto bg-accent text-accent-foreground shadow-lg"
        style={{ paddingTop: "env(safe-area-inset-top)", cursor: isReady ? "pointer" : "default" }}
        onClick={isReady ? openReview : undefined}
        role={isReady ? "button" : undefined}
        aria-label={isReady ? "Open review" : undefined}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          {isReady ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{label}</p>
            {!isReady && (
              <Progress
                value={completion}
                className="mt-1 h-1 rounded-full bg-accent-foreground/20 [&>div]:bg-accent-foreground"
              />
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
