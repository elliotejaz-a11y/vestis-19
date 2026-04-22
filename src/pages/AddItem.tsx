import { useEffect } from "react";
import { AddClothingSheet } from "@/components/AddClothingSheet";
import { PresetItemsSheet } from "@/components/PresetItemsSheet";
import { ClothingItem } from "@/types/wardrobe";
import { Camera, Upload, Sparkles, Package, Home, Layers } from "lucide-react";
import heroImage from "@/assets/hero-wardrobe.jpg";
import { WardrobeServiceSheet } from "@/components/WardrobeServiceSheet";
import { MassUploadSheet } from "@/components/MassUploadSheet";
import { preloadBgRemovalModel } from "@/lib/image-processing";

interface Props {
  onAdd: (item: ClothingItem) => void;
}

export function AddItem({ onAdd }: Props) {
  // Pre-download bg-removal model so uploads are instant
  useEffect(() => { preloadBgRemovalModel(); }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Clothing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Snap, upload, or pick from essentials</p>
      </header>

      <div className="mx-5 rounded-3xl overflow-hidden relative h-52 mb-6">
        <img src={heroImage} alt="Fashion" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-1.5 text-primary-foreground">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold">AI-Powered Analysis</span>
          </div>
          <p className="text-[11px] text-primary-foreground/80 mt-0.5">
            Our AI detects category, color, fabric, style & estimates value
          </p>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <AddClothingSheet onAdd={onAdd}>
          <button className="w-full h-16 rounded-2xl bg-card border border-border flex items-center gap-4 px-5 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Camera className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Take a Photo</p>
              <p className="text-[11px] text-muted-foreground">Use your camera to capture</p>
            </div>
          </button>
        </AddClothingSheet>

        <AddClothingSheet onAdd={onAdd}>
          <button className="w-full h-16 rounded-2xl bg-card border border-border flex items-center gap-4 px-5 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Upload from Gallery</p>
              <p className="text-[11px] text-muted-foreground">Choose from your photo library</p>
            </div>
          </button>
        </AddClothingSheet>

        <MassUploadSheet onAdd={onAdd}>
          <button className="w-full h-16 rounded-2xl bg-card border border-border flex items-center gap-4 px-5 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Layers className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                Mass Upload
                <span className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wide">AI</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Snap a pile of clothes — AI adds them all</p>
            </div>
          </button>
        </MassUploadSheet>

        <PresetItemsSheet onAdd={onAdd}>
          <button className="w-full h-16 rounded-2xl bg-card border border-border flex items-center gap-4 px-5 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Wardrobe Essentials</p>
              <p className="text-[11px] text-muted-foreground">Quick-add common clothing items</p>
            </div>
          </button>
        </PresetItemsSheet>

        <div className="mt-6 rounded-2xl bg-accent/10 border border-accent/20 p-4">
          <p className="text-xs text-muted-foreground mb-2">Don't want to photograph everything yourself?</p>
          <WardrobeServiceSheet>
            <button className="w-full h-14 rounded-2xl bg-card border border-border flex items-center gap-4 px-5 hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Home className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Book Upload Service</p>
                <p className="text-[11px] text-muted-foreground">We'll do it for you — $100 NZD</p>
              </div>
            </button>
          </WardrobeServiceSheet>
        </div>
      </div>
    </div>
  );
}

export default AddItem;
