import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { createCheckoutSession } from "@/services/checkoutService";

export interface PaywallScreenProps {
  featureName: string;
  onDismiss: () => void;
}

const PREMIUM_FEATURES = [
  "Mass closet upload - photograph a pile, AI builds your wardrobe",
  "Extract from Outfit - pull pieces from any outfit photo",
  "AI outfit try-on - coming soon",
  "All future Vestis Premium features",
] as const;

export function PaywallScreen({ featureName, onDismiss }: PaywallScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { url } = await createCheckoutSession();
      // Navigate the current tab to Stripe checkout. The user returns via
      // the success_url after payment, which updates is_premium via webhook.
      window.location.href = url;
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col px-1 py-2">
      <button
        type="button"
        onClick={onDismiss}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-1">
          Unlock {featureName}
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Vestis Premium</h2>
        <p className="text-accent font-semibold text-lg mt-1">$7.99, yours forever</p>
        <p className="text-xs text-muted-foreground mt-0.5">One-time payment. No subscription.</p>
      </div>

      <div className="space-y-3 mb-6">
        {PREMIUM_FEATURES.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-accent" />
            </div>
            <p className="text-sm text-foreground leading-snug">{feature}</p>
          </div>
        ))}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive text-center mb-3">{errorMessage}</p>
      )}

      <Button
        type="button"
        className="w-full rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-sm font-semibold"
        onClick={handleUpgrade}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening checkout...
          </>
        ) : (
          "Upgrade for $7.99"
        )}
      </Button>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs text-muted-foreground text-center hover:text-foreground transition-colors w-full"
      >
        No thanks
      </button>
    </div>
  );
}
