import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Camera, Layers, ChevronRight, UserSquare2, Lock } from "lucide-react";

export type AddChoice = "single" | "mass" | "outfit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (which: AddChoice) => void;
  children?: React.ReactNode;
}

export function AddChoiceSheet({ open, onOpenChange, onPick, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-background px-5 pb-32 pt-6">
        <SheetHeader className="text-left">
          <SheetTitle className="tracking-tight">Add to Wardrobe</SheetTitle>
          <SheetDescription>Choose how you want to add your clothing.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => onPick("single")}
            className="w-full rounded-2xl bg-card border border-border flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Single Item</p>
              <p className="text-[11px] text-muted-foreground">Photograph or upload one piece at a time</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="w-full rounded-2xl bg-card border border-border flex items-center gap-4 px-5 py-4 opacity-40 cursor-not-allowed text-left">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Mass Upload</p>
              <p className="text-[11px] text-muted-foreground">Snap a pile or closet — AI detects each item</p>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="w-full rounded-2xl bg-card border border-border flex items-center gap-4 px-5 py-4 opacity-40 cursor-not-allowed text-left">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <UserSquare2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Extract from Outfit Photo</p>
              <p className="text-[11px] text-muted-foreground">Scan a worn outfit — tops, bottoms, shoes, watches & more</p>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
