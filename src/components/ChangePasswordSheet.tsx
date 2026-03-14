import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordSheet({ open, onOpenChange }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      toast({ title: "Enter current password", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid(newPassword)) {
      toast({ title: "Weak password", description: "Must be 8+ characters with letters, numbers, and a special character.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Verify current password by re-signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({ title: "Error", description: "Could not verify user", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      toast({ title: "Incorrect current password", description: "Please try again.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed ✓" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-base font-bold">Change Password</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl bg-card pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl bg-card pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className={`text-[10px] ${newPassword.length >= 8 ? "text-accent" : "text-muted-foreground"}`}>{newPassword.length >= 8 ? "✓" : "○"} At least 8 characters</p>
                <p className={`text-[10px] ${/[a-zA-Z]/.test(newPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[a-zA-Z]/.test(newPassword) ? "✓" : "○"} Contains a letter</p>
                <p className={`text-[10px] ${/[0-9]/.test(newPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[0-9]/.test(newPassword) ? "✓" : "○"} Contains a number</p>
                <p className={`text-[10px] ${/[^a-zA-Z0-9]/.test(newPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[^a-zA-Z0-9]/.test(newPassword) ? "✓" : "○"} Contains a special character</p>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 rounded-xl bg-card"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || !currentPassword || !passwordValid(newPassword)}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Changing...</> : "Change Password"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
