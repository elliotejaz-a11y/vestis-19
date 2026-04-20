import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Sparkles, Shirt, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import vestisLogo from "@/assets/vestis-logo.png";

interface SignUpIntroProps {
  onComplete: () => void;
  onBack: () => void;
}

type DressFreq = "rarely" | "sometimes" | "always" | null;
type WardrobeSize = "small" | "medium" | "large" | null;

/**
 * Pre-signup sales pitch flow. Mirrors the screenshots provided by the user
 * (Essembl-style) but adapted for Vestis. Calculates personalised
 * time/money savings based on the user's answers, then hands off to the
 * actual sign-up form.
 */
export function SignUpIntro({ onComplete, onBack }: SignUpIntroProps) {
  const [step, setStep] = useState(0);
  const [minutesPerDay, setMinutesPerDay] = useState(11);
  const [nothingToWear, setNothingToWear] = useState<DressFreq>(null);
  const [wardrobeSize, setWardrobeSize] = useState<WardrobeSize>(null);
  const [impulseSpend, setImpulseSpend] = useState(80);

  // ---- Derived savings ----
  const yearlyHours = useMemo(
    () => Math.round((minutesPerDay * 365) / 60),
    [minutesPerDay]
  );
  const savedHours = useMemo(() => Math.round(yearlyHours * 0.5), [yearlyHours]);
  const monthlySavings = useMemo(
    () => Math.round(impulseSpend * 0.6),
    [impulseSpend]
  );
  const yearlySavings = monthlySavings * 12;

  const totalSteps = 7;
  const isLast = step === totalSteps - 1;

  const next = () => {
    if (isLast) onComplete();
    else setStep((s) => s + 1);
  };

  const back = () => {
    if (step === 0) onBack();
    else setStep((s) => s - 1);
  };

  // Per-step validity (Continue button enabled?)
  const canContinue = (() => {
    if (step === 2) return nothingToWear !== null;
    if (step === 4) return wardrobeSize !== null;
    return true;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 pt-6 pb-8">
      {/* Header: back + progress */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={back}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col">
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <img src={vestisLogo} alt="Vestis" className="h-12" />
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground leading-tight">
                Welcome to Vestis
              </h1>
              <p className="text-base text-muted-foreground max-w-xs">
                Your AI-powered wardrobe. Let's see how much time and money
                we can save you.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs pt-4">
              {[
                { icon: Shirt, label: "Digitise your entire wardrobe" },
                { icon: Sparkles, label: "AI outfits for any occasion" },
                { icon: Calendar, label: "Plan & track what you wear" },
                { icon: Users, label: "Share fits with friends" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground text-left">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How long do you spend picking an outfit each morning?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Drag the slider to your average.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <p className="text-5xl font-bold text-foreground">
                {minutesPerDay} <span className="text-2xl font-medium text-muted-foreground">min</span>
              </p>
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">😌</span>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={minutesPerDay}
                    onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-border accent-foreground"
                  />
                  <span className="text-2xl">😖</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-9">
                  <span>Instantly</span>
                  <span>30+ min</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How often do you think "I have nothing to wear"?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              We hear this one a lot.
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "rarely" as const, t: "Rarely", d: "I've got my go-to outfits" },
                { v: "sometimes" as const, t: "Sometimes", d: "Depends on the occasion" },
                { v: "always" as const, t: "All the time", d: "Staring at my closet is a daily thing" },
              ].map((opt) => {
                const active = nothingToWear === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setNothingToWear(opt.v)}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-background/70" : "text-muted-foreground")}>
                        {opt.d}
                      </p>
                    </div>
                    {active && (
                      <div className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              Get ready twice as fast with Vestis
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Based on real users who digitised their wardrobe.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-xs rounded-3xl bg-muted/50 p-6">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center" style={{ height: 160 }}>
                    <p className="text-xs font-semibold text-muted-foreground text-center mb-auto">
                      Without Vestis
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {minutesPerDay}<span className="text-sm font-medium">m</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-foreground p-4 flex flex-col items-center" style={{ height: 220 }}>
                    <p className="text-xs font-semibold text-background/70 text-center mb-auto">
                      With Vestis
                    </p>
                    <p className="text-2xl font-bold text-background">
                      {Math.max(1, Math.round(minutesPerDay / 2))}<span className="text-sm font-medium">m</span>
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6 max-w-xs">
                That's <span className="font-bold text-foreground">{savedHours} hours</span> a year back in your life.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How big is your wardrobe?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Roughly how many clothing items do you own?
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "small" as const, t: "Compact", d: "Under 50 items" },
                { v: "medium" as const, t: "Average", d: "50–150 items" },
                { v: "large" as const, t: "Extensive", d: "150+ items" },
              ].map((opt) => {
                const active = wardrobeSize === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setWardrobeSize(opt.v)}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-background/70" : "text-muted-foreground")}>
                        {opt.d}
                      </p>
                    </div>
                    {active && (
                      <div className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How much do you spend on clothes you barely wear?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              An honest monthly estimate.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <p className="text-5xl font-bold text-foreground">
                ${impulseSpend}<span className="text-2xl font-medium text-muted-foreground">/mo</span>
              </p>
              <div className="w-full max-w-xs space-y-3">
                <input
                  type="range"
                  min={0}
                  max={400}
                  step={10}
                  value={impulseSpend}
                  onChange={(e) => setImpulseSpend(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-foreground"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$0</span>
                  <span>$400+</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
                Vestis users save an average of
              </p>
              <p className="text-6xl font-bold text-foreground leading-none">
                ${monthlySavings}
                <span className="text-2xl font-medium text-muted-foreground">/mo</span>
              </p>
              <div className="w-12 h-0.5 bg-accent rounded-full my-5" />
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-8">
                by avoiding impulse buys and building a smarter wardrobe.
              </p>
              <div className="w-full max-w-xs space-y-px rounded-2xl overflow-hidden border border-border">
                {[
                  `Save ~$${yearlySavings} per year`,
                  `Reclaim ${savedHours} hours a year`,
                  "More outfit combinations per item",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-center gap-3 px-4 py-3 bg-card"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground text-left">
                      {line}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-5 max-w-xs">
                Estimates based on average spending habits of our users.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Continue button */}
      <Button
        onClick={next}
        disabled={!canContinue}
        className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold text-base hover:bg-foreground/90 mt-6"
      >
        {isLast ? "Create my account" : "Continue"}
      </Button>
    </div>
  );
}
