import { useState, useEffect } from "react";
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
  const [forgotStep, setForgotStep] = useState<"idle" | "email" | "code" | "newpass">("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotOtpError, setForgotOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showNewPasswordScreen, setShowNewPasswordScreen] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (sessionStorage.getItem("vestis_recovery_mode") === "true") {
      setShowNewPasswordScreen(true);
    }
  }, []);

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { captchaToken: undefined });
    setForgotLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code sent ✉️", description: "Check your email for an 8-digit reset code." });
      setForgotStep("code");
    }
  };

  const handleVerifyResetOtp = async () => {
    if (forgotOtp.length !== 8) return;
    setForgotLoading(true);
    setForgotOtpError("");
    const { data, error } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token: forgotOtp,
      type: "recovery",
    });
    setForgotLoading(false);
    if (error) {
      setForgotOtpError("Invalid or expired code. Please try again.");
    } else {
      const accessToken = data.session?.access_token ?? "";
      const refreshToken = data.session?.refresh_token ?? "";
      sessionStorage.setItem("vestis_recovery_mode", "true");
      sessionStorage.setItem("vestis_recovery_token", accessToken);
      sessionStorage.setItem("vestis_recovery_refresh", refreshToken);
      // Sign out immediately so Auth.tsx stays mounted
      await supabase.auth.signOut();
      setShowNewPasswordScreen(true);
    }
  };

  const handleResetNewPassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid(newPassword)) {
      toast({ title: "Weak password", description: "Must be 8+ characters with letters, numbers, and a special character.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    // Restore the session using stored tokens, then update password
    const recoveryToken = sessionStorage.getItem("vestis_recovery_token") ?? "";
    const refreshToken = sessionStorage.getItem("vestis_recovery_refresh") ?? "";
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: recoveryToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      setResetLoading(false);
      toast({ title: "Error", description: "Recovery session expired. Please start over.", variant: "destructive" });
      sessionStorage.removeItem("vestis_recovery_mode");
      sessionStorage.removeItem("vestis_recovery_token");
      sessionStorage.removeItem("vestis_recovery_refresh");
      setShowNewPasswordScreen(false);
      setForgotStep("email");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setResetLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      sessionStorage.removeItem("vestis_recovery_mode");
      sessionStorage.removeItem("vestis_recovery_token");
      toast({ title: "Password updated ✓", description: "You can now sign in with your new password." });
      await supabase.auth.signOut();
      setShowNewPasswordScreen(false);
      setForgotStep("idle");
      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

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
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", value)
      .limit(1);
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

      // Detect if input is a username (no @ sign) and look up the email
      const isEmail = signInEmail.includes("@");
      if (!isEmail && signInEmail.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email")
          .ilike("username", signInEmail)
          .limit(1)
          .single();

        if (!profileData?.email) {
          toast({ title: "User not found", description: "No account found with that email or username.", variant: "destructive" });
          setLoading(false);
          return;
        }
        signInEmail = profileData.email;
      }

      // Handle remember me - if unchecked, we'll clear session on tab close
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
    const { error } = await supabase.auth.verifyOtp({
      email: signUpEmail,
      token: otpCode,
      type: "signup",
    });
    setVerifyingOtp(false);
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email verified! ✨", description: "Welcome to Vestis!" });
    }
  };

  if (showNewPasswordScreen) {
    const passwordsMatch = newPassword === confirmNewPassword;
    const showMismatch = confirmNewPassword.length > 0 && !passwordsMatch;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
            <p className="text-sm text-muted-foreground">Enter your new password below</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl bg-card pr-10"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 rounded-xl bg-card"
            />
            {showMismatch && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          </div>
          <Button
            onClick={handleResetNewPassword}
            disabled={resetLoading || !passwordValid(newPassword) || !passwordsMatch}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</> : "Confirm"}
          </Button>
        </div>
      </div>
    );
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Enter verification code</h2>
          <p className="text-sm text-muted-foreground">We sent an 8-digit code to <span className="font-medium text-foreground">{signUpEmail}</span></p>
          <div>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="00000000"
              className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-card h-14"
              autoFocus
            />
          </div>
          <Button
            onClick={handleVerifyOtp}
            disabled={otpCode.length !== 8 || verifyingOtp}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {verifyingOtp ? "Verifying..." : "Verify Email"}
          </Button>
          <div className="rounded-2xl bg-card border border-border/40 p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">• Check your <span className="font-medium text-foreground">spam/junk</span> folder if you don't see it</p>
            <p className="text-xs text-muted-foreground">• The code expires in 24 hours</p>
          </div>
          <Button
            onClick={handleResendVerification}
            disabled={resendLoading}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm"
          >
            {resendLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Resend Code
          </Button>
          <button onClick={() => { setSignUpSuccess(false); setIsSignUp(false); setOtpCode(""); }} className="text-xs text-accent font-semibold hover:underline">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (forgotStep === "email") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you an 8-digit code</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 rounded-xl bg-card"
            />
          </div>
          <Button
            onClick={handleForgotPassword}
            disabled={forgotLoading || !forgotEmail.trim()}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {forgotLoading ? "Sending..." : "Send Code"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Remember your password?{" "}
            <button onClick={() => setForgotStep("idle")} className="text-accent font-semibold hover:underline">
              Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (forgotStep === "code") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Enter reset code</h2>
          <p className="text-sm text-muted-foreground">We sent an 8-digit code to <span className="font-medium text-foreground">{forgotEmail}</span></p>
          <div>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={forgotOtp}
              onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 8)); setForgotOtpError(""); }}
              placeholder="00000000"
              className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-card h-14"
              autoFocus
            />
            {forgotOtpError && <p className="text-xs text-destructive mt-2">{forgotOtpError}</p>}
          </div>
          <Button
            onClick={handleVerifyResetOtp}
            disabled={forgotOtp.length !== 8 || forgotLoading}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</> : "Verify Code"}
          </Button>
          <div className="rounded-2xl bg-card border border-border/40 p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">• Check your <span className="font-medium text-foreground">spam/junk</span> folder</p>
            <p className="text-xs text-muted-foreground">• The code expires in 1 hour</p>
          </div>
          <button onClick={() => { setForgotStep("email"); setForgotOtp(""); setForgotOtpError(""); }} className="text-xs text-accent font-semibold hover:underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (forgotStep === "newpass") {
    const passwordsMatch = newPassword === confirmNewPassword;
    const showMismatch = confirmNewPassword.length > 0 && !passwordsMatch;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
            <p className="text-sm text-muted-foreground">Enter your new password below</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl bg-card pr-10"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 rounded-xl bg-card"
            />
            {showMismatch && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          </div>
          <Button
            onClick={handleResetNewPassword}
            disabled={resetLoading || !passwordValid(newPassword) || !passwordsMatch}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
          >
            {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</> : "Confirm"}
          </Button>
        </div>
      </div>
    );
  }

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
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 rounded-xl bg-card"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Username</Label>
                <div className="relative">
                  <Input
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="e.g. fashionista23"
                    className="mt-1 rounded-xl bg-card pr-10"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-accent" />}
                    {!checkingUsername && usernameAvailable === false && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {usernameAvailable === false && (
                  <p className="text-[10px] text-destructive mt-1">Username is already taken</p>
                )}
              </div>
            </>
          )}

          {isSignUp ? (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 rounded-xl bg-card"
                required
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email or Username</Label>
              <Input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="you@example.com or username"
                className="mt-1 rounded-xl bg-card"
                required
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Password</Label>
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && password.length > 0 && (
              <div className="space-y-1 mt-1">
                <p className={`text-[10px] ${password.length >= 8 ? "text-accent" : "text-muted-foreground"}`}>
                  {password.length >= 8 ? "✓" : "○"} At least 8 characters
                </p>
                <p className={`text-[10px] ${/[a-zA-Z]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>
                  {/[a-zA-Z]/.test(password) ? "✓" : "○"} Contains a letter
                </p>
                <p className={`text-[10px] ${/[0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>
                  {/[0-9]/.test(password) ? "✓" : "○"} Contains a number
                </p>
                <p className={`text-[10px] ${/[^a-zA-Z0-9]/.test(password) ? "text-accent" : "text-muted-foreground"}`}>
                  {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Contains a special character
                </p>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          {isSignUp && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Appearance</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    theme === "light" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    theme === "dark" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Dark
                </button>
              </div>
            </div>
          )}

          {/* Remember me & forgot password - only on sign in */}
          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                  Remember me
                </label>
              </div>
              <button type="button" onClick={() => setForgotStep("email")} className="text-xs text-accent font-medium hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (isSignUp && (!displayName.trim() || username.length < 3 || usernameAvailable === false))}
            className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent font-semibold hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
