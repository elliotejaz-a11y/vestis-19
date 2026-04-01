import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bookmark, Globe, Users, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, description: string, privacy?: string) => void;
  defaultName?: string;
  defaultDescription?: string;
  defaultPrivacy?: string;
  editMode?: boolean;
}

export function SaveOutfitDialog({ open, onOpenChange, onConfirm, defaultName = "", defaultDescription = "", defaultPrivacy = "public", editMode }: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [privacy, setPrivacy] = useState(defaultPrivacy);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name.trim(), description.trim(), privacy);
    if (!editMode) {
      setName("");
      setDescription("");
      setPrivacy("public");
    }
  };

  // Sync state when dialog opens with new defaults
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setPrivacy(defaultPrivacy);
    }
  }, [open, defaultName, defaultDescription, defaultPrivacy]);

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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Privacy</label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Public</span>
                </SelectItem>
                <SelectItem value="friends_only">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Friends Only</span>
                </SelectItem>
                <SelectItem value="only_me">
                  <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Only Me</span>
                </SelectItem>
              </SelectContent>
            </Select>
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
