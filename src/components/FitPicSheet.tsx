import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FitPicSheetProps {
  children: React.ReactNode;
  outfitId?: string;
  defaultDate?: string;
  onSaved?: () => void;
}

export function FitPicSheet({ children, outfitId, defaultDate, onSaved }: FitPicSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [picDate, setPicDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user || !image) return;
    setSaving(true);
    try {
      const ext = image.name.split(".").pop();
      const path = `${user.id}/fit-pics/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("social-media").upload(path, image);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("social-media").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { error: insertErr } = await supabase.from("fit_pics").insert({
        user_id: user.id,
        image_url: imageUrl,
        description,
        pic_date: picDate,
        is_private: isPrivate,
        outfit_id: outfitId || null,
      });
      if (insertErr) throw insertErr;

      toast({ title: "Fit pic saved! 📸" });
      setOpen(false);
      setImage(null);
      setPreview(null);
      setDescription("");
      setIsPrivate(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">Take a Fit Pic</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden aspect-square max-w-xs mx-auto">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setImage(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-foreground/60 text-background rounded-full w-7 h-7 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tap to take or upload a photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you wearing today?"
              className="mt-1 rounded-xl bg-card text-sm"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={picDate}
              onChange={(e) => setPicDate(e.target.value)}
              className="mt-1 rounded-xl bg-card"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Private</p>
              <p className="text-[10px] text-muted-foreground">Only visible to you</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <Button
            onClick={handleSave}
            disabled={!image || saving}
            className="w-full h-11 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : "Save Fit Pic"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
