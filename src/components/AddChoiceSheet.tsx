import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AddClothingSheet } from "@/components/AddClothingSheet";
import { MassUploadSheet } from "@/components/MassUploadSheet";
import { ClothingItem } from "@/types/wardrobe";
import { Camera, Layers, ChevronRight } from "lucide-react";

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => Promise<void> | void;
  children: React.ReactNode;
}

export function AddChoiceSheet({ onAdd, children }: Props) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [massOpen, setMassOpen] = useState(false);

  const pick = (which: "single" | "mass") => {
    setChooserOpen(false);
    // Wait for chooser close animation before opening the next sheet
    setTimeout(() => {
      if (which === "single") setSingleOpen(true);
      else setMassOpen(true);
    }, 250);
  };

  return (
    <>
      <Sheet open={chooserOpen} onOpenChange={setChooserOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-background px-5 pb-32 pt-6">
          <SheetHeader className="text-left">
            <SheetTitle className="tracking-tight">Add to Wardrobe</SheetTitle>
            <SheetDescription>Choose how you want to add your clothing.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => pick("single")}
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

            <button
              type="button"
              onClick={() => pick("mass")}
              className="w-full rounded-2xl bg-card border border-border flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Mass Upload</p>
                <p className="text-[11px] text-muted-foreground">Snap a pile or closet — AI detects each item</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AddClothingSheet onAdd={onAdd} open={singleOpen} onOpenChange={setSingleOpen} />
      <MassUploadSheet onAdd={onAdd} open={massOpen} onOpenChange={setMassOpen} />
    </>
  );
}
