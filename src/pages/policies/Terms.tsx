import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-border/40">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground">Terms of Service</h1>
      </header>
      <div className="px-5 py-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-muted-foreground text-xs">Last updated: February 2026</p>
        <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>By accessing or using Vestis, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.</p>
        <h2 className="text-base font-semibold text-foreground">2. Use of Service</h2>
        <p>Vestis provides a digital wardrobe management platform. You must be at least 13 years old to use this service. You are responsible for maintaining the confidentiality of your account credentials.</p>
        <h2 className="text-base font-semibold text-foreground">3. User Content</h2>
        <p>You retain ownership of all content you upload. By uploading content, you grant Vestis a non-exclusive licence to store, display, and process your content solely to provide the service.</p>
        <h2 className="text-base font-semibold text-foreground">4. Prohibited Conduct</h2>
        <p>You agree not to misuse the service, including but not limited to: uploading illegal content, attempting to access other users' data, or using automated systems to scrape or overload the service.</p>
        <h2 className="text-base font-semibold text-foreground">5. Termination</h2>
        <p>We may suspend or terminate your account at our discretion if you violate these terms. You may delete your account at any time through the app settings.</p>
        <h2 className="text-base font-semibold text-foreground">6. Limitation of Liability</h2>
        <p>Vestis is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
        <h2 className="text-base font-semibold text-foreground">7. Changes</h2>
        <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the revised terms.</p>
      </div>
    </div>
  );
}
