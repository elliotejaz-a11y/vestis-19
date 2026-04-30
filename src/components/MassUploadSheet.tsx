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
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const invalid = files.filter((f) => !isAllowedMassUploadImage(f));
    if (invalid.length > 0) {
      toast({
        title: "Invalid image",
        description: "All images must be JPG, PNG, or WebP and under 10 MB each.",
        variant: "destructive",
      });
      return;
    }

    // Close the sheet immediately — processing continues in the background
    setOpen(false);
    startProcessing(files, mode);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent side="bottom" className="rounded-t-3xl bg-background px-5 pt-8" style={{ paddingBottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))' }}>
        <SheetHeader>
          <SheetTitle className="tracking-tight">
            {isOutfit ? "Extract from Outfit Photos" : "Mass Upload"}
          </SheetTitle>
          <SheetDescription>
            {isOutfit
              ? "Select one or more outfit photos — AI will detect every clothing item, shoe, watch and accessory across all photos and generate a clean cut-out for each."
              : "Select one or more photos of your wardrobe. AI detects every item across all photos, cuts them out, and prefills the details. Processing happens in the background."}
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
                {isOutfit ? "Upload outfit photos" : "Upload wardrobe photos"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOutfit
                  ? "Select one or more photos. AI scans every worn item across all images."
                  : "Select one or more photos. AI detects each item and processes everything in the background."}
              </p>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
