import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Trash2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { format } from "date-fns";

interface FitPic {
  id: string;
  image_url: string;
  description: string | null;
  pic_date: string;
  is_private: boolean;
  created_at: string;
}

interface FitPicDetailSheetProps {
  pic: FitPic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function FitPicDetailSheet({ pic, open, onOpenChange, onUpdated }: FitPicDetailSheetProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [picDate, setPicDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const startEdit = () => {
    if (!pic) return;
    setDescription(pic.description || "");
    setPicDate(pic.pic_date);
    setIsPrivate(pic.is_private);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!pic) return;
    setSaving(true);
    const { error } = await supabase
      .from("fit_pics")
      .update({ description, pic_date: picDate, is_private: isPrivate })
      .eq("id", pic.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Fit pic updated ✨" });
      setEditing(false);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!pic) return;
    const { error } = await supabase.from("fit_pics").delete().eq("id", pic.id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Fit pic deleted" });
      onOpenChange(false);
      onUpdated();
    }
  };

  if (!pic) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto pb-24">
          <SheetHeader>
            <SheetTitle className="text-base">Fit Pic</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-3">
            <div className="rounded-2xl overflow-hidden aspect-square max-w-xs mx-auto relative">
              <img src={pic.image_url} alt={pic.description || ""} className="w-full h-full object-cover" loading="lazy" />
              {pic.is_private && (
                <div className="absolute top-2 left-2 bg-foreground/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-background" />
                  <span className="text-[9px] text-background">Private</span>
                </div>
              )}
            </div>

            {editing ? (
              <>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What were you wearing?"
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 h-10 rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl text-xs bg-accent text-accent-foreground">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                {pic.description && (
                  <p className="text-sm text-foreground">{pic.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(pic.pic_date), "d MMMM yyyy")}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={startEdit} className="flex-1 h-10 rounded-xl text-xs">
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" onClick={() => setShowDelete(true)} className="h-10 rounded-xl text-xs text-destructive border-destructive/30">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete fit pic?"
        description="This photo will be permanently removed."
      />
    </>
  );
}
