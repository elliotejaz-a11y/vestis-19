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
type HearAbout =
  | "instagram"
  | "appstore"
  | "tiktok"
  | "youtube"
  | "friends"
  | "google"
  | "facebook"
  | null;

/** With Vestis, getting ready always takes 2 minutes. */
const VESTIS_MINUTES = 2;

const HEAR_OPTIONS: { v: Exclude<HearAbout, null>; t: string; e: string }[] = [
  { v: "instagram", t: "Instagram", e: "📸" },
  { v: "appstore", t: "App Store", e: "🍎" },
  { v: "tiktok", t: "TikTok", e: "🎵" },
  { v: "youtube", t: "YouTube", e: "▶️" },
  { v: "friends", t: "Friends or Family", e: "👯" },
  { v: "google", t: "Google", e: "🔎" },
  { v: "facebook", t: "Facebook", e: "👍" },
];

/**
 * Pre-signup sales pitch flow. Steps:
 * 0: Welcome to Vestis
 * 1: Time slider
 * 2: "Nothing to wear" frequency
 * 3: Yearly comparison graph
 * 4: Lifestyle slide — "more time in the shower / coffee / phone / sleep"
 * 5: Wardrobe size
 * 6: Where did you hear about us
 * 7: Final reclaimed-hours reveal → Create account
 */
export function SignUpIntro({ onComplete, onLogin }: SignUpIntroProps) {
  const [step, setStep] = useState(0);
  const [minutesPerDay, setMinutesPerDay] = useState(11);
  const [nothingToWear, setNothingToWear] = useState<DressFreq>(null);
  const [wardrobeSize, setWardrobeSize] = useState<WardrobeSize>(null);
  const [hearAbout, setHearAbout] = useState<HearAbout>(null);

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

  const totalSteps = 8;
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
    if (step === 6) return hearAbout !== null;
    return true;
  })();

  // ---- Bar widths for the comparison graph (step 3) ----
  // Right Now bar should be SKINNIER (narrower) than the With Vestis bar,
  // but both bars must be tall enough to clearly show their text.
  // "Right now" stays TALLER (more wasted hours), "With Vestis" stays SHORTER
  // but tall enough to read.
  const MAX_BAR_HEIGHT = 230;
  const MIN_BAR_HEIGHT = 130; // raised so With Vestis has room for its text
  const nowBarHeight = Math.min(
    MAX_BAR_HEIGHT,
    Math.max(MIN_BAR_HEIGHT + 50, (yearlyHoursNow / Math.max(yearlyHoursNow, 1)) * MAX_BAR_HEIGHT)
  );
  const vestisBarHeight = Math.max(
    MIN_BAR_HEIGHT,
    Math.min(nowBarHeight - 30, (yearlyHoursVestis / Math.max(yearlyHoursNow, 1)) * MAX_BAR_HEIGHT + 80)
  );

  // Animations: helper to pick a per-slide enter animation.
  // We animate ~60% of slides (steps 0, 3, 4, 6, 7).
  const stepAnim: Record<number, string> = {
    0: "animate-fade-in",
    3: "animate-scale-in",
    4: "animate-fade-in",
    6: "animate-fade-in",
    7: "animate-scale-in",
  };
  const contentAnim = stepAnim[step] ?? "";

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
      <div className={cn("flex-1 flex flex-col", contentAnim)} key={step}>
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
                <div className="flex items-end justify-center gap-6">
                  {/* Right now — TALLER but SKINNIER */}
                  <div
                    className="rounded-2xl bg-card border border-border px-3 py-4 flex flex-col items-center justify-between w-[88px]"
                    style={{ height: nowBarHeight }}
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground text-center leading-tight">
                      Right now
                    </p>
                    <span className="text-2xl">😩</span>
                    <div className="text-center">
                      <p className="text-xl font-bold text-foreground leading-none">
                        {yearlyHoursNow}<span className="text-xs font-medium">h</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">per year</p>
                    </div>
                  </div>
                  {/* With Vestis — SHORTER but WIDER, with breathing room for text */}
                  <div
                    className="rounded-2xl bg-accent px-4 py-4 flex flex-col items-center justify-between w-[130px]"
                    style={{ height: vestisBarHeight }}
                  >
                    <p className="text-xs font-semibold text-accent-foreground text-center leading-tight">
                      With Vestis
                    </p>
                    <span className="text-2xl">✨</span>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-accent-foreground leading-none">
                        {yearlyHoursVestis}<span className="text-sm font-medium">h</span>
                      </p>
                      <p className="text-[9px] text-accent-foreground/80 mt-1">per year</p>
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
              <div className="flex items-center gap-3 text-5xl">
                <span>🚿</span>
                <span>☕</span>
                <span>📱</span>
                <span>😴</span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground leading-tight max-w-xs">
                Less time picking your outfit means <span className="text-accent">more time in the shower.</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-xs">
                Or sleeping in. Or your morning coffee. Or doomscrolling. Your call. ✌️
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
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              Where did you hear about us? 👋
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Helps us know what's working.
            </p>
            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pb-2">
              {HEAR_OPTIONS.map((opt) => {
                const active = hearAbout === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setHearAbout(opt.v)}
                    className={cn(
                      "w-full text-left rounded-2xl px-4 py-3 border-2 transition-all flex items-center gap-3",
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <span className="text-xl">{opt.e}</span>
                    <p className="flex-1 text-sm font-bold">{opt.t}</p>
                    {active && (
                      <div className="w-5 h-5 rounded-full border-2 border-accent-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
                With Vestis you'll reclaim
              </p>
              <p className="text-6xl font-bold text-foreground leading-none">
                {savedHours}
                <span className="text-2xl font-medium text-muted-foreground"> hours per year</span>
              </p>
              <div className="w-12 h-0.5 bg-accent rounded-full my-5" />
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-8">
                That's hours back in your life — every single year. 🎁
              </p>
              <div className="w-full max-w-xs space-y-px rounded-2xl overflow-hidden border border-border">
                {[
                  { e: "⚡", t: `Get ready in just 2 minutes a day` },
                  { e: "🪄", t: `Reclaim ${savedHours} hours per year` },
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
