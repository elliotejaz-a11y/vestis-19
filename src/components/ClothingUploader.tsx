import { useState, useRef } from "react";
import { removeImageBackground } from "@/utils/backgroundRemover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ImagePlus, Wand2 } from "lucide-react";

const ClothingUploader = () => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setOriginalUrl(URL.createObjectURL(selected));
    setProcessedUrl(null);
    setProgress(0);
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      const resultUrl = await removeImageBackground(file, (p) =>
        setProgress(Math.round(p * 100))
      );
      setProcessedUrl(resultUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* File input */}
      <div
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 p-8 cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {file ? file.name : "Click to upload a clothing photo"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Remove Background button */}
      {originalUrl && (
        <Button
          onClick={handleRemoveBackground}
          disabled={isProcessing}
          className="gap-2"
          variant="secondary"
        >
          <Wand2 className="h-4 w-4" />
          {isProcessing ? "Processing…" : "Remove Background"}
        </Button>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {progress}% complete
          </p>
        </div>
      )}

      {/* Before / After preview */}
      {originalUrl && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground text-center">
              Before
            </p>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
              <img
                src={originalUrl}
                alt="Original clothing"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground text-center">
              After
            </p>
            <div className="rounded-lg border border-border overflow-hidden aspect-square flex items-center justify-center"
              style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 16px 16px" }}
            >
              {processedUrl ? (
                <img
                  src={processedUrl}
                  alt="Background removed"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isProcessing ? "Working…" : "Result here"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClothingUploader;
