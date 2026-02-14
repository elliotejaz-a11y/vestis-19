import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileSheet({ open, onOpenChange }: Props) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("social-media").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      display_name: displayName || null,
      username: username || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    } as any);
    await refreshProfile();
    toast({ title: "Profile updated ✨" });
    setSaving(false);
    onOpenChange(false);
  };

  // Sync state when sheet opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">Edit Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-card border border-border overflow-hidden group"
              disabled={uploading}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-foreground" /> : <Camera className="w-5 h-5 text-foreground" />}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-[10px] text-muted-foreground">Tap to change photo</p>
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
            <Label className="text-xs text-muted-foreground">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="username"
              className="rounded-xl bg-card text-sm"
              maxLength={30}
            />
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

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
