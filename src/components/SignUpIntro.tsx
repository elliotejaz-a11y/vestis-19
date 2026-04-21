import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import vestisLogo from "@/assets/vestis-logo.png";
import introOutfitGenerator from "@/assets/intro-outfit-generator.png";

/**
 * Animated counter — eases from 0 → target whenever `target` or `trigger` changes.
 * Uses requestAnimationFrame with an ease-out cubic curve so the number ticks
 * up quickly at first and gently settles on the final value.
 */
function useCountUp(target: number, durationMs = 1100, trigger: unknown = target) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Math.max(0, Math.round(target));
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, target, durationMs]);
  return value;
}

/** Smoothly animates a numeric value (e.g. bar height) from 0 → target. */
function useGrow(target: number, durationMs = 900, trigger: unknown = target) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const to = Math.max(0, target);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out quart for snappy growth that decelerates
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(to * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, target, durationMs]);
  return value;
}

interface SignUpIntroProps {
  onComplete: (meta?: { source?: string | null }) => void;
  onLogin: () => void;
}

type DressFreq = "rarely" | "sometimes" | "always" | null;
type WardrobeSize = "small" | "medium" | "large" | null;
type Source =
  | "instagram"
  | "app_store"
  | "tiktok"
  | "youtube"
  | "friends_family"
  | "google"
  | "facebook"
  | null;

/** With Vestis, getting ready always takes 2 minutes. */
const VESTIS_MINUTES = 2;

/**
 * Pre-signup sales pitch flow. Steps:
 * 0: Welcome to Vestis (hero / feature list)
 * 1: Time slider
 * 2: "Nothing to wear" frequency
 * 3: Yearly comparison graph
 * 4: Lifestyle slide — "more time in the shower / coffee / phone / sleep"
 * 5: Wardrobe size
 * 6: Where did you hear about us?
 * 7: Final reclaimed-hours reveal → Create account
 */
