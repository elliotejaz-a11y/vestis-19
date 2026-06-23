import { useState } from "react";
import { AddChoiceSheet, type AddChoice } from "@/components/AddChoiceSheet";
import { AddClothingSheet } from "@/components/AddClothingSheet";
import { MassUploadSheet } from "@/components/MassUploadSheet";
import { SearchAddModal } from "@/components/SearchAddModal";
import { CatalogBrowserSheet } from "@/components/CatalogBrowserSheet";
import { EssentialsCatalogueSheet } from "@/components/EssentialsCatalogueSheet";
import { ClothingItem } from "@/types/wardrobe";

interface Props {
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => Promise<void> | void;
  children: React.ReactNode;
  onStyleThis?: (item: ClothingItem) => void;
}

/**
 * Wraps the trigger in the chooser sheet, then opens the chosen
 * upload flow (single item, mass pile, or outfit extraction).
 *
 * We close the chooser first and wait for Radix's pointer-events
 * lock to clear before opening the next sheet — otherwise the
 * second sheet receives no clicks and appears unresponsive.
 */
export function WardrobeAddButton({ onAdd, children, onStyleThis }: Props) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [massOpen, setMassOpen] = useState(false);
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  const handlePick = (which: AddChoice) => {
    setChooserOpen(false);
    // Radix locks pointer-events on body during sheet close animation.
    // 350ms gives the close transition + cleanup time to finish.
    window.setTimeout(() => {
      document.body.style.pointerEvents = "";
      if (which === "single") setSingleOpen(true);
      else if (which === "mass") setMassOpen(true);
      else if (which === "search") setSearchOpen(true);
      else if (which === "catalog") setCatalogOpen(true);
      else if (which === "essentials") setEssentialsOpen(true);
      else setOutfitOpen(true);
    }, 350);
  };

  return (
    <>
      <AddChoiceSheet open={chooserOpen} onOpenChange={setChooserOpen} onPick={handlePick}>
        {children}
      </AddChoiceSheet>

      <AddClothingSheet onAdd={onAdd} open={singleOpen} onOpenChange={setSingleOpen} />
      <MassUploadSheet open={massOpen} onOpenChange={setMassOpen} mode="pile" />
      <MassUploadSheet open={outfitOpen} onOpenChange={setOutfitOpen} mode="outfit" />
      <SearchAddModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onAdd={onAdd} />
      <CatalogBrowserSheet open={catalogOpen} onOpenChange={setCatalogOpen} onAdd={onAdd} />
      <EssentialsCatalogueSheet
        open={essentialsOpen}
        onOpenChange={setEssentialsOpen}
        onAdd={onAdd}
        onStyleThis={onStyleThis}
      />
    </>
  );
}
