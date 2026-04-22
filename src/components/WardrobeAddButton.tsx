import { useState } from "react";
import { AddChoiceSheet } from "@/components/AddChoiceSheet";
import { AddClothingSheet } from "@/components/AddClothingSheet";
import { MassUploadSheet } from "@/components/MassUploadSheet";
import { ClothingItem } from "@/types/wardrobe";

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => Promise<void> | void;
  children: React.ReactNode;
}

/**
 * Wraps the trigger in the chooser sheet, then opens either the
 * single-item or mass-upload sheet based on the user's pick.
 *
 * We close the chooser first and wait for Radix's pointer-events
 * lock to clear before opening the next sheet — otherwise the
 * second sheet receives no clicks and appears unresponsive.
 */
export function WardrobeAddButton({ onAdd, children }: Props) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [massOpen, setMassOpen] = useState(false);

  const handlePick = (which: "single" | "mass") => {
    setChooserOpen(false);
    // Radix locks pointer-events on body during sheet close animation.
    // 350ms gives the close transition + cleanup time to finish.
    window.setTimeout(() => {
      // Defensive: clear any lingering pointer-events lock
      document.body.style.pointerEvents = "";
      if (which === "single") setSingleOpen(true);
      else setMassOpen(true);
    }, 350);
  };

  return (
    <>
      <AddChoiceSheet open={chooserOpen} onOpenChange={setChooserOpen} onPick={handlePick}>
        {children}
      </AddChoiceSheet>

      <AddClothingSheet onAdd={onAdd} open={singleOpen} onOpenChange={setSingleOpen} />
      <MassUploadSheet onAdd={onAdd} open={massOpen} onOpenChange={setMassOpen} />
    </>
  );
}
