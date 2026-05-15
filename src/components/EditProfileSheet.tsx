import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileSheet({ open, onOpenChange }: Props) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [currencyPref, setCurrencyPref] = useState(profile?.currency_preference || "NZD");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const usernameLockedUntil = profile?.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;
  const isUsernameLocked = usernameLockedUntil ? new Date() < usernameLockedUntil : false;
  const daysRemaining = usernameLockedUntil
    ? Math.max(0, differenceInDays(usernameLockedUntil, new Date()))
    : 0;

  const handleSave = async () => {
    if (!user) return;
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
      setCurrencyPref(profile.currency_preference || "NZD");
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
