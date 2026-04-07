import { useState, useEffect } from "react";
import { X, ArrowRight, Shirt, Sparkles, Users, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Vestis! 👋",
    description: "Let's take a quick tour of the main features so you can get the most out of your wardrobe.",
    icon: Sparkles,
    target: null,
  },
  {
    title: "Photograph Your Clothes 📸",
    description: "Take photos of your clothing items to build your digital wardrobe. Make sure each item fills the entire frame for the best results. You can upload everything at once or add items as you wear them!",
    icon: Camera,
    target: null,
  },
  {
    title: "Your Wardrobe",
    description: "This is your digital closet. All your clothes live here — tap any item to see details, edit, or remove it.",
    icon: Shirt,
    target: "wardrobe",
  },
  {
    title: "Add Clothing",
    description: "Snap a photo or upload from your gallery. Our AI will automatically detect the category, colour, fabric, and estimate value.",
    icon: Sparkles,
    target: "add",
  },
  {
    title: "AI Outfit Generator",
    description: "Get outfit suggestions powered by AI based on your wardrobe, style preferences, and the occasion.",
    icon: Sparkles,
    target: "outfits",
  },
  {
    title: "Social Feed",
    description: "Share your outfits, follow friends, and get inspired by what others are wearing.",
    icon: Users,
    target: "social",
  },
  {
    title: "Your Profile",
    description: "View your wardrobe stats, style preferences, saved outfits, and manage your account.",
    icon: User,
    target: "profile",
  },
];

export function AppTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Only show tutorial when onboarding has just been completed
    const onboardingJustCompleted = localStorage.getItem("vestis_onboarding_just_completed") === "true";
    const tutorialSeen = localStorage.getItem(`vestis_tutorial_seen_${user.id}`);

    if (onboardingJustCompleted && !tutorialSeen) {
      setVisible(true);
      localStorage.removeItem("vestis_onboarding_just_completed");
    }

    // Listen for replay event
    const handleReplay = () => {
      setStep(0);
      setVisible(true);
    };
    window.addEventListener("vestis-replay-tutorial", handleReplay);
    return () => window.removeEventListener("vestis-replay-tutorial", handleReplay);
  }, [user]);

  const dismiss = () => {
    if (user) {
      localStorage.setItem(`vestis_tutorial_seen_${user.id}`, "true");
    }
    setVisible(false);
  };

  const next = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 mx-4 mb-24 sm:mb-0 w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-3xl bg-card border border-border shadow-xl p-6">
          <button onClick={dismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5 mb-5">
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full flex-1 transition-all", i <= step ? "bg-accent" : "bg-border")} />
            ))}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1.5">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.description}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={dismiss} className="flex-1 h-11 rounded-2xl text-sm">Skip</Button>
            <Button onClick={next} className="flex-1 h-11 rounded-2xl text-sm bg-accent text-accent-foreground hover:bg-accent/90">
              {isLast ? "Get Started" : "Next"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
