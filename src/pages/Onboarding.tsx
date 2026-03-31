import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Lock, Check as CheckIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, ArrowLeft, Check, Camera, Upload } from "lucide-react";
import { BodySilhouette } from "@/components/BodySilhouette";
import { cn } from "@/lib/utils";

// Skin tone is now stored as a 0-100 slider value string
const skinToneGradient = [
  "#FFEEDE", "#FFF0E0", "#FDEBD0", "#F5CBA7", "#E8C9A0",
  "#D4A76A", "#DC7633", "#BA9B68", "#C68642", "#A0522D",
  "#8D6E63", "#6F4E37", "#4E342E", "#3B2F2F", "#2C1E1E"
];

function getSkinToneColor(value: number): string {
  const idx = (value / 100) * (skinToneGradient.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(Math.ceil(idx), skinToneGradient.length - 1);
  if (lower === upper) return skinToneGradient[lower];
  const t = idx - lower;
  const hex = (c: string) => parseInt(c, 16);
  const l = skinToneGradient[lower];
  const u = skinToneGradient[upper];
  const r = Math.round(hex(l.slice(1, 3)) * (1 - t) + hex(u.slice(1, 3)) * t);
  const g = Math.round(hex(l.slice(3, 5)) * (1 - t) + hex(u.slice(3, 5)) * t);
  const b = Math.round(hex(l.slice(5, 7)) * (1 - t) + hex(u.slice(5, 7)) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export const STYLES = [
  { value: "casual", label: "Casual", emoji: "👕" },
  { value: "classic", label: "Classic", emoji: "🎩" },
  { value: "streetwear", label: "Streetwear", emoji: "🧢" },
  { value: "minimalist", label: "Minimalist", emoji: "⬜" },
  { value: "business-casual", label: "Business Casual", emoji: "👔" },
  { value: "elegant", label: "Elegant", emoji: "✨" },
  { value: "sporty", label: "Sporty", emoji: "🏃" },
  { value: "vintage", label: "Vintage", emoji: "📻" },
  { value: "preppy", label: "Preppy", emoji: "🏫" },
  { value: "old-money", label: "Old Money", emoji: "💎" },
  { value: "grunge", label: "Grunge", emoji: "🎸" },
  { value: "techwear", label: "Techwear", emoji: "⚡" },
];

export const BODY_TYPES = [
  { value: "slim", label: "Slim", desc: "Narrow shoulders & hips, lean frame", silhouette: "▏" },
  { value: "athletic", label: "Athletic", desc: "Broad shoulders, defined muscles", silhouette: "▽" },
  { value: "average", label: "Average", desc: "Proportional build", silhouette: "▯" },
  { value: "curvy", label: "Curvy", desc: "Defined waist, fuller hips & bust", silhouette: "⌛" },
  { value: "plus-size", label: "Plus Size", desc: "Fuller, rounder build", silhouette: "◯" },
  { value: "tall", label: "Tall", desc: "Above average height, long limbs", silhouette: "⏐" },
  { value: "petite", label: "Petite", desc: "Smaller frame, shorter stature", silhouette: "·" },
  { value: "inverted-triangle", label: "Inverted Triangle", desc: "Broad shoulders, narrow hips", silhouette: "▽" },
  { value: "pear", label: "Pear", desc: "Narrow shoulders, wider hips", silhouette: "△" },
  { value: "rectangle", label: "Rectangle", desc: "Similar shoulder, waist & hip width", silhouette: "▭" },
];

export const COLOR_OPTIONS = [
  { value: "neutrals", label: "Neutrals", desc: "Black, white, beige, gray" },
  { value: "earth-tones", label: "Earth Tones", desc: "Brown, olive, tan, rust" },
  { value: "pastels", label: "Pastels", desc: "Soft pink, lavender, mint" },
  { value: "bold", label: "Bold Colors", desc: "Red, cobalt, emerald" },
  { value: "monochrome", label: "Monochrome", desc: "All black or all white" },
  { value: "jewel-tones", label: "Jewel Tones", desc: "Burgundy, teal, plum" },
];

interface OnboardingProps {
  editMode?: boolean;
  onComplete?: () => void;
}

export default function Onboarding({ editMode = false, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileError, setProfileError] = useState("");
  const [skinTone, setSkinTone] = useState(50);
  const [styles, setStyles] = useState<string[]>([]);
  const [customStyle, setCustomStyle] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [bodyGender, setBodyGender] = useState<"female" | "male">("female");
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user, updateProfile, profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMode && profile) {
      setAvatarUrl(profile.avatar_url || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setSkinTone(profile.skin_tone ? parseInt(profile.skin_tone) || 50 : 50);
      // Parse comma-separated styles
      const existingStyles = profile.style_preference ? profile.style_preference.split(",").map(s => s.trim()).filter(Boolean) : [];
      const knownValues = STYLES.map(s => s.value);
      setStyles(existingStyles.filter(s => knownValues.includes(s)));
      const customs = existingStyles.filter(s => !knownValues.includes(s));
      setCustomStyle(customs.join(", "));
      setBodyType(profile.body_type || "");
      setPreferredColors(profile.preferred_colors || []);
    }
  }, [editMode, profile]);

  useEffect(() => {
    if (user && !editMode) {
      const pendingUsername = localStorage.getItem("pending_username");
      if (pendingUsername) {
        supabase.from("profiles").update({ username: pendingUsername, username_changed_at: new Date().toISOString() } as any).eq("id", user.id).then(() => {
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

  const toggleStyle = (s: string) =>
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const allStyles = [
    ...styles,
    ...customStyle.split(",").map(s => s.trim()).filter(Boolean),
  ];

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
            <p className="text-xs font-medium text-muted-foreground mb-1">Username</p>
            <Input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setProfileError(""); }}
              placeholder="Choose a username"
              className="rounded-xl bg-card text-sm"
              maxLength={30}
            />
          </div>
          {profileError && (
            <p className="text-xs text-destructive font-medium">{profileError}</p>
          )}
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
      valid: !!avatarUrl && !!username.trim(),
    },
    {
      title: "What's your skin tone?",
      subtitle: "Drag the slider to match your skin tone",
      content: (
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-32 h-32 rounded-full border-4 border-border shadow-lg transition-colors duration-150"
            style={{ backgroundColor: getSkinToneColor(skinTone) }}
          />
          <div className="w-full space-y-3">
            <input
              type="range"
              min={0}
              max={100}
              value={skinTone}
              onChange={(e) => setSkinTone(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${skinToneGradient.join(", ")})`,
              }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Light</span>
              <span>Medium</span>
              <span>Dark</span>
            </div>
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: "What's your aesthetic?",
      subtitle: "Select all that apply, or type your own",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => toggleStyle(s.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                  styles.includes(s.value)
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent/40"
                )}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                {styles.includes(s.value) && <Check className="w-4 h-4 text-accent ml-auto" />}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Or describe your own style</p>
            <Input
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder="e.g. Dark academia, Y2K, Cottagecore"
              className="rounded-xl bg-card text-sm"
            />
          </div>
        </div>
      ),
      valid: true,
    },
  ];

  const handleNext = () => {
    if (step === 0) {
      if (!avatarUrl) { setProfileError("Please add a profile picture"); return; }
      if (!username.trim()) { setProfileError("Please choose a username"); return; }
      setProfileError("");
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const styleValue = allStyles.join(", ");
      await updateProfile({
        skin_tone: String(skinTone),
        style_preference: styleValue || null,
        body_type: bodyType,
        preferred_colors: preferredColors,
        fashion_goals: null,
        onboarding_completed: true,
        display_name: profile?.display_name || null,
        avatar_url: avatarUrl || null,
        bio: bio || null,
        username: username.trim() || null,
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
    <div className="min-h-screen flex flex-col px-6 py-12 pb-28 bg-background">
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

        <div className="flex-1 overflow-y-auto">{current.content}</div>

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
              onClick={handleNext}
              disabled={!current.valid}
              className="h-12 rounded-2xl flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
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
