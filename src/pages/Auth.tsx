import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Eye, EyeOff, Check, X, Loader2, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import vestisLogo from "@/assets/vestis-logo.png";
import { useTheme } from "next-themes";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const passwordValid = (pw: string) => pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Sign in failed", description: String(error), variant: "destructive" });
    }
    setSocialLoading(null);
  };

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
      toast({ title: "Check your email ✉️", description: "We sent a password reset link. Check your spam folder too!" });
      setShowForgotPassword(false);
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

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Check your email ✉️</h2>
          <p className="text-sm text-muted-foreground">We sent a verification link to <span className="font-medium text-foreground">{signUpEmail}</span></p>
          <div className="rounded-2xl bg-card border border-border/40 p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">• Check your <span className="font-medium text-foreground">spam/junk</span> folder if you don't see it</p>
            <p className="text-xs text-muted-foreground">• The link expires in 24 hours</p>
          </div>
          <Button
            onClick={handleResendVerification}
            disabled={resendLoading}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm"
          >
            {resendLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Resend Verification Email
          </Button>
          <button onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }} className="text-xs text-accent font-semibold hover:underline">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={vestisLogo} alt="Vestis" className="h-12 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link</p>
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
            {forgotLoading ? "Sending..." : "Send Reset Link"}
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
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-accent font-medium hover:underline">
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

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleSocialSignIn("google")}
            disabled={!!socialLoading}
            className="w-full h-12 rounded-2xl border border-border bg-card flex items-center justify-center gap-3 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {socialLoading === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignIn("apple")}
            disabled={!!socialLoading}
            className="w-full h-12 rounded-2xl bg-foreground text-background flex items-center justify-center gap-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {socialLoading === "apple" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg width="16" height="19" viewBox="0 0 170 200" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M150.4 172.3c-7.6 16.8-11.2 24.3-20.9 39.3-13.6 20.8-32.7 46.8-56.4 47-21.1.2-26.5-13.7-55.2-13.6-28.6.2-34.6 13.9-55.7 13.7C38.6 258.5 19.1 234.6 5.5 213.8-24.4 169.3-29 115.6-7.2 87.3 9.5 66.5 34.2 53.8 57.3 53.8c25.4 0 41.3 13.8 62.3 13.8 20.4 0 32.8-13.8 62.2-13.8 20.5 0 42.3 11.2 59 30.5-51.9 28.4-43.4 102.4 9.6 88ZM102.3 42.7C113 29.9 121 12.3 118.3-4.8c-15.3 1.1-33.2 10.8-43.7 23.6-9.5 11.7-17.9 29.5-14.7 46.6 16.7.5 34-9.4 42.4-22.7Z" transform="translate(30 5)"/>
              </svg>
            )}
            Continue with Apple
          </button>
        </div>

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
