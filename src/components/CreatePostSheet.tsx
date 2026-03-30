import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (imageUrls: string[], caption: string) => Promise<any>;
  uploadImage: (file: File) => Promise<string | null>;
  type: "post" | "story";
}

export function CreatePostSheet({ open, onOpenChange, onSubmit, uploadImage, type }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) setImages(prev => [...prev, url]);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (images.length === 0) return;
    setPosting(true);
    const error = await onSubmit(images, caption);
    if (error) {
      toast({ title: "Failed to create " + type, variant: "destructive" });
    } else {
      toast({ title: type === "post" ? "Post shared! 🎉" : "Story posted! ✨" });
      setImages([]); setCaption("");
      onOpenChange(false);
    }
    setPosting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background pb-24">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">
            {type === "post" ? "New Post" : "New Story"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((url, i) => (
                <div key={i} className="relative flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden">
                  <img loading="lazy" src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 text-foreground text-xs flex items-center justify-center"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Image className="w-6 h-6" />
                <span className="text-xs font-medium">
                  {type === "post" ? "Add photos" : "Add story photo"}
                </span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={type === "post"}
            className="hidden"
            onChange={handleFiles}
          />

          {/* Caption */}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={type === "post" ? "Write a caption..." : "Add text to your story..."}
            className="rounded-xl bg-card text-sm min-h-[60px]"
            maxLength={500}
          />

          <Button
            onClick={handleSubmit}
            disabled={images.length === 0 || posting}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
          >
            {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {type === "post" ? "Share Post" : "Share Story"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
