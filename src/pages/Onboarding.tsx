import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, ArrowLeft, Check, Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const SKIN_TONES = [
  { value: "fair", label: "Fair", color: "bg-[#FDEBD0]" },
  { value: "light", label: "Light", color: "bg-[#F5CBA7]" },
  { value: "medium", label: "Medium", color: "bg-[#DC7633]" },
  { value: "olive", label: "Olive", color: "bg-[#BA9B68]" },
  { value: "tan", label: "Tan", color: "bg-[#A0522D]" },
  { value: "dark", label: "Dark", color: "bg-[#6F4E37]" },
  { value: "deep", label: "Deep", color: "bg-[#3B2F2F]" },
];

export const STYLES = [
  { value: "casual", label: "Casual", emoji: "👕" },
  { value: "classic", label: "Classic", emoji: "🎩" },
  { value: "streetwear", label: "Streetwear", emoji: "🧢" },
  { value: "minimalist", label: "Minimalist", emoji: "⬜" },
  { value: "bohemian", label: "Bohemian", emoji: "🌸" },
  { value: "elegant", label: "Elegant", emoji: "✨" },
  { value: "sporty", label: "Sporty", emoji: "🏃" },
  { value: "vintage", label: "Vintage", emoji: "📻" },
];

export const BODY_TYPES = [
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "average", label: "Average" },
  { value: "curvy", label: "Curvy" },
  { value: "plus-size", label: "Plus Size" },
  { value: "tall", label: "Tall" },
  { value: "petite", label: "Petite" },
];

export const COLOR_OPTIONS = [
  { value: "neutrals", label: "Neutrals", desc: "Black, white, beige, gray" },
  { value: "earth-tones", label: "Earth Tones", desc: "Brown, olive, tan, rust" },
  { value: "pastels", label: "Pastels", desc: "Soft pink, lavender, mint" },
  { value: "bold", label: "Bold Colors", desc: "Red, cobalt, emerald" },
  { value: "monochrome", label: "Monochrome", desc: "All black or all white" },
  { value: "jewel-tones", label: "Jewel Tones", desc: "Burgundy, teal, plum" },
];

export const GOALS = [
  { value: "look-polished", label: "Look more polished daily" },
  { value: "experiment", label: "Experiment with new styles" },
  { value: "capsule", label: "Build a capsule wardrobe" },
  { value: "sustainable", label: "Shop more sustainably" },
  { value: "occasion-ready", label: "Always be occasion-ready" },
  { value: "express", label: "Express my personality" },
];

interface OnboardingProps {
  editMode?: boolean;
  onComplete?: () => void;
}

export default function Onboarding({ editMode = false, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [style, setStyle] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [fashionGoals, setFashionGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user, updateProfile, profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMode && profile) {
      setAvatarUrl(profile.avatar_url || "");
      setBio(profile.bio || "");
      setSkinTone(profile.skin_tone || "");
      setStyle(profile.style_preference || "");
      setBodyType(profile.body_type || "");
      setPreferredColors(profile.preferred_colors || []);
      setFashionGoals(profile.fashion_goals || "");
    }
  }, [editMode, profile]);

  // Set pending username after signup
  useEffect(() => {
    if (user && !editMode) {
      const pendingUsername = localStorage.getItem("pending_username");
      if (pendingUsername) {
        supabase.from("profiles").update({ username: pendingUsername } as any).eq("id", user.id).then(() => {
          localStorage.removeItem("pending_username");
        });
      }
    }
  }, [user, editMode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from("clothing-images").upload(path, file, { upsert: true, contentType: file.type });
      const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const toggleColor = (c: string) =>
    setPreferredColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const steps = [
    {
      title: "Set up your profile",
      subtitle: "Add a profile picture and bio",
      content: (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-accent transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Tap to add a profile picture"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your fashion sense..."
              className="rounded-xl bg-card text-sm min-h-[80px]"
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{bio.length}/300</p>
          </div>
        </div>
      ),
      valid: true, // optional step
    },
    {
      title: "What's your skin tone?",
      subtitle: "This helps the AI suggest flattering colors",
      content: (
        <div className="grid grid-cols-4 gap-3">
          {SKIN_TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSkinTone(t.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                skinTone === t.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              )}
            >
              <div className={cn("w-10 h-10 rounded-full", t.color)} />
              <span className="text-[10px] font-medium text-foreground">{t.label}</span>
            </button>
          ))}
        </div>
      ),
      valid: !!skinTone,
    },
    {
      title: "What's your style?",
      subtitle: "Pick what resonates most with you",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                style === s.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              )}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-sm font-medium text-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      ),
      valid: !!style,
    },
    {
      title: "Your body type?",
      subtitle: "For better fit recommendations",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {BODY_TYPES.map((b) => (
            <button
              key={b.value}
              onClick={() => setBodyType(b.value)}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all text-sm font-medium text-foreground",
                bodyType === b.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      ),
      valid: !!bodyType,
    },
    {
      title: "Favorite color palettes?",
      subtitle: "Select all that appeal to you",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleColor(c.value)}
              className={cn(
                "p-3 rounded-2xl border-2 transition-all text-left",
                preferredColors.includes(c.value)
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              )}
            >
              <p className="text-sm font-medium text-foreground">{c.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
            </button>
          ))}
        </div>
      ),
      valid: preferredColors.length > 0,
    },
    {
      title: "Fashion goal?",
      subtitle: "What do you want to achieve?",
      content: (
        <div className="space-y-2.5">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => setFashionGoals(g.value)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 transition-all text-left text-sm font-medium text-foreground",
                fashionGoals === g.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      ),
      valid: !!fashionGoals,
    },
  ];

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        skin_tone: skinTone,
        style_preference: style,
        body_type: bodyType,
        preferred_colors: preferredColors,
        fashion_goals: fashionGoals,
        onboarding_completed: true,
        display_name: profile?.display_name || null,
        avatar_url: avatarUrl || null,
        bio: bio || null,
      } as any);
      toast({ title: editMode ? "Profile updated! ✨" : "Welcome to Vestis! ✨", description: editMode ? "Your style preferences have been saved." : "Your profile is set up." });
      onComplete?.();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
    setSaving(false);
  };

  const current = steps[step];

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 bg-background">
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full flex-1 transition-all",
              i <= step ? "bg-accent" : "bg-border"
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{current.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
        </div>

        <div className="flex-1">{current.content}</div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 rounded-2xl flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {editMode && step === 0 && onComplete && (
            <Button variant="outline" onClick={onComplete} className="h-12 rounded-2xl flex-1">
              Cancel
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!current.valid}
              className="h-12 rounded-2xl flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {step === 0 ? "Next" : "Next"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!current.valid || saving}
              className="h-12 rounded-2xl flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? "Saving..." : <>{editMode ? "Save Changes" : "Get Started"} <Check className="w-4 h-4 ml-2" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
