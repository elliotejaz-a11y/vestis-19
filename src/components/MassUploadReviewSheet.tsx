import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPicker, joinColors } from "@/components/ColorPicker";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, ClothingCategory } from "@/types/wardrobe";
import { MassUploadCandidate, WARDROBE_FABRICS } from "@/types/massUpload";
import { useMassUpload } from "@/contexts/MassUploadContext";
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, X } from "lucide-react";

export function MassUploadReviewSheet() {
  const { phase, mode, candidates, reviewOpen, closeReview, addCandidateToWardrobe, skipCandidate, updateCandidate } =
    useMassUpload();
  const { toast } = useToast();

  const handleAdd = async (candidate: MassUploadCandidate) => {
    try {
      await addCandidateToWardrobe(candidate);
    } catch {
      toast({ title: "Couldn't save item", description: "Please try again.", variant: "destructive" });
    }
  };

  const isOutfit = mode === "outfit";

  return (
    <Sheet open={reviewOpen && phase === "ready"} onOpenChange={(open) => { if (!open) closeReview(); }}>
      <SheetContent
        side="bottom"
        className="h-[92vh] p-0 rounded-t-3xl bg-background flex flex-col overflow-hidden"
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 px-5 pt-8 pb-4 border-b border-border">
          <SheetHeader>
            <SheetTitle className="tracking-tight">
              {isOutfit ? "Review Outfit Items" : "Review Detected Items"}
            </SheetTitle>
            <SheetDescription>
              {candidates.length
                ? `${candidates.length} item${candidates.length === 1 ? "" : "s"} detected — add or skip each one.`
                : "No items were detected in this photo."}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable list */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
          style={{ touchAction: "pan-y", paddingBottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))' }}
        >
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <p className="text-sm text-muted-foreground">No items were detected.</p>
              <Button variant="outline" className="rounded-xl" onClick={closeReview}>
                Close
              </Button>
            </div>
          ) : (
            candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onChange={updateCandidate}
                onAdd={handleAdd}
                onSkip={skipCandidate}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CandidateCard({
  candidate,
  onChange,
  onAdd,
  onSkip,
}: {
  candidate: MassUploadCandidate;
  onChange: (id: string, patch: Partial<MassUploadCandidate>) => void;
  onAdd: (candidate: MassUploadCandidate) => Promise<void>;
  onSkip: (id: string) => void;
}) {
  const [colors, setColors] = useState<string[]>(candidate.color ? [candidate.color] : []);
  const [moreOpen, setMoreOpen] = useState(false);

  const update = (patch: Partial<MassUploadCandidate>) => onChange(candidate.id, patch);
  const disabled = candidate.addState === "saved" || candidate.addState === "skipped";

  // Find the category label + icon for display
  const catMeta = CATEGORIES.find((c) => c.value === candidate.category);

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* ── Large image ── */}
      <div className="relative bg-white dark:bg-muted w-full h-60">
        {candidate.previewUrl ? (
          <img
            src={candidate.previewUrl}
            alt={candidate.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <X className="h-6 w-6" />
          </div>
        )}
        {/* Status badge */}
        {candidate.addState === "saved" && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground shadow">
            <Check className="h-3 w-3" /> Added
          </span>
        )}
        {candidate.addState === "skipped" && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-secondary-foreground shadow">
            Skipped
          </span>
        )}
      </div>

      {/* ── Core info ── */}
      <div className="px-4 pt-3 pb-4 space-y-3">
        <div>
          <p className="text-base font-semibold text-foreground leading-tight">{candidate.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {catMeta && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                {catMeta.icon} {catMeta.label}
              </span>
            )}
            {candidate.color && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground capitalize">
                {candidate.color}
              </span>
            )}
          </div>
        </div>

        {candidate.error && (
          <p className="text-[11px] text-destructive">{candidate.error}</p>
        )}

        {/* ── More details collapsible ── */}
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span>More details</span>
          {moreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {moreOpen && (
          <div className="space-y-3 pt-0.5">
            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Name</Label>
                <Input
                  value={candidate.name}
                  disabled={disabled}
                  onChange={(e) => update({ name: e.target.value })}
                  className="mt-1 rounded-xl bg-background text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Category</Label>
                <Select
                  value={candidate.category}
                  disabled={disabled}
                  onValueChange={(value) => update({ category: value as ClothingCategory })}
                >
                  <SelectTrigger className="mt-1 rounded-xl bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fabric + Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Fabric</Label>
                <Select
                  value={candidate.fabric}
                  disabled={disabled}
                  onValueChange={(value) => update({ fabric: value })}
                >
                  <SelectTrigger className="mt-1 rounded-xl bg-background text-xs">
                    <SelectValue placeholder="Fabric" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARDROBE_FABRICS.map((fabric) => (
                      <SelectItem key={fabric} value={fabric}>
                        {fabric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Price (NZD)</Label>
                <Input
                  type="number"
                  value={candidate.estimatedPrice ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    update({ estimatedPrice: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="mt-1 rounded-xl bg-background text-sm"
                />
              </div>
            </div>

            {/* Colours */}
            <div>
              <Label className="text-[11px] text-muted-foreground">Colours</Label>
              <div className="mt-2">
                <ColorPicker
                  selected={colors}
                  onChange={(nextColors) => {
                    setColors(nextColors);
                    update({ color: joinColors(nextColors) });
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-[11px] text-muted-foreground">Notes</Label>
              <Textarea
                value={candidate.notes}
                disabled={disabled}
                onChange={(e) => update({ notes: e.target.value })}
                className="mt-1 min-h-[64px] rounded-xl bg-background text-sm"
              />
            </div>

            {/* Tags */}
            {candidate.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {candidate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons — always visible ── */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            disabled={disabled}
            onClick={() => onSkip(candidate.id)}
          >
            Skip
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={disabled || candidate.previewStatus !== "ready" || !candidate.name || !candidate.category}
            onClick={() => onAdd({ ...candidate, color: joinColors(colors) || candidate.color })}
          >
            {candidate.addState === "saving" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Add to wardrobe
          </Button>
        </div>
      </div>
    </div>
  );
}
