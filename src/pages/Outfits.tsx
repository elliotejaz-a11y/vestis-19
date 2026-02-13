import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutfitCard } from "@/components/OutfitCard";
import { ClothingItem, Outfit, OCCASIONS } from "@/types/wardrobe";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  items: ClothingItem[];
  outfits: Outfit[];
  onGenerate: (occasion: string) => Promise<Outfit | null>;
}

export function Outfits({ items, outfits, onGenerate }: Props) {
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [latestOutfit, setLatestOutfit] = useState<Outfit | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!selectedOccasion || items.length < 2) return;
    setGenerating(true);
    try {
      const outfit = await onGenerate(selectedOccasion);
      setLatestOutfit(outfit);
      if (outfit) {
        toast({ title: "Outfit Created ✨", description: `Perfect look for "${selectedOccasion}"` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate outfit", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outfit Generator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-styled looks for every occasion</p>
      </header>

      {/* Occasion selector */}
      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Where are you going?</p>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((occ) => (
            <button
              key={occ}
              onClick={() => setSelectedOccasion(occ)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedOccasion === occ
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-accent/50"
              )}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="px-5 mb-6">
        <Button
          onClick={handleGenerate}
          disabled={!selectedOccasion || items.length < 2 || generating}
          className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI is styling your look...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Outfit
            </>
          )}
        </Button>
        {items.length < 2 && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Add at least 2 items to your wardrobe first
          </p>
        )}
      </div>

      {/* Results */}
      <div className="px-5 space-y-4">
        {latestOutfit && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Latest Suggestion</p>
            <OutfitCard outfit={latestOutfit} />
          </div>
        )}
        {outfits.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Previous Outfits</p>
            <div className="space-y-3">
              {outfits
                .filter((o) => o.id !== latestOutfit?.id)
                .map((outfit) => (
                  <OutfitCard key={outfit.id} outfit={outfit} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Outfits;
