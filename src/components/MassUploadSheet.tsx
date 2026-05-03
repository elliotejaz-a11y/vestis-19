import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Lock } from "lucide-react";

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
              ? "AI outfit extraction is in development — this feature will detect every item, shoe, and accessory from your outfit photos automatically."
              : "Smart mass upload is in development — drop a whole wardrobe pile and AI will extract, cut out, and catalogue every item for you."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          <div className="flex h-56 w-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/40 bg-muted/30 px-6 text-center select-none">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-semibold text-foreground">Coming Soon</p>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">In Development</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isOutfit
                  ? "AI outfit extraction is on its way — we're putting the finishing touches on it."
                  : "Smart mass upload is coming soon. We'll notify you when it's ready."}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
