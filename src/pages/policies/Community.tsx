import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Community() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-border/40">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground">Community Guidelines</h1>
      </header>
      <div className="px-5 py-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
        <h2 className="text-base font-semibold text-foreground">Be Respectful</h2>
        <p>Treat all community members with kindness and respect. Harassment, bullying, or discrimination of any kind will not be tolerated.</p>
        <h2 className="text-base font-semibold text-foreground">Appropriate Content</h2>
        <p>Only upload content related to fashion and clothing. Explicit, violent, or otherwise inappropriate content is strictly prohibited.</p>
        <h2 className="text-base font-semibold text-foreground">No Spam</h2>
        <p>Do not use the platform for unsolicited advertising, promotion, or spam of any kind.</p>
        <h2 className="text-base font-semibold text-foreground">Intellectual Property</h2>
        <p>Only upload content you own or have permission to share. Do not copy or redistribute other users' content without their consent.</p>
        <h2 className="text-base font-semibold text-foreground">Reporting</h2>
        <p>If you encounter content or behaviour that violates these guidelines, please report it through the app. We review all reports promptly.</p>
        <h2 className="text-base font-semibold text-foreground">Enforcement</h2>
        <p>Violations may result in content removal, temporary suspension, or permanent account termination at our discretion.</p>
      </div>
    </div>
  );
}
