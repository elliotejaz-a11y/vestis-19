import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Camera, Loader2, Move, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { ImageCropEditor } from "@/components/ImageCropEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Parse stored position string "X% Y%" back to numbers, default 50/50 */
function parsePosition(pos: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const match = pos.match(/([\d.]+)%\s+([\d.]+)%/);
  if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  const map: Record<string, { x: number; y: number }> = {
    "top left": { x: 0, y: 0 }, "top center": { x: 50, y: 0 }, "top right": { x: 100, y: 0 },
    "center left": { x: 0, y: 50 }, center: { x: 50, y: 50 }, "center right": { x: 100, y: 50 },
    "bottom left": { x: 0, y: 100 }, "bottom center": { x: 50, y: 100 }, "bottom right": { x: 100, y: 100 },
  };
  return map[pos] || { x: 50, y: 50 };
}

export function EditProfileSheet({ open, onOpenChange }: Props) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarPosition, setAvatarPosition] = useState(profile?.avatar_position || "50% 50%");
  const [currencyPref, setCurrencyPref] = useState(profile?.currency_preference || "NZD");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Drag state for existing avatar repositioning
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 50, y: 50 });

  const posObj = parsePosition(avatarPosition);

  const usernameLockedUntil = profile?.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;
  const isUsernameLocked = usernameLockedUntil ? new Date() < usernameLockedUntil : false;
  const daysRemaining = usernameLockedUntil
    ? Math.max(0, differenceInDays(usernameLockedUntil, new Date()))
    : 0;

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startOffset.current = parsePosition(avatarPosition);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [avatarPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !dragContainerRef.current) return;
    const rect = dragContainerRef.current.getBoundingClientRect();
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newX = clamp(startOffset.current.x - (dx / rect.width) * 100);
    const newY = clamp(startOffset.current.y - (dy / rect.height) * 100);
    setAvatarPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropPreview(url);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setCropPreview(null);
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("social-media").upload(path, blob, {
      contentType: "image/jpeg",
    });
    if (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setAvatarPosition("50% 50%");
    }
    setUploading(false);
  };

  const handleCropCancel = () => {
    if (cropPreview) URL.revokeObjectURL(cropPreview);
    setCropPreview(null);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!avatarUrl) {
      toast({
        title: "Profile picture required",
        description: "Please add a profile picture to continue.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const usernameChanged = username !== (profile?.username || "");

    if (usernameChanged && username.length >= 3) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .neq("id", user.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const updateData: any = {
      display_name: displayName || null,
      username: username || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      avatar_position: avatarPosition,
      currency_preference: currencyPref,
    };

    if (usernameChanged) {
      updateData.username_changed_at = new Date().toISOString();
    }

    await updateProfile(updateData);
    await refreshProfile();
    toast({ title: "Profile updated ✨" });
    setSaving(false);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setAvatarPosition(profile.avatar_position || "50% 50%");
      setCurrencyPref(profile.currency_preference || "NZD");
      setCropPreview(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background pb-24">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Edit Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Avatar crop editor */}
          {cropPreview ? (
            <ImageCropEditor
              imageUrl={cropPreview}
              aspectRatio={1}
              onConfirm={handleCropConfirm}
              onCancel={handleCropCancel}
            />
          ) : (
            <>
              {/* Avatar with drag-to-reposition */}
              <div className="flex flex-col items-center gap-2">
                <div
                  ref={dragContainerRef}
                  className="relative w-28 h-28 rounded-full bg-card border-2 border-border overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
                  onPointerDown={avatarUrl ? handlePointerDown : undefined}
                  onPointerMove={avatarUrl ? handlePointerMove : undefined}
                  onPointerUp={avatarUrl ? handlePointerUp : undefined}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: avatarPosition }}
                      draggable={false}
                    />
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <User className="w-10 h-10 text-muted-foreground" />
                    </button>
                  )}
                  {avatarUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Move className="w-5 h-5 text-background/70 drop-shadow-md" />
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                {avatarUrl ? (
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground">Drag to reposition photo</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="text-[10px] text-accent font-medium hover:underline"
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Change photo"}
                      </button>
                      <button
                        onClick={() => setAvatarPosition("50% 50%")}
                        className="text-[10px] text-muted-foreground hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-[10px] text-destructive font-medium"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Tap to add photo (required)"}
                  </button>
                )}
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-xl bg-card text-sm"
                  maxLength={50}
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Username
                  {isUsernameLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Lock className="w-3 h-3" /> Locked for {daysRemaining} more {daysRemaining === 1 ? "day" : "days"}
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 select-none">@</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    className="rounded-xl bg-card text-sm pl-7"
                    maxLength={30}
                    disabled={isUsernameLocked}
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  className="rounded-xl bg-card text-sm min-h-[80px]"
                  maxLength={160}
                />
                <p className="text-[10px] text-muted-foreground text-right">{bio.length}/160</p>
              </div>

              {/* Currency Preference */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select value={currencyPref} onValueChange={setCurrencyPref}>
                  <SelectTrigger className="rounded-xl bg-card text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NZD">🇳🇿 NZD</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
