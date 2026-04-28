import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { isAllowedMassUploadImage } from "@/lib/wardrobeMassUpload";
import { useMassUpload } from "@/contexts/MassUploadContext";
import { ImagePlus } from "lucide-react";

interface Props {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "pile" | "outfit";
}

export function MassUploadSheet({ children, open: openProp, onOpenChange, mode = "pile" }: Props) {
  const isOutfit = mode === "outfit";
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { startProcessing } = useMassUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedMassUploadImage(file)) {
      toast({
        title: "Invalid image",
        description: "Use a JPG, PNG, or WebP image up to 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Close the sheet immediately — processing continues in the background
    setOpen(false);
    startProcessing(file, mode);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent side="bottom" className="rounded-t-3xl bg-background px-5 pb-12 pt-8">
        <SheetHeader>
          <SheetTitle className="tracking-tight">
            {isOutfit ? "Extract from Outfit Photo" : "Mass Upload"}
          </SheetTitle>
          <SheetDescription>
            {isOutfit
              ? "Upload a photo of an outfit being worn — AI will detect each clothing item, shoe, watch and accessory, then create a clean cut-out for each."
              : "Upload one photo of a pile, rail, or wardrobe section. AI processes everything in the background while you use the app normally."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 px-6 text-center transition-colors hover:bg-muted"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <ImagePlus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isOutfit ? "Upload an outfit photo" : "Upload a pile or closet photo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOutfit
                  ? "AI will scan every worn item and generate a clean cut-out for each. Processing happens in the background."
                  : "The AI will detect separate items, cut them out, and prefill wardrobe details. You'll be notified when ready."}
              </p>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
