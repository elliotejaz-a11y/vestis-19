import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import vestisLogo from "@/assets/vestis-logo.png";

interface SignUpIntroProps {
  onComplete: () => void;
  onLogin: () => void;
}

type DressFreq = "rarely" | "sometimes" | "always" | null;
type WardrobeSize = "small" | "medium" | "large" | null;

/** With Vestis, getting ready always takes 2 minutes. */
const VESTIS_MINUTES = 2;

/**
 * Pre-signup sales pitch flow. Steps:
 * 0: Welcome to Vestis (hero / feature list)
 * 1: Time slider
 * 2: "Nothing to wear" frequency
 * 3: Yearly comparison graph (Vestis bar smaller than Right now)
 * 4: Lifestyle slide — "Less time picking your outfit = more time in the shower"
 * 5: Wardrobe size
 * 6: Final reclaimed-hours reveal → Create account
 */
export function SignUpIntro({ onComplete, onLogin }: SignUpIntroProps) {
  const [step, setStep] = useState(0);
  const [minutesPerDay, setMinutesPerDay] = useState(11);
  const [nothingToWear, setNothingToWear] = useState<DressFreq>(null);
  const [wardrobeSize, setWardrobeSize] = useState<WardrobeSize>(null);

  // ---- Derived savings ----
  const yearlyHoursNow = useMemo(
    () => Math.round((minutesPerDay * 365) / 60),
    [minutesPerDay]
  );
  const yearlyHoursVestis = useMemo(
    () => Math.round((VESTIS_MINUTES * 365) / 60),
    []
  );
  const savedHours = Math.max(0, yearlyHoursNow - yearlyHoursVestis);

  const totalSteps = 7;
  const isLast = step === totalSteps - 1;
  const isFirst = step === 0;

  const next = () => {
    if (isLast) onComplete();
    else setStep((s) => s + 1);
  };

  const back = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  // Per-step validity (Continue button enabled?)
  const canContinue = (() => {
    if (step === 2) return nothingToWear !== null;
    if (step === 5) return wardrobeSize !== null;
    return true;
  })();

  // ---- Bar heights for the comparison graph (step 3) ----
  // Vestis bar must be smaller than "Right now". We compute proportional
  // heights but cap "Right now" so the layout never breaks.
  const MAX_BAR = 220;
  const MIN_BAR = 70;
  const nowBarHeight = Math.min(
    MAX_BAR,
    Math.max(MIN_BAR + 40, (yearlyHoursNow / Math.max(yearlyHoursNow, 1)) * MAX_BAR)
  );
  const vestisBarHeight = Math.max(
    MIN_BAR,
    Math.min(nowBarHeight - 60, (yearlyHoursVestis / Math.max(yearlyHoursNow, 1)) * MAX_BAR)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 pt-6 pb-8">
      {/* Header: back + progress. Back button hidden on the first screen. */}
      <div className="flex items-center gap-3 mb-8">
        {isFirst ? (
          <div className="w-9 h-9" aria-hidden />
        ) : (
          <button
            onClick={back}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
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
                Your AI-powered wardrobe. Let's see how much time we can give back to you.
              </p>
            </div>
            <ul className="w-full max-w-xs pt-2 space-y-3 text-left">
              {[
                { emoji: "👕", label: "Digitise your entire wardrobe" },
                { emoji: "🪄", label: "AI outfits for any occasion" },
                { emoji: "📅", label: "Plan & track what you wear" },
                { emoji: "👯", label: "Share fits with friends" },
              ].map(({ emoji, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 text-foreground"
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-4xl font-extrabold text-foreground leading-[1.05] tracking-tight mb-3">
              How long does getting dressed <span className="text-accent">really</span> take you? ⏰
            </h1>
            <p className="text-base text-muted-foreground mb-8">
              Be honest. We'll show you what you could get back.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <p className="text-7xl font-extrabold text-foreground leading-none">
                {minutesPerDay}
                <span className="text-2xl font-medium text-muted-foreground ml-2">min</span>
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
              <p className="text-sm text-muted-foreground text-center max-w-xs pt-4">
                That's around <span className="font-bold text-foreground">{yearlyHoursNow} hours</span> a year just deciding what to wear. 😮
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How often do you think "I have nothing to wear"? 🤔
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              We hear this one a lot.
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "rarely" as const, t: "Rarely", d: "I've got my go-to outfits", e: "😎" },
                { v: "sometimes" as const, t: "Sometimes", d: "Depends on the occasion", e: "🤷‍♂️" },
                { v: "always" as const, t: "All the time", d: "Staring at my closet daily", e: "😩" },
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
                    <span className="text-2xl">{opt.e}</span>
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-accent-foreground/75" : "text-muted-foreground")}>
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
              Get ready in just 2 minutes ⚡
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Here's what your year looks like with Vestis.
            </p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-xs rounded-3xl bg-muted/50 p-6">
                <div className="grid grid-cols-2 gap-4 items-end">
                  {/* Right now — TALLER */}
                  <div
                    className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center justify-between"
                    style={{ height: nowBarHeight }}
                  >
                    <p className="text-xs font-semibold text-muted-foreground text-center">
                      Right now
                    </p>
                    <span className="text-3xl">😩</span>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground leading-none">
                        {yearlyHoursNow}<span className="text-sm font-medium">h</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">per year</p>
                    </div>
                  </div>
                  {/* With Vestis — SHORTER */}
                  <div
                    className="rounded-2xl bg-accent p-4 flex flex-col items-center justify-between"
                    style={{ height: vestisBarHeight }}
                  >
                    <p className="text-xs font-semibold text-accent-foreground/80 text-center">
                      With Vestis
                    </p>
                    <span className="text-2xl">✨</span>
                    <div className="text-center">
                      <p className="text-xl font-bold text-accent-foreground leading-none">
                        {yearlyHoursVestis}<span className="text-xs font-medium">h</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6 max-w-xs">
                That's <span className="font-bold text-foreground">{savedHours} hours</span> a year back in your life. 🎉
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <span className="text-6xl">🚿</span>
              <h1 className="text-3xl font-extrabold text-foreground leading-tight max-w-xs">
                Less time picking your outfit means <span className="text-accent">more time in the shower.</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-xs">
                (Or sleeping in. Or your morning coffee. Your call. ☕)
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              How big is your wardrobe? 👗
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Roughly how many clothing items do you own?
            </p>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {[
                { v: "small" as const, t: "Compact", d: "Under 50 items", e: "🧺" },
                { v: "medium" as const, t: "Average", d: "50–150 items", e: "🚪" },
                { v: "large" as const, t: "Extensive", d: "150+ items", e: "🏬" },
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
                    <span className="text-2xl">{opt.e}</span>
                    <div className="flex-1">
                      <p className="text-base font-bold">{opt.t}</p>
                      <p className={cn("text-xs mt-0.5", active ? "text-accent-foreground/75" : "text-muted-foreground")}>
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

        {step === 6 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
                With Vestis you'll reclaim
              </p>
              <p className="text-6xl font-bold text-foreground leading-none">
                {savedHours}
                <span className="text-2xl font-medium text-muted-foreground"> hrs/yr</span>
              </p>
              <div className="w-12 h-0.5 bg-accent rounded-full my-5" />
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-8">
                That's hours back in your life — every single year. 🎁
              </p>
              <div className="w-full max-w-xs space-y-px rounded-2xl overflow-hidden border border-border">
                {[
                  { e: "⚡", t: `Get ready in just 2 minutes a day` },
                  { e: "🪄", t: `Reclaim ${savedHours} hours a year` },
                  { e: "👕", t: "More outfit combinations per item" },
                ].map(({ e, t }) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 px-4 py-3 bg-card"
                  >
                    <span className="text-lg">{e}</span>
                    <p className="text-sm font-medium text-foreground text-left">
                      {t}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-5 max-w-xs">
                Estimates based on average Vestis users.
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
        {isFirst ? "Get started" : isLast ? "Create my account" : "Continue"}
      </Button>

      {/* "Already have an account" — only on the landing/first step */}
      {isFirst && (
        <button
          onClick={onLogin}
          className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
        >
          Already have an account? <span className="font-semibold text-foreground underline underline-offset-4">Log in</span>
        </button>
      )}
    </div>
  );
}
