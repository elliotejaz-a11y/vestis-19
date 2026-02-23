import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-border/40">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground">Privacy Policy</h1>
      </header>
      <div className="px-5 py-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
        <h2 className="text-base font-semibold text-foreground">Information We Collect</h2>
        <p>We collect information you provide directly, such as your email address, display name, profile photo, and wardrobe items. We also collect usage data to improve the service.</p>
        <h2 className="text-base font-semibold text-foreground">How We Use Your Information</h2>
        <p>Your information is used to provide and improve the Vestis service, including AI-powered clothing analysis, outfit recommendations, and social features.</p>
        <h2 className="text-base font-semibold text-foreground">Data Storage & Security</h2>
        <p>Your data is stored securely using industry-standard encryption. Images are stored in secure cloud storage with access controls.</p>
        <h2 className="text-base font-semibold text-foreground">Sharing</h2>
        <p>We do not sell your personal information. Data is only shared with third-party services necessary to operate the platform (e.g., AI analysis providers).</p>
        <h2 className="text-base font-semibold text-foreground">Your Rights</h2>
        <p>You can access, update, or delete your personal data at any time through the app. You may also request a full data export by contacting us.</p>
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>For privacy-related inquiries, please use the Help & Feedback section within the app.</p>
      </div>
    </div>
  );
}
