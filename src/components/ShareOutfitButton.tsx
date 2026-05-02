import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareOutfitCard } from "@/components/ShareOutfitCard";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { captureNodeToPng, nativeShareOrFallback } from "@/lib/shareOutfit";
import { cn } from "@/lib/utils";

interface Props {
  /** Outfit-shaped data — works for AI outfits and ad-hoc Builder selections. */
  outfit: Pick<Outfit, "name" | "occasion"> & { items: ClothingItem[] };
  /** Visual variant: icon-only ghost (default) or outline button with optional label. */
  variant?: "icon-ghost" | "icon-outline";
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
}

/**
 * Reusable share trigger. Renders the ShareOutfitCard off-screen via a portal,
 * captures it to a PNG, creates a public share link, then opens the native
 * share sheet (with download/clipboard fallback).
 */
export function ShareOutfitButton({
  outfit,
  variant = "icon-ghost",
  className,
  iconClassName,
  ariaLabel = "Share outfit",
}: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [renderCard, setRenderCard] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || busy) return;
    if (!outfit.items.length) {
      toast({ title: "Nothing to share yet", description: "Add some items to your outfit first." });
      return;
    }

    setBusy(true);
    setRenderCard(true);

    try {
      // Wait one frame so the portal mounts before we try to capture it.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      // And another tick so children render
      await new Promise((r) => setTimeout(r, 30));

      if (!cardRef.current) throw new Error("Share card not ready");

      const pngBlob = await captureNodeToPng(cardRef.current);

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
      setRenderCard(false);
    }
  };

  return (
    <>
      {variant === "icon-ghost" ? (
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
      )}

      {renderCard &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: -99999,
              top: 0,
              pointerEvents: "none",
              zIndex: -1,
            }}
          >
            <ShareOutfitCard
              ref={cardRef}
              items={outfit.items}
              username={profile?.username || profile?.display_name}
              occasion={outfit.occasion}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
