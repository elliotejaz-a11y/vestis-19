import { useSearchQueue } from "@/contexts/SearchQueueContext";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function SearchQueueBadge() {
  const { queue } = useSearchQueue();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  const processing = queue.filter((q) => q.status === "processing" || q.status === "pending");
  const recentDone = queue.filter((q) => q.status === "done");
  const recentFailed = queue.filter((q) => q.status === "error");
  const isProcessing = processing.length > 0;

  useEffect(() => {
    if (queue.length > 0) {
      setVisible(true);
      if (!isProcessing) {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [queue.length, isProcessing]);

  if (!visible || queue.length === 0) return null;

  return (
    <button
      onClick={() => navigate("/")}
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-foreground px-3.5 py-2 shadow-lg text-background text-xs font-semibold transition-all"
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Analysing {processing.length} item{processing.length > 1 ? "s" : ""}…
        </>
      ) : recentDone.length > 0 ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-400" />
          {recentDone.length} item{recentDone.length > 1 ? "s" : ""} added
          {recentFailed.length > 0 ? `, ${recentFailed.length} failed` : ""}
        </>
      ) : (
        <>
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive" />
          {recentFailed.length} item{recentFailed.length > 1 ? "s" : ""} failed to add
        </>
      )}
    </button>
  );
}
