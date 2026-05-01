import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Shirt, Sparkles, Users, User, Camera, WashingMachine, Sun, Calendar as CalendarIcon, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import wardrobeImg from "@/assets/tutorial/wardrobe.png";
import addImg from "@/assets/tutorial/add.png";
import whenToUploadImg from "@/assets/tutorial/when-to-upload.jpg";
import outfitsImg from "@/assets/tutorial/outfits.png";
import calendarImg from "@/assets/tutorial/calendar.png";
import socialsImg from "@/assets/tutorial/socials.png";
import profileImg from "@/assets/tutorial/profile.png";

type TutorialStep = {
  title: string;
  description: string;
  icon: typeof Sparkles;
  image: string;
  imageType?: "screenshot" | "illustration";
  bullets?: { icon: typeof Sparkles; text: string }[];
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Vestis 👋",
    description:
      "Your wardrobe, reimagined. Here's a quick tour of what you can do — every piece you own, organised in one place.",
    icon: Sparkles,
    image: wardrobeImg,
    imageType: "screenshot",
  },
  {
    title: "Add Your Clothes",
    description:
      "Snap a photo, upload from your gallery, or mass-upload a pile. Our AI auto-detects category, colour, fabric and value — no typing needed.",
    icon: Camera,
    image: addImg,
    imageType: "screenshot",
  },
  {
    title: "When To Upload",
    description:
      "Building your wardrobe is easiest as part of your routine. Try these moments:",
    icon: WashingMachine,
    image: whenToUploadImg,
    imageType: "illustration",
    bullets: [
      { icon: WashingMachine, text: "Straight out of the washing machine — clothes are clean, flat and easy to photograph." },
      { icon: Shirt, text: "After every wear, before tossing it in the wash basket." },
      { icon: Sun, text: "While putting away laundry — capture each item as you fold." },
      { icon: ShoppingBag, text: "As soon as you buy something new — never forget what you own." },
      { icon: CalendarIcon, text: "Set aside 20 minutes on a Sunday for a wardrobe sweep." },
    ],
  },
  {
    title: "Your Wardrobe",
    description:
      "Your digital closet. Browse by category, sort by value, and tap any piece to view details, edit or remove it.",
    icon: Shirt,
    image: wardrobeImg,
    imageType: "screenshot",
  },
  {
    title: "AI Outfit Generator",
    description:
      "Pick an occasion — date night, gym, brunch, formal — and Vestis builds an outfit using only the clothes you own. No more 'nothing to wear'.",
    icon: Sparkles,
    image: outfitsImg,
    imageType: "screenshot",
  },
  {
    title: "Plan & Track",
    description:
      "Use the calendar to plan tomorrow's fit and log what you actually wore. Spot your favourites and rediscover forgotten pieces.",
    icon: CalendarIcon,
    image: calendarImg,
    imageType: "screenshot",
  },
  {
    title: "Socials",
    description:
      "Message friends, share fits, follow people whose style you love, and discover new looks in the feed.",
    icon: Users,
    image: socialsImg,
    imageType: "screenshot",
  },
  {
    title: "Your Profile",
    description:
      "Your stats, fit pics, wishlist, saved outfits and settings — all in one place. You can replay this tour anytime from the help menu.",
    icon: User,
    image: profileImg,
    imageType: "screenshot",
  },
];

export function AppTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const isFreshSignup = localStorage.getItem("vestis_fresh_signup") === "true";
    const tutorialSeen = localStorage.getItem(`vestis_tutorial_seen_${user.id}`);

    if (isFreshSignup && !tutorialSeen) {
      setStep(0);
      setVisible(true);
      localStorage.removeItem("vestis_fresh_signup");
    }

    const handleReplay = () => {
      setStep(0);
      setVisible(true);
    };
    window.addEventListener("vestis-replay-tutorial", handleReplay);
    return () => window.removeEventListener("vestis-replay-tutorial", handleReplay);
  }, [user]);

  // Lock body scroll while open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const dismiss = useCallback(() => {
    if (user) {
      localStorage.setItem(`vestis_tutorial_seen_${user.id}`, "true");
    }
    setVisible(false);
  }, [user]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s < TUTORIAL_STEPS.length - 1) return s + 1;
      dismiss();
      return s;
    });
  }, [dismiss]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // Keyboard nav
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, next, prev, dismiss]);

  if (!visible) return null;

  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-background flex flex-col animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="App tutorial"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {step + 1} / {TUTORIAL_STEPS.length}
        </span>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
          aria-label="Skip tutorial"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bars */}
      <div className="px-5 pb-2">
        <div className="flex gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full flex-1 transition-all duration-500",
                i < step ? "bg-accent" : i === step ? "bg-accent" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        key={step}
        className="flex-1 overflow-y-auto px-6 pb-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300"
      >
        <div className="max-w-md mx-auto flex flex-col items-center text-center pt-2">
          <div
            className={cn(
              "relative w-full rounded-3xl overflow-hidden mb-6 ring-1 ring-border shadow-sm bg-muted/40 flex items-center justify-center",
              current.imageType === "screenshot" ? "aspect-[3/4] max-w-[280px]" : "aspect-[4/3]",
            )}
          >
            <img
              src={current.image}
              alt={current.title}
              loading={step === 0 ? "eager" : "lazy"}
              className={cn(
                "w-full h-full",
                current.imageType === "screenshot" ? "object-contain" : "object-cover",
              )}
            />
            <div className="absolute bottom-3 right-3 w-11 h-11 rounded-2xl bg-background/95 backdrop-blur-sm flex items-center justify-center ring-1 ring-border shadow-sm">
              <Icon className="w-5 h-5 text-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3 leading-tight">
            {current.title}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            {current.description}
          </p>

          {current.bullets && (
            <ul className="w-full space-y-3 text-left">
              {current.bullets.map((b, i) => {
                const BIcon = b.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50 border border-border"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center">
                      <BIcon className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pt-1.5">{b.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 border-t border-border bg-background">
        <div className="max-w-md mx-auto flex gap-3">
          {!isFirst ? (
            <Button
              variant="outline"
              onClick={prev}
              className="h-12 rounded-2xl px-5"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={dismiss}
              className="h-12 rounded-2xl px-5 text-sm"
            >
              Skip
            </Button>
          )}
          <Button
            onClick={next}
            className="flex-1 h-12 rounded-2xl text-sm bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isLast ? (
              <>
                Get Started
                <Check className="w-4 h-4 ml-1.5" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
