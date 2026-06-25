import { useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function PremiumSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            You are now a Vestis Premium member
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your premium features are now unlocked. Return to the Vestis app to get started.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-widest">
            What you have unlocked
          </p>
          {[
            "Mass closet upload",
            "Extract from Outfit",
            "AI outfit try-on (coming soon)",
            "All future Vestis Premium features",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
              <p className="text-sm text-foreground">{feature}</p>
            </div>
          ))}
        </div>

        <a
          href="vestisapp://premium/success"
          className="block w-full rounded-2xl bg-accent text-accent-foreground text-sm font-semibold h-12 flex items-center justify-center hover:bg-accent/90 transition-colors"
        >
          Open Vestis
        </a>

        <p className="text-xs text-muted-foreground">
          If the button above does not open the app, return to it manually and your premium access will be active.
        </p>

        {sessionId && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            Ref: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
