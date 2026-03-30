import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import vestisLogo from "@/assets/vestis-logo.png";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check hash for type=recovery
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid(password)) {
      toast({ title: "Weak password", description: "Must be 8+ characters with letters, numbers, and a special character.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✓", description: "You can now sign in with your new password." });
      navigate("/");
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img loading="lazy" src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl bg-card pr-10"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className={`text-[10px] ${password.length >= 8 ? "text-accent" : "text-muted-foreground"}`}>{password.length >= 8 ? "✓" : "○"} At least 8 characters</p>
                <p className={`text-[10px] ${/[a-zA-Z]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[a-zA-Z]/.test(password) ? "✓" : "○"} Contains a letter</p>
                <p className={`text-[10px] ${/[0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[0-9]/.test(password) ? "✓" : "○"} Contains a number</p>
                <p className={`text-[10px] ${/[^a-zA-Z0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Contains a special character</p>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 rounded-xl bg-card"
              required
            />
          </div>
          <Button type="submit" disabled={loading || !passwordValid(password)} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
