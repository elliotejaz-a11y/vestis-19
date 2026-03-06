import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Check, X, Loader2, Sun, Moon, ArrowLeft, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import vestisLogo from "@/assets/vestis-logo.png";
import { useTheme } from "next-themes";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
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
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

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
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        localStorage.setItem("pending_username", username);
        localStorage.setItem("vestis_fresh_signup", "true");
        setSignUpEmail(email);
        setShowVerification(true);
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

  // Forgot password view
  if (showForgotPassword) {
    return <ForgotPasswordView onBack={() => setShowForgotPassword(false)} />;
  }

  // Email verification view
  if (showVerification) {
    return <VerificationView email={signUpEmail} onBack={() => setShowVerification(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={vestisLogo} alt="Vestis" className="h-12" />
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 uppercase tracking-wider">Beta</Badge>
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
                minLength={6}
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

          {/* Remember me - only on sign in */}
          {!isSignUp && (
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