export function SignUpIntro({ onComplete, onLogin }: SignUpIntroProps) {
  const [step, setStep] = useState(0);
  const [minutesPerDay, setMinutesPerDay] = useState(11);
  const [nothingToWear, setNothingToWear] = useState<DressFreq>(null);
  const [wardrobeSize, setWardrobeSize] = useState<WardrobeSize>(null);
  const [source, setSource] = useState<Source>(null);
  // Triggers a fade/slide animation on every step change (60% of slides
  // benefit visibly; the rest still get the subtle entry).
  const [animKey, setAnimKey] = useState(0);
  // When true, plays the "creating account" transition before calling onComplete.
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [step]);

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
    if (isLast) {
      // Play transition out before handing off to the signup form.
      setCreatingAccount(true);
      setTimeout(() => onComplete({ source }), 650);
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  // Per-step validity (Continue button enabled?)
  const canContinue = (() => {
    if (step === 2) return nothingToWear !== null;
    if (step === 5) return wardrobeSize !== null;
    if (step === 6) return source !== null;
    return true;
  })();

  // ---- Bar heights for the comparison graph (step 3) ----
  // Right Now bar is now SKINNIER (narrower column) but still TALLER.
  // Vestis bar is WIDER and a bit TALLER than before so the text fits.
  const MAX_BAR = 240;
  const MIN_VESTIS = 110; // bumped up so all text reads cleanly
  const nowBarHeight = Math.min(MAX_BAR, Math.max(MIN_VESTIS + 50, MAX_BAR));
  const vestisBarHeight = Math.max(
    MIN_VESTIS,
    Math.min(nowBarHeight - 40, (yearlyHoursVestis / Math.max(yearlyHoursNow, 1)) * MAX_BAR + 60)
  );

  // ---- Final "creating account" transition screen ----
  if (creatingAccount) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent/20 animate-ping absolute inset-0" />
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center relative">
              <span className="text-3xl">✨</span>
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground animate-fade-in">
            Setting things up…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed content area — no scrolling */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-36 overflow-hidden">
        {/* Header: back button sits ABOVE a centered segmented progress bar */}
        <div className="mb-4 space-y-2 shrink-0">
          <div className="h-9 flex items-center">
            {!isFirst && (
              <button
                onClick={back}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Segmented progress bar — one pill per step, centered */}
          <div className="flex items-center justify-center gap-1.5 w-full">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 max-w-[44px] rounded-full transition-all duration-500",
                  i <= step ? "bg-foreground" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content — keyed so each step replays its entry animation */}
        <div key={animKey} className="flex-1 flex flex-col animate-fade-in min-h-0">
          {step === 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-2 mb-3 shrink-0 animate-intro-text">
                <h1 className="text-[2.5rem] font-extrabold text-foreground leading-[0.98] tracking-tight">
                  Generate outfits effortlessly
                </h1>
                <p className="text-sm text-muted-foreground max-w-xs">
                  AI-styled looks for any occasion — built from your wardrobe in seconds.
                </p>
              </div>
              <div className="flex-1 flex items-start justify-center min-h-0 -mt-2">
                <div className="relative h-full max-h-full mx-auto animate-phone-fly-in">
                  <div
                    className="absolute inset-0 -z-10 rounded-[3rem] blur-2xl opacity-40 bg-accent/30 animate-pulse-glow"
                    aria-hidden
                  />
                  <img
                    src={introOutfitGenerator}
                    alt="Vestis Outfit Generator preview"
                    className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
                    loading="eager"
                    decoding="sync"
                    // @ts-expect-error - fetchpriority is valid HTML, not yet in TS DOM types
                    fetchpriority="high"
                  />
                </div>
              </div>
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
              <p className="text-7xl font-extrabold text-foreground leading-none animate-scale-in">
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
              ].map((opt, i) => {
                const active = nothingToWear === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setNothingToWear(opt.v)}
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3 animate-fade-in",
                      active
                        ? "bg-accent text-accent-foreground border-accent scale-[1.01]"
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
                      <div className="w-6 h-6 rounded-full border-2 border-accent-foreground flex items-center justify-center animate-scale-in">
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
          <ComparisonGraph
            yearlyHoursNow={yearlyHoursNow}
            yearlyHoursVestis={yearlyHoursVestis}
            savedHours={savedHours}
            nowBarHeight={nowBarHeight}
            vestisBarHeight={vestisBarHeight}
          />
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              {/* Top row of lifestyle emojis */}
              <div className="flex items-center justify-center gap-3 text-5xl animate-scale-in">
                <span>🚿</span>
                <span>☕</span>
                <span>📱</span>
                <span>💤</span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground leading-tight max-w-xs">
                Less time picking your outfit means <span className="text-accent">more time in the shower</span> — or doomscrolling. 📱
              </h1>
              <p className="text-base text-muted-foreground max-w-xs">
                (Or sleeping in. Or your morning coffee. Your call.)
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
              ].map((opt, i) => {
                const active = wardrobeSize === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setWardrobeSize(opt.v)}
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
                    className={cn(
                      "w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-3 animate-fade-in",
                      active
                        ? "bg-accent text-accent-foreground border-accent scale-[1.01]"
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
                      <div className="w-6 h-6 rounded-full border-2 border-accent-foreground flex items-center justify-center animate-scale-in">
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
            <div className="flex-1 grid grid-cols-2 gap-3 content-start">
              {[
                { v: "instagram" as const, t: "Instagram", e: "📸" },
                { v: "app_store" as const, t: "App Store", e: "📲" },
                { v: "tiktok" as const, t: "TikTok", e: "🎵" },
                { v: "youtube" as const, t: "YouTube", e: "▶️" },
                { v: "friends_family" as const, t: "Friends or family", e: "👥" },
                { v: "google" as const, t: "Google", e: "🔎" },
                { v: "facebook" as const, t: "Facebook", e: "📘" },
              ].map((opt, i) => {
                const active = source === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setSource(opt.v)}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                    className={cn(
                      "rounded-2xl px-3 py-4 border-2 transition-all flex flex-col items-center justify-center gap-1.5 animate-fade-in",
                      active
                        ? "bg-accent text-accent-foreground border-accent scale-[1.02]"
                        : "bg-card border-border hover:border-accent/40"
                    )}
                  >
                    <span className="text-2xl">{opt.e}</span>
                    <span className="text-xs font-semibold text-center leading-tight">{opt.t}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3 animate-fade-in">
                With Vestis you'll reclaim
              </p>
              <p className="text-6xl font-bold text-foreground leading-none animate-scale-in">
                {savedHours}
                <span className="text-2xl font-medium text-muted-foreground"> hours per year</span>
              </p>
              <div className="w-12 h-0.5 bg-accent rounded-full my-5 animate-fade-in" />
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed mb-8 animate-fade-in">
                That's hours back in your life — every single year. 🎁
              </p>
              <div className="w-full max-w-xs space-y-px rounded-2xl overflow-hidden border border-border">
                {[
                  { e: "⚡", t: `Get ready in just 2 minutes a day` },
                  { e: "🪄", t: `Reclaim ${savedHours} hours per year` },
                  { e: "👕", t: "More outfit combinations per item" },
                ].map(({ e, t }, i) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 px-4 py-3 bg-card animate-fade-in"
                    style={{ animationDelay: `${150 + i * 90}ms`, animationFillMode: "backwards" }}
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
      </div>

      {/* Fixed footer — overlays the bottom of the scroll area with a fade */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto">
          <Button
            onClick={next}
            disabled={!canContinue}
            className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-semibold text-base hover:bg-accent/90"
          >
            {isFirst ? "Get started" : isLast ? "Create my account" : "Continue"}
          </Button>
          {isFirst && (
            <button
              onClick={onLogin}
              className="w-full text-center text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors"
            >
              Already have an account? <span className="font-semibold text-foreground underline underline-offset-4">Log in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
