import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Cookies() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-border/40">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground">Cookie & Tracking Policy</h1>
      </header>
      <div className="px-5 py-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
        <h2 className="text-base font-semibold text-foreground">What Are Cookies?</h2>
        <p>Cookies are small text files stored on your device when you visit a website. They help us provide and improve our service.</p>
        <h2 className="text-base font-semibold text-foreground">Cookies We Use</h2>
        <p><strong>Essential cookies:</strong> Required for authentication and core functionality. These cannot be disabled.</p>
        <p><strong>Analytics cookies:</strong> Help us understand how the app is used so we can improve the experience. These are anonymised.</p>
        <h2 className="text-base font-semibold text-foreground">Third-Party Services</h2>
        <p>We may use third-party services that set their own cookies for analytics or functionality purposes.</p>
        <h2 className="text-base font-semibold text-foreground">Managing Cookies</h2>
        <p>You can manage or delete cookies through your browser settings. Note that disabling essential cookies may affect the functionality of the app.</p>
      </div>
    </div>
  );
}
