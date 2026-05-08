import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Check, X, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import vestisLogo from "@/assets/vestis-logo.png";
import { useNavigate } from "react-router-dom";
import { SignUpIntro } from "@/components/SignUpIntro";

export default function Auth() {
  // If in recovery mode (OTP verified, setting new password), keep showing Auth
  const isRecoveryMode = sessionStorage.getItem("vestis_recovery_mode") === "true";
  const [isSignUp, setIsSignUp] = useState(false);
  // Sign-up is now a multi-step "sell" flow: 0 = email, 1 = username + display name, 2 = password.
  const [signUpStep, setSignUpStep] = useState(0);
  // Show the intro/sales-pitch as the very first screen new visitors see.
  // Skip it automatically if we're in password-recovery mode.
  const [showSignUpIntro, setShowSignUpIntro] = useState(!isRecoveryMode);
  const navigate = useNavigate();
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"email" | "otp" | "password">("email");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [verifyingRecoveryOtp, setVerifyingRecoveryOtp] = useState(false);
  const [recoveryOtpError, setRecoveryOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  // Keep status bar colour in sync with the auth gradient
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", "#FFFFFF");
    return () => { if (prev) meta?.setAttribute("content", prev); };
  }, []);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email for your 8-digit code" });
      setRecoveryStep("otp");
    }
  };

  const handleVerifyRecoveryOtp = async () => {
    if (recoveryOtp.length !== 8) return;
    setVerifyingRecoveryOtp(true);
    setRecoveryOtpError("");
    sessionStorage.setItem("vestis_recovery_mode", "true");
    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token: recoveryOtp,
      type: "recovery",
    });
    setVerifyingRecoveryOtp(false);
    if (error) {
      sessionStorage.removeItem("vestis_recovery_mode");
      setRecoveryOtpError("Invalid code please try again");
    } else {
      setRecoveryStep("password");
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setUpdatingPassword(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.auth.signOut();
      sessionStorage.removeItem("vestis_recovery_mode");
      toast({ title: "Password reset successfully" });
      setTimeout(() => {
        setUpdatingPassword(false);
        setShowForgotPassword(false);
        setRecoveryStep("email");
        setRecoveryOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setForgotEmail("");
        setRecoveryOtpError("");
        navigate("/");
      }, 2000);
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
      const trimmedEmail = email.trim().toLowerCase();
      const { error } = await signUp(trimmedEmail, password, displayName);
      if (error) {
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
          toast({ title: "Email already in use", description: "An account with this email already exists. Please sign in instead.", variant: "destructive" });
        } else {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        }
      } else {
        localStorage.setItem("pending_username", username);
        setSignUpEmail(trimmedEmail);
        setSignUpSuccess(true);
      }
    } else {
      let signInEmail = emailOrUsername.trim();

      const isEmail = signInEmail.includes("@");
      if (!isEmail && signInEmail.length > 0) {
        const { data: resolvedEmail, error: usernameLookupError } = await supabase.rpc("get_email_by_username", {
          lookup_username: signInEmail,
        });

        if (usernameLookupError || !resolvedEmail) {
          toast({ title: "User not found", description: "No account found with that email or username.", variant: "destructive" });
          setLoading(false);
          return;
        }

        signInEmail = resolvedEmail;
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
      token: otpCode.trim(),
      type: "signup",
    });
    setVerifyingOtp(false);
    if (error) {
      const isExpired = error.message?.toLowerCase().includes("expired") || error.message?.toLowerCase().includes("invalid");
      toast({
        title: "Code not accepted",
        description: isExpired
          ? "This code has expired or is incorrect. Use Resend Code to get a fresh one."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Email verified! ✨", description: "Welcome to Vestis!" });
    }
  };

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
            <p className="text-xs text-muted-foreground">• The code expires in <span className="font-medium text-foreground">1 hour</span> — verify promptly</p>
            <p className="text-xs text-muted-foreground">• Email may take a few minutes to arrive</p>
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

  if (showForgotPassword) {
    // Step 3: Set new password
    if (recoveryStep === "password") {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
              <p className="text-sm text-muted-foreground">Enter your new password below</p>
            </div>
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 rounded-xl bg-card pr-10"
                    required
                    minLength={8}
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
                <Label className="text-xs font-medium text-muted-foreground">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 rounded-xl bg-card"
                  required
                />
              </div>
              <Button type="submit" disabled={updatingPassword || newPassword.length < 8 || newPassword !== confirmNewPassword} className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm">
                {updatingPassword ? "Updating..." : "Reset Password"}
              </Button>
            </form>
          </div>
        </div>
      );
    }

    // Step 2: Enter OTP code
    if (recoveryStep === "otp") {
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
                value={recoveryOtp}
                onChange={(e) => { setRecoveryOtp(e.target.value.replace(/\D/g, "").slice(0, 8)); setRecoveryOtpError(""); }}
                placeholder="00000000"
                className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-card h-14"
                autoFocus
              />
            </div>
            {recoveryOtpError && (
              <p className="text-sm text-destructive font-medium">{recoveryOtpError}</p>
            )}
            <Button
              onClick={handleVerifyRecoveryOtp}
              disabled={recoveryOtp.length !== 8 || verifyingRecoveryOtp}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm"
            >
              {verifyingRecoveryOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {verifyingRecoveryOtp ? "Verifying..." : "Verify"}
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              variant="outline"
              className="w-full h-12 rounded-2xl text-sm"
            >
              {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Resend Code
            </Button>
            <button onClick={() => { setShowForgotPassword(false); setRecoveryStep("email"); setRecoveryOtp(""); setRecoveryOtpError(""); }} className="text-xs text-accent font-semibold hover:underline">
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    // Step 1: Enter email
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
            <Input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 rounded-xl bg-card"
              required
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
            <button onClick={() => setShowForgotPassword(false)} className="text-accent font-semibold hover:underline">
              Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Pre-signup sales pitch flow
  if (showSignUpIntro) {
    return (
      <SignUpIntro
        onComplete={() => {
          setShowSignUpIntro(false);
          setIsSignUp(true);
          setSignUpStep(0);
        }}
        onLogin={() => {
          setShowSignUpIntro(false);
          setIsSignUp(false);
        }}
      />
    );
  }

  // ============ SIGN-UP MULTI-STEP FLOW ============
  if (isSignUp) {
    const totalSteps = 3;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const namesValid = username.length >= 3 && usernameAvailable !== false;
    const canAdvance =
      (signUpStep === 0 && emailValid) ||
      (signUpStep === 1 && namesValid && !checkingUsername) ||
      (signUpStep === 2 && passwordValid(password));

    const goNext = () => {
      if (!canAdvance) return;
      if (signUpStep < totalSteps - 1) {
        setSignUpStep(signUpStep + 1);
      }
    };

    const goBack = () => {
      if (signUpStep === 0) {
        // Back to intro / sign-in chooser
        setIsSignUp(false);
        setShowSignUpIntro(true);
        setSignUpStep(0);
      } else {
        setSignUpStep(signUpStep - 1);
      }
    };

    return (
      <div className="min-h-screen flex flex-col px-6 py-10 bg-background">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-all ${i <= signUpStep ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img src={vestisLogo} alt="Vestis" className="h-8 ml-1" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (signUpStep < totalSteps - 1) {
              goNext();
            } else {
              handleSubmit(e);
            }
          }}
          className="flex-1 flex flex-col"
        >
          <div className="flex-1">
            {signUpStep === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">What's your email?</h1>
                  <p className="text-sm text-muted-foreground">We'll use this to create your account and send important updates.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 rounded-xl bg-card h-12 text-base"
                    autoFocus
                    required
                  />
                </div>
              </div>
            )}

            {signUpStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">Pick your username</h1>
                  <p className="text-sm text-muted-foreground">This is your unique @handle on Vestis. You can set your display name next.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 select-none">@</span>
                    <Input
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="fashionista23"
                      className="mt-1 rounded-xl bg-card pl-7 pr-10 h-12 text-base"
                      autoFocus
                      required
                      minLength={3}
                      maxLength={30}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!checkingUsername && username.length >= 3 && usernameAvailable === true && <Check className="w-4 h-4 text-accent" />}
                      {!checkingUsername && usernameAvailable === false && <X className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-[10px] text-destructive mt-1">Username is already taken</p>
                  )}
                </div>
              </div>
            )}

            {signUpStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">Create a password</h1>
                  <p className="text-sm text-muted-foreground">Make it strong — this protects your wardrobe.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 rounded-xl bg-card pr-10 h-12 text-base"
                      autoFocus
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
                  {password.length > 0 && (
                    <div className="space-y-1 mt-2">
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
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <Button
              type="submit"
              disabled={!canAdvance || loading}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
            >
              {signUpStep < totalSteps - 1 ? (
                <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
              ) : loading ? (
                "Creating..."
              ) : (
                "Create Account"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setSignUpStep(0); }}
                className="text-accent font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    );
  }

  // ============ SIGN-IN FORM ============
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F8F1E7 38%, #7B2432 80%, #4E1622 100%)" }}
    >
      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo + headline */}
        <div className="text-center space-y-3">
          <img src={vestisLogo} alt="Vestis" className="h-16 drop-shadow-sm mx-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#7B2432" }}>Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(123,36,50,0.6)" }}>Your wardrobe is waiting</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-3xl bg-card/80 border border-border/50 p-6 shadow-sm backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Email or Username</Label>
              <Input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="you@example.com or username"
                className="mt-1 rounded-xl bg-background"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 rounded-xl bg-background pr-10"
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
            </div>

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
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-accent font-medium hover:underline">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
            >
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          Don't have an account?{" "}
          <button
            onClick={() => setShowSignUpIntro(true)}
            style={{ color: "#F8F1E7" }}
            className="font-bold hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
