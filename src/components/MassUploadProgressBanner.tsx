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
  "Generating clean images…",
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

/** Returns a human-readable ETA string during the extracting phase, updating every second. */
function useExtractionEta(extracted: number, total: number, active: boolean) {
  const startRef = useRef<number | null>(null);
  const extractedRef = useRef(extracted);
  const totalRef = useRef(total);
  extractedRef.current = extracted;
  totalRef.current = total;

  const [eta, setEta] = useState("");

  // Record start time when extraction begins; clear when it ends
  useEffect(() => {
    if (active) {
      if (startRef.current === null) startRef.current = Date.now();
    } else {
      startRef.current = null;
      setEta("");
    }
  }, [active]);

  // Recalculate every second while active
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const start = startRef.current;
      const done = extractedRef.current;
      const n = totalRef.current;
      if (!start || done === 0 || n === 0 || done >= n) { setEta(""); return; }
      const elapsed = (Date.now() - start) / 1000;
      const secPerItem = elapsed / done;
      const remaining = Math.round(secPerItem * (n - done));
      if (remaining <= 0) { setEta(""); return; }
      if (remaining >= 60) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setEta(`~${mins}m${secs > 0 ? ` ${secs}s` : ""} remaining`);
      } else {
        setEta(`~${remaining}s remaining`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return eta;
}

export function MassUploadProgressBanner() {
  const { phase, extracted, total, candidates, openReview, reset } = useMassUpload();

  if (phase === "idle") return null;

  const isReady = phase === "ready";
  const isAnalysing = phase === "analysing";
  const isExtracting = phase === "extracting";
  const isProcessing = isAnalysing || isExtracting;

  const readyCount = candidates.filter((c) => c.previewStatus === "ready").length;

  const realCompletion = isAnalysing
    ? 12
    : isExtracting
    ? Math.max(18, Math.min(94, 12 + Math.round((extracted / Math.max(1, total)) * 82)))
    : 100;

  const animatedCompletion = useAnimatedProgress(realCompletion, isProcessing);
  const analysingMsg = useCyclingMessage(ANALYSING_MESSAGES, isAnalysing);
  const extractingMsg = useCyclingMessage(EXTRACTING_MESSAGES, isExtracting);
  const eta = useExtractionEta(extracted, total, isExtracting);

  const primaryLabel = isAnalysing
    ? analysingMsg
    : isExtracting
    ? extractingMsg
    : readyCount > 0
    ? "All items ready — tap to sort through them"
    : "No items detected";

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
            {isExtracting && eta && (
              <p className="text-[11px] opacity-80 mt-0.5">{eta}</p>
            )}
            {!isReady && (
              <Progress
                value={animatedCompletion}
                className="mt-1 h-1 rounded-full bg-accent-foreground/20 [&>div]:bg-accent-foreground [&>div]:transition-all [&>div]:duration-500"
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
