import { useEffect, useRef, useState } from "react";
import { useMassUpload } from "@/contexts/MassUploadContext";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, X } from "lucide-react";

const ANALYSING_MESSAGES = [
  "Analysing image…",
  "Detecting clothing items…",
  "Identifying categories…",
  "Reading colours & fabrics…",
];

const EXTRACTING_MESSAGES = [
  "Generating flat lay images…",
  "Removing backgrounds…",
  "Adding descriptions…",
  "Processing item details…",
  "Polishing cut-outs…",
];

/** Smoothly animates toward a target value, drifting slightly between real updates. */
function useAnimatedProgress(target: number, active: boolean) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (!active) { setDisplay(target); return; }
    const id = setInterval(() => {
      const current = displayRef.current;
      if (current < target) {
        setDisplay(Math.min(target, current + 2));
      } else if (current < 96) {
        setDisplay(current + 0.4);
      }
    }, 500);
    return () => clearInterval(id);
  }, [target, active]);

  return Math.min(99, display);
}

/** Cycles through messages on a fixed interval, resetting when the list changes. */
function useCyclingMessage(messages: string[], active: boolean) {
  const [idx, setIdx] = useState(0);
  const listKey = messages.join("|");

  useEffect(() => {
    setIdx(0);
    if (!active) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, active]);

  return messages[idx % messages.length];
}

/** Returns a static ETA string computed once when active becomes true with a known count. Never counts down. */
function useStaticEta(count: number, secPerUnit: number, active: boolean) {
  const [eta, setEta] = useState("");
  const setRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setRef.current = false;
      setEta("");
      return;
    }
    if (setRef.current || count === 0) return;
    setRef.current = true;
    const totalSec = Math.round(count * secPerUnit);
    if (totalSec <= 0) return;
    if (totalSec >= 60) {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setEta(`~${mins}m${secs > 0 ? ` ${secs}s` : ""}`);
    } else {
      setEta(`~${totalSec}s`);
    }
  }, [active, count, secPerUnit]);

  return eta;
}

export function MassUploadProgressBanner() {
  const { phase, extracted, total, analysisDone, analysisTotal, candidates, openReview, reset } = useMassUpload();

  if (phase === "idle") return null;

  const isReady = phase === "ready";
  const isAnalysing = phase === "analysing";
  const isExtracting = phase === "extracting";
  const isProcessing = isAnalysing || isExtracting;

  const readyCount = candidates.filter((c) => c.previewStatus === "ready").length;
  const failedCount = candidates.filter((c) => c.previewStatus === "failed").length;

  const realCompletion = isAnalysing
    ? Math.max(5, Math.round((analysisDone / Math.max(1, analysisTotal)) * 28))
    : isExtracting
    ? Math.max(30, Math.min(94, 28 + Math.round((extracted / Math.max(1, total)) * 66)))
    : 100;

  const animatedCompletion = useAnimatedProgress(realCompletion, isProcessing);
  const analysingMsg = useCyclingMessage(ANALYSING_MESSAGES, isAnalysing);
  const extractingMsg = useCyclingMessage(EXTRACTING_MESSAGES, isExtracting);

  const analysisEta = useStaticEta(analysisTotal, 8, isAnalysing);
  const extractionEta = useStaticEta(total, 24, isExtracting);
  const eta = isAnalysing ? analysisEta : extractionEta;

  const primaryLabel = isAnalysing
    ? analysingMsg
    : isExtracting
    ? extractingMsg
    : readyCount > 0
    ? `${readyCount} item${readyCount === 1 ? "" : "s"} ready — tap to review`
    : failedCount > 0
    ? `Image generation failed — tap to retry items`
    : "No items found in photo";

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
            <p className="text-sm font-semibold truncate transition-all duration-300">{primaryLabel}</p>
            {!isReady && (
              <div className="flex items-center gap-2 mt-1">
                <Progress
                  value={animatedCompletion}
                  className="flex-1 h-1 rounded-full bg-accent-foreground/20 [&>div]:bg-accent-foreground [&>div]:transition-all [&>div]:duration-500"
                />
                {isProcessing && eta && (
                  <span className="text-[11px] opacity-80 shrink-0">{eta}</span>
                )}
              </div>
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
