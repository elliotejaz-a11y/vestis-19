import { useState, useEffect } from "react";
import { X, ArrowRight, Shirt, Sparkles, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Vestis! 👋",
    description: "Let's take a quick tour of the main features so you can get the most out of your wardrobe.",
    icon: Sparkles,
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
    description: "Snap a photo or upload from your gallery. Our AI will automatically detect the category, color, fabric, and estimate value.",
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
    const key = `vestis_tutorial_seen_${user.id}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative z-10 mx-4 mb-24 sm:mb-0 w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-3xl bg-card border border-border shadow-xl p-6">
          {/* Close */}
          <button onClick={dismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all",
                  i <= step ? "bg-accent" : "bg-border"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-accent" />
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-foreground mb-1.5">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.description}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={dismiss} className="flex-1 h-11 rounded-2xl text-sm">
              Skip
            </Button>
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
