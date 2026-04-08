import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Check, X, Loader2, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import vestisLogo from "@/assets/vestis-logo.png";
import { useTheme } from "next-themes";

export default function Auth() {
  const isRecoveryMode = sessionStorage.getItem("vestis_recovery_mode") === "true";
  const [isSignUp, setIsSignUp] = useState(false);
  const { theme, setTheme } = useTheme();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  // Password reset state - completely rewritten
  const [resetStep, setResetStep] = useState<"idle" | "email" | "code" | "newpass">("idle");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetVerifying, setResetVerifying] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetUpdating, setResetUpdating] = useState(false);
  const [resetResending, setResetResending] = useState(false);

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  // ===== PASSWORD RESET HANDLERS (rewritten from scratch) =====
  const handleResetSendCode = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: undefined } as any);
    setResetLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code sent ✉️", description: "Check your inbox (and spam folder) for a 6-digit code." });
      setResetStep("code");
    }
  };

  const handleResetResendCode = async () => {
    setResetResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: undefined } as any);
    setResetResending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code resent ✉️", description: "Check your inbox and spam folder." });
    }
  };

  const handleResetVerifyCode = async () => {
    if (resetCode.length !== 6) return;
    setResetVerifying(true);
    sessionStorage.setItem("vestis_recovery_mode", "true");
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: resetCode,
      type: "recovery",
    });
    setResetVerifying(false);
    if (error) {
      sessionStorage.removeItem("vestis_recovery_mode");
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
    } else {
      setResetStep("newpass");
    }
  };

  const handleResetSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword !== resetConfirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid(resetNewPassword)) {
      toast({ title: "Weak password", description: "Must be 8+ characters with letters, numbers, and a special character.", variant: "destructive" });
      return;
    }
    setResetUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: resetNewPassword });
    if (error) {
      setResetUpdating(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✓", description: "Please sign in with your new password." });
      await supabase.auth.signOut();
      sessionStorage.removeItem("vestis_recovery_mode");
      setResetUpdating(false);
      setResetStep("idle");
      setResetEmail("");
      setResetCode("");
      setResetNewPassword("");
      setResetConfirmPassword("");
    }
  };

  const resetBackToLogin = () => {
    sessionStorage.removeItem("vestis_recovery_mode");
    setResetStep("idle");
    setResetEmail("");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
  };
  // ===== END PASSWORD RESET =====

  const handleResendVerification = async () => {
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: signUpEmail });
    setResendLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email resent ✉️", description: "Check your inbox and spam folder." });
    }
  };

  const checkUsername = async (value: string) => {
    if (value.length < 3) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const { data } = await supabase.from("profiles").select("id").ilike("username", value).limit(1);
    setUsernameAvailable(!data || data.length === 0);
    setCheckingUsername(false);
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(cleaned);
    setUsernameAvailable(null);
    if (cleaned.length >= 3) {
      const timeout = setTimeout(() => checkUsername(cleaned), 400);
      return () => clearTimeout(timeout);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (usernameAvailable === false) {
        toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!passwordValid(password)) {
        toast({ title: "Weak password", description: "Password must be 8+ characters with letters, numbers, and a special character.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
          toast({ title: "Email already in use", description: "An account with this email already exists. Please sign in instead.", variant: "destructive" });
        } else {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        }
      } else {
        localStorage.setItem("pending_username", username);
        localStorage.setItem("vestis_fresh_signup", "true");
        setSignUpEmail(email);
        setSignUpSuccess(true);
      }
    } else {
      let signInEmail = emailOrUsername.trim();
      const isEmail = signInEmail.includes("@");
      if (!isEmail && signInEmail.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles").select("email").ilike("username", signInEmail).limit(1).single();
        if (!profileData?.email) {
          toast({ title: "User not found", description: "No account found with that email or username.", variant: "destructive" });
          setLoading(false);
          return;
        }
        signInEmail = profileData.email;
      }
      if (!rememberMe) {
        localStorage.setItem("vestis_no_remember", "true");
      } else {
        localStorage.removeItem("vestis_no_remember");
      }
      const { error } = await signIn(signInEmail, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 8) return;
    setVerifyingOtp(true);
    const { error } = await supabase.auth.verifyOtp({ email: signUpEmail, token: otpCode, type: "signup" });
    setVerifyingOtp(false);
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email verified! ✨", description: "Welcome to Vestis!" });
    }
  };

  // ===== SIGNUP VERIFICATION SCREEN =====
  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Enter verification code</h2>
          <p className="text-sm text-muted-foreground">We sent an 8-digit code to <span className="font-medium text-foreground">{signUpEmail}</span></p>
          <div>
            <Input type="text" inputMode="numeric" maxLength={8} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-card h-14" autoFocus />
          </div>
          <Button onClick={handleVerifyOtp} disabled={otpCode.length !== 8 || verifyingOtp} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
            {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {verifyingOtp ? "Verifying..." : "Verify Email"}
          </Button>
          <div className="rounded-2xl bg-card border border-border/40 p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">• Check your <span className="font-medium text-foreground">spam/junk</span> folder if you don't see it</p>
            <p className="text-xs text-muted-foreground">• The code expires in 24 hours</p>
          </div>
          <Button onClick={handleResendVerification} disabled={resendLoading} variant="outline" className="w-full h-12 rounded-2xl text-sm">
            {resendLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Resend Code
          </Button>
          <button onClick={() => { setSignUpSuccess(false); setIsSignUp(false); setOtpCode(""); }} className="text-xs text-accent font-semibold hover:underline">Back to Sign In</button>
        </div>
      </div>
    );
  }

  // ===== PASSWORD RESET SCREENS (rewritten from scratch) =====
  if (resetStep === "newpass") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
            <p className="text-sm text-muted-foreground">Enter your new password below</p>
          </div>
          <form onSubmit={handleResetSetPassword} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
              <div className="relative">
                <Input type={resetShowPassword ? "text" : "password"} value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="••••••••" className="mt-1 rounded-xl bg-card pr-10" required minLength={8} />
                <button type="button" onClick={() => setResetShowPassword(!resetShowPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {resetNewPassword.length > 0 && (
                <div className="space-y-1 mt-1">
                  <p className={`text-[10px] ${resetNewPassword.length >= 8 ? "text-accent" : "text-muted-foreground"}`}>{resetNewPassword.length >= 8 ? "✓" : "○"} At least 8 characters</p>
                  <p className={`text-[10px] ${/[a-zA-Z]/.test(resetNewPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[a-zA-Z]/.test(resetNewPassword) ? "✓" : "○"} Contains a letter</p>
                  <p className={`text-[10px] ${/[0-9]/.test(resetNewPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[0-9]/.test(resetNewPassword) ? "✓" : "○"} Contains a number</p>
                  <p className={`text-[10px] ${/[^a-zA-Z0-9]/.test(resetNewPassword) ? "text-accent" : "text-muted-foreground"}`}>{/[^a-zA-Z0-9]/.test(resetNewPassword) ? "✓" : "○"} Contains a special character</p>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Confirm New Password</Label>
              <Input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-1 rounded-xl bg-card" required />
              {resetConfirmPassword.length > 0 && resetNewPassword !== resetConfirmPassword && (
                <p className="text-[10px] text-destructive mt-1">Passwords don't match</p>
              )}
            </div>
            <Button type="submit" disabled={resetUpdating || !passwordValid(resetNewPassword) || resetNewPassword !== resetConfirmPassword} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
              {resetUpdating ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (resetStep === "code") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Enter reset code</h2>
          <p className="text-sm text-muted-foreground">We sent a 6-digit code to <span className="font-medium text-foreground">{resetEmail}</span></p>
          <div>
            <Input type="text" inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-card h-14" autoFocus />
          </div>
          <Button onClick={handleResetVerifyCode} disabled={resetCode.length !== 6 || resetVerifying} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
            {resetVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {resetVerifying ? "Verifying..." : "Verify Code"}
          </Button>
          <div className="rounded-2xl bg-card border border-border/40 p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">• Check your <span className="font-medium text-foreground">spam/junk</span> folder if you don't see it</p>
            <p className="text-xs text-muted-foreground">• The code expires in 1 hour</p>
          </div>
          <Button onClick={handleResetResendCode} disabled={resetResending} variant="outline" className="w-full h-12 rounded-2xl text-sm">
            {resetResending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Resend Code
          </Button>
          <button onClick={resetBackToLogin} className="text-xs text-accent font-semibold hover:underline">Back to Sign In</button>
        </div>
      </div>
    );
  }

  if (resetStep === "email") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset code</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" className="mt-1 rounded-xl bg-card" required />
          </div>
          <Button onClick={handleResetSendCode} disabled={resetLoading || !resetEmail.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
            {resetLoading ? "Sending..." : "Send Reset Code"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Remember your password?{" "}
            <button onClick={resetBackToLogin} className="text-accent font-semibold hover:underline">Sign In</button>
          </p>
        </div>
      </div>
    );
  }

  // ===== MAIN LOGIN / SIGNUP SCREEN =====
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={vestisLogo} alt="Vestis" className="h-12" />
          </div>
          <p className="text-sm text-muted-foreground">Your AI-powered wardrobe stylist</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1 rounded-xl bg-card" required />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Username</Label>
                <div className="relative">
                  <Input value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="e.g. fashionista23" className="mt-1 rounded-xl bg-card pr-10" required minLength={3} maxLength={30} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-accent" />}
                    {!checkingUsername && usernameAvailable === false && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {usernameAvailable === false && <p className="text-[10px] text-destructive mt-1">Username is already taken</p>}
              </div>
            </>
          )}

          {isSignUp ? (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 rounded-xl bg-card" required />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email or Username</Label>
              <Input value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} placeholder="you@example.com or username" className="mt-1 rounded-xl bg-card" required />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Password</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 rounded-xl bg-card pr-10" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && password.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className={`text-[10px] ${password.length >= 8 ? "text-accent" : "text-muted-foreground"}`}>{password.length >= 8 ? "✓" : "○"} At least 8 characters</p>
                <p className={`text-[10px] ${/[a-zA-Z]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[a-zA-Z]/.test(password) ? "✓" : "○"} Contains a letter</p>
                <p className={`text-[10px] ${/[0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[0-9]/.test(password) ? "✓" : "○"} Contains a number</p>
                <p className={`text-[10px] ${/[^a-zA-Z0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>{/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Contains a special character</p>
              </div>
            )}
          </div>

          {isSignUp && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Appearance</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setTheme("light")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${theme === "light" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"}`}>
                  <Sun className="w-3.5 h-3.5" /> Light
                </button>
                <button type="button" onClick={() => setTheme("dark")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${theme === "dark" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"}`}>
                  <Moon className="w-3.5 h-3.5" /> Dark
                </button>
              </div>
            </div>
          )}

          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember me</label>
              </div>
              <button type="button" onClick={() => setResetStep("email")} className="text-xs text-accent font-medium hover:underline">Forgot password?</button>
            </div>
          )}

          <Button type="submit" disabled={loading || (isSignUp && (!displayName.trim() || username.length < 3 || usernameAvailable === false))} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90">
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-accent font-semibold hover:underline">
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
