import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { removeImageBackground } from "@/utils/backgroundRemover";
import { ImagePlus, Sparkles, Loader2 } from "lucide-react";

export default function ClothingUploader() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    blobRef.current = file;
    setOriginalUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setProgress(0);
    setPhase("");
  };

  const handleRemove = async () => {
    if (!blobRef.current) return;
    setProcessing(true);
    setProgress(0);
    setPhase("Initialising…");
    try {
      const url = await removeImageBackground(blobRef.current, {
        onProgress: (key, percent) => {
          setPhase(key);
          setProgress(percent);
        },
      });
      setProcessedUrl(url);
    } catch {
      setPhase("Failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      {/* File input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        className="w-full h-12 rounded-2xl gap-2"
        onClick={() => fileRef.current?.click()}
      >
        <ImagePlus className="w-4 h-4" /> Choose a clothing photo
      </Button>

      {/* Before / After preview */}
      {originalUrl && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground text-center">Before</p>
            <div className="aspect-square rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
              <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground text-center">After</p>
            <div className="aspect-square rounded-xl border border-border overflow-hidden bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] flex items-center justify-center">
              {processedUrl ? (
                <img src={processedUrl} alt="Processed" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No result yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center truncate">{phase} — {progress}%</p>
        </div>
      )}

      {/* Remove button */}
      {originalUrl && (
        <Button
          onClick={handleRemove}
          disabled={processing}
          className="w-full h-11 rounded-2xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Removing…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Remove Background</>
          )}
        </Button>
      )}
    </div>
  );
}