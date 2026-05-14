import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Image, Loader2, Sparkles, X, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MusicPickerSheet, type MusicTrack } from "@/components/MusicPickerSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStory: (file: File, music?: MusicTrack | null) => Promise<void>;
}

export function StoryCreatorSheet({ open, onOpenChange, onCreateStory }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [music, setMusic] = useState<MusicTrack | null>(null);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = "";
  };

  const handleShare = async () => {
    if (!file) return;
    setPosting(true);
    try {
      await onCreateStory(file, music);
      toast({ title: "Story posted! ✨" });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't post story", description: err?.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMusic(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-background pb-safe pb-8">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold tracking-tight">New Story</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Media preview */}
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[9/16] max-h-72">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="w-full h-full object-cover" controls muted playsInline />
                ) : (
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-48 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Image className="w-6 h-6" />
                <span className="text-xs font-medium">Choose photo or video</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />

            {/* Music selector */}
            {music ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20">
                <Music2 className="w-4 h-4 text-accent flex-shrink-0" />
                {music.artworkUrl && (
                  <img src={music.artworkUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{music.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{music.artist}</p>
                </div>
                <button
                  onClick={() => setMusicPickerOpen(true)}
                  className="text-xs text-accent font-medium flex-shrink-0"
                >
                  Change
                </button>
                <button onClick={() => setMusic(null)} className="flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMusicPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors text-sm"
              >
                <Music2 className="w-4 h-4" />
                Add music
              </button>
            )}

            <Button
              onClick={handleShare}
              disabled={!file || posting}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Share Story
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MusicPickerSheet
        open={musicPickerOpen}
        onOpenChange={setMusicPickerOpen}
        selected={music}
        onSelect={setMusic}
      />
    </>
  );
}
