import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import vestisLogo from "@/assets/vestis-logo.png";

interface SignUpIntroProps {
  onComplete: () => void;
  onBack: () => void;
}

type DressFreq = "rarely" | "sometimes" | "always" | null;
type WardrobeSize = "small" | "medium" | "large" | null;

/**
 * Pre-signup sales pitch flow. Themed in Vestis cream/maroon palette,
 * with emoji-led copy. Calculates personalised time savings (Vestis
 * always = 2 min/day) before handing off to the actual sign-up form.
 */
export function SignUpIntro({ onComplete, onBack }: SignUpIntroProps) {
  const [step, setStep] = useState(0);
  const [minutesPerDay, setMinutesPerDay] = useState(11);
  const [nothingToWear, setNothingToWear] = useState<DressFreq>(null);
  const [wardrobeSize, setWardrobeSize] = useState<WardrobeSize>(null);

  // ---- Derived savings ----
  // Current: user-reported minutes/day. With Vestis: fixed at 2 min/day.
  const VESTIS_MIN = 2;
  const yearlyMinutesNow = useMemo(() => minutesPerDay * 365, [minutesPerDay]);
  const yearlyMinutesVestis = VESTIS_MIN * 365;
  const yearlyHoursNow = useMemo(
    () => Math.round(yearlyMinutesNow / 60),
    [yearlyMinutesNow]
  );
  const yearlyHoursVestis = Math.round(yearlyMinutesVestis / 60);
  const savedHours = Math.max(0, yearlyHoursNow - yearlyHoursVestis);

  const totalSteps = 6;
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
            className="h-full bg-accent transition-all duration-300"
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
                Welcome to Vestis ✨
              </h1>
              <p className="text-base text-muted-foreground max-w-xs">
                Your AI-powered wardrobe. Let's see how much time we can
                save you.
              </p>
            </div>
            <div className="w-full max-w-xs pt-4 space-y-2.5">
              {[
                { emoji: "👕", label: "Digitise your entire wardrobe" },
                { emoji: "✨", label: "AI outfits for any occasion" },
                { emoji: "📅", label: "Plan & track what you wear" },
                { emoji: "👯", label: "Share fits with friends" },
              ].map(({ emoji, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-1 py-1"
                >
                  <span className="text-2xl shrink-0" aria-hidden>
                    {emoji}
                  </span>
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
              ⏱️ How long do you spend picking an outfit each morning?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Drag the slider to your average.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <p className="text-5xl font-bold text-foreground">
                {minutesPerDay}{" "}
                <span className="text-2xl font-medium text-muted-foreground">
                  min
                </span>
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
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-border accent-accent"
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
              😩 How often do you think "I have nothing to wear"?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              We hear this one a lot.
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "rarely" as const, t: "Rarely", d: "I've got my go-to outfits", e: "😎" },
                { v: "sometimes" as const, t: "Sometimes", d: "Depends on the occasion", e: "🤔" },
                { v: "always" as const, t: "All the time", d: "Staring at my closet is a daily thing", e: "😫" },
              ].map((opt) => {
                const active = nothingToWear === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setNothingToWear(opt.v)}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3",
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <span className="text-2xl shrink-0" aria-hidden>{opt.e}</span>
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-accent-foreground/80" : "text-muted-foreground")}>
                        {opt.d}
                      </p>
                    </div>
                    {active && (
                      <div className="w-6 h-6 rounded-full border-2 border-accent-foreground flex items-center justify-center">
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
              ⚡ Get ready in just 2 minutes with Vestis
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Here's how your year looks before and after.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-xs rounded-3xl bg-muted/50 p-6">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div
                    className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center justify-between"
                    style={{ height: 180 }}
                  >
                    <p className="text-xs font-semibold text-muted-foreground text-center">
                      Without Vestis
                    </p>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">
                        {minutesPerDay}
                        <span className="text-sm font-medium">m</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        / day
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground">
                      ≈ {yearlyHoursNow}h / year
                    </p>
                  </div>
                  <div
                    className="rounded-2xl bg-accent p-4 flex flex-col items-center justify-between"
                    style={{ height: 240 }}
                  >
                    <p className="text-xs font-semibold text-accent-foreground/80 text-center">
                      With Vestis ✨
                    </p>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-accent-foreground">
                        2<span className="text-sm font-medium">m</span>
                      </p>
                      <p className="text-[11px] text-accent-foreground/70 mt-1">
                        / day
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-accent-foreground">
                      ≈ {yearlyHoursVestis}h / year
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6 max-w-xs">
                That's{" "}
                <span className="font-bold text-accent">
                  {savedHours} hours
                </span>{" "}
                a year back in your life. 🎉
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              👗 How big is your wardrobe?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Roughly how many clothing items do you own?
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "small" as const, t: "Compact", d: "Under 50 items", e: "🧺" },
                { v: "medium" as const, t: "Average", d: "50–150 items", e: "👚" },
                { v: "large" as const, t: "Extensive", d: "150+ items", e: "🛍️" },
              ].map((opt) => {
                const active = wardrobeSize === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setWardrobeSize(opt.v)}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3",
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <span className="text-2xl shrink-0" aria-hidden>{opt.e}</span>
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-accent-foreground/80" : "text-muted-foreground")}>
                        {opt.d}
                      </p>
                    </div>
                    {active && (
                      <div className="w-6 h-6 rounded-full border-2 border-accent-foreground flex items-center justify-center">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
                With Vestis you'll save
              </p>
              <p className="text-6xl font-bold text-accent leading-none">
                {savedHours}h
                <span className="text-2xl font-medium text-muted-foreground">
                  /year
                </span>
              </p>
              <div className="w-12 h-0.5 bg-accent rounded-full my-5" />
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-8">
                More time for the things you actually love. 💛
              </p>
              <div className="w-full max-w-xs space-y-px rounded-2xl overflow-hidden border border-border">
                {[
                  { e: "⏰", t: `Reclaim ${savedHours} hours a year` },
                  { e: "✨", t: "Outfits ready in 2 minutes flat" },
                  { e: "👕", t: "More combinations from what you own" },
                ].map(({ e, t }) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 px-4 py-3 bg-card"
                  >
                    <span className="text-lg shrink-0" aria-hidden>{e}</span>
                    <p className="text-sm font-medium text-foreground text-left">
                      {t}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-5 max-w-xs">
                Estimates based on average Vestis user behaviour.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Continue button */}
      <Button
        onClick={next}
        disabled={!canContinue}
        className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-semibold text-base hover:bg-accent/90 mt-6"
      >
        {isLast ? "Create my account" : "Continue"}
      </Button>
    </div>
  );
}
