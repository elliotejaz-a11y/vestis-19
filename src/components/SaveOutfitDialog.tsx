import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, description: string) => void;
  defaultName?: string;
  defaultDescription?: string;
  editMode?: boolean;
}

export function SaveOutfitDialog({ open, onOpenChange, onConfirm, defaultName = "", defaultDescription = "", editMode }: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name.trim(), description.trim());
    if (!editMode) {
      setName("");
      setDescription("");
    }
  };

  // Sync state when dialog opens with new defaults
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
    }
  }, [open, defaultName, defaultDescription]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-2xl z-[10001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bookmark className="w-4 h-4 text-accent" />
            {editMode ? "Edit Outfit" : "Save Outfit"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Date Night Look"
              className="rounded-xl text-sm"
              maxLength={60}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this outfit..."
              className="rounded-xl text-sm min-h-[70px] resize-none"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full rounded-xl bg-accent text-accent-foreground text-sm font-semibold">
              {editMode ? "Save Changes" : "Save Outfit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
