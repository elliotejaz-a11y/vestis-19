import { useState } from "react";
import { Share, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { drawOutfitCardToBlob, nativeShareOrFallback } from "@/lib/shareOutfit";
import { cn } from "@/lib/utils";

interface Props {
  outfit: Pick<Outfit, "name" | "occasion"> & { items: ClothingItem[] };
  variant?: "icon-ghost" | "icon-outline";
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
}

export function ShareOutfitButton({
  outfit,
  variant = "icon-ghost",
  className,
  iconClassName,
  ariaLabel = "Share outfit",
}: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || busy) return;
    if (!outfit.items.length) {
      toast({ title: "Nothing to share yet", description: "Add some items to your outfit first." });
      return;
    }

    setBusy(true);
    try {
      const pngBlob = await drawOutfitCardToBlob({
        items: outfit.items,
        username: profile?.username || profile?.display_name,
        occasion: outfit.occasion,
      });

      const result = await nativeShareOrFallback({
        pngBlob,
        title: "My Vestis Outfit",
        text: "Check out this outfit I made on Vestis",
      });

      if (result === "downloaded") {
        toast({ title: "Outfit saved", description: "Image downloaded to your device." });
      }
    } catch (err) {
      console.error("[ShareOutfitButton] share failed:", err);
      toast({ title: "Couldn't share outfit", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return variant === "icon-ghost" ? (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={handleShare}
      disabled={busy}
      aria-label={ariaLabel}
    >
      {busy ? (
        <Loader2 className={cn("w-3.5 h-3.5 animate-spin text-muted-foreground", iconClassName)} />
      ) : (
        <Share className={cn("w-3.5 h-3.5 text-muted-foreground", iconClassName)} />
      )}
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      className={cn("h-11 w-11 rounded-2xl", className)}
      onClick={handleShare}
      disabled={busy}
      aria-label={ariaLabel}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share className="w-4 h-4" />}
    </Button>
  );
}
