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
      <div className="px-5 py-6 space-y-5 text-sm text-foreground/80 leading-relaxed">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">TERMS OF SERVICE</h2>
          <p className="text-sm font-semibold text-foreground">Vestis Limited</p>
          <p className="text-xs text-muted-foreground">Effective Date: 23rd February 2026</p>
          <p className="text-xs text-muted-foreground">Last Updated: 23rd February 2026</p>
        </div>

        <p>These Terms of Service ("Terms") form a legally binding agreement between you ("User", "you") and Vestis Limited, a New Zealand company ("Vestis", "Company", "we", "us", "our"), governing your access to and use of the Vestis application, website, messaging features, and related services (collectively, the "Service").</p>
        <p className="font-semibold text-foreground">If you do not agree to these Terms, you must not use the Service.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">1. ELIGIBILITY</h2>
        <p>1.1 You must be at least 13 years of age to use the Service.</p>
        <p>1.2 If you are under 18 years of age, you confirm that you have parental or legal guardian consent.</p>
        <p>1.3 You represent and warrant that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You have the legal capacity to enter into this agreement.</li>
          <li>You will comply with all applicable laws.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">2. ACCOUNT REGISTRATION</h2>
        <p>2.1 You must provide accurate and complete information.</p>
        <p>2.2 You are responsible for safeguarding your login credentials.</p>
        <p>2.3 You are responsible for all activity conducted under your account.</p>
        <p>2.4 Vestis reserves the right to suspend or terminate accounts suspected of misuse or fraudulent activity.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">3. USER CONTENT</h2>
        <p>3.1 You retain ownership of images, profile information, and messages you upload ("User Content").</p>
        <p>3.2 By uploading User Content, you grant Vestis a worldwide, non-exclusive, royalty-free license to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Store</li>
          <li>Process</li>
          <li>Modify</li>
          <li>Reproduce</li>
          <li>Display</li>
          <li>Analyse</li>
          <li>Use for AI processing and outfit generation</li>
        </ul>
        <p>for the purpose of operating and improving the Service.</p>
        <p>3.3 You represent and warrant that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You own or have the right to use the content.</li>
          <li>The content does not infringe any third-party rights.</li>
          <li>The content is lawful.</li>
        </ul>
        <p>3.4 Vestis reserves the right to remove content at its sole discretion.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">4. MESSAGING & SOCIAL FEATURES</h2>
        <p>4.1 The Service may allow users to send private messages and connect with other users.</p>
        <p>4.2 Vestis does not monitor private communications in real time.</p>
        <p>4.3 Vestis does not endorse or assume responsibility for user communications.</p>
        <p>4.4 You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harass</li>
          <li>Threaten</li>
          <li>Exploit</li>
          <li>Send explicit content</li>
          <li>Engage in grooming behaviour</li>
          <li>Impersonate others</li>
        </ul>
        <p>4.5 Vestis reserves the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Suspend messaging access</li>
          <li>Remove accounts</li>
          <li>Report unlawful behaviour to authorities</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">5. ACCEPTABLE USE</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Reverse engineer the app</li>
          <li>Scrape data</li>
          <li>Use bots or automation</li>
          <li>Attempt to breach security</li>
          <li>Interfere with infrastructure</li>
          <li>Circumvent paywalls</li>
          <li>Use the Service for commercial exploitation without consent</li>
        </ul>
        <p>Violation may result in immediate termination.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">6. INTELLECTUAL PROPERTY</h2>
        <p>6.1 All rights in the Vestis Service, including software, design, AI models, branding, and functionality, remain the exclusive property of Vestis Limited.</p>
        <p>6.2 No rights are granted except as expressly stated.</p>
        <p>6.3 You may not copy, distribute, or create derivative works without permission.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">7. AI DISCLAIMER</h2>
        <p>7.1 Outfit recommendations are generated using artificial intelligence.</p>
        <p>7.2 Vestis does not guarantee:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fashion suitability</li>
          <li>Weather accuracy</li>
          <li>Style outcomes</li>
          <li>Social acceptance</li>
        </ul>
        <p>7.3 Recommendations are suggestions only.</p>
        <p>7.4 Vestis is not responsible for outcomes resulting from AI-generated suggestions.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">8. PAYMENTS & SUBSCRIPTIONS (IF APPLICABLE)</h2>
        <p>8.1 Paid features may be offered.</p>
        <p>8.2 Payments are processed through third-party platforms.</p>
        <p>8.3 All fees are non-refundable except where required by law.</p>
        <p>8.4 Subscription cancellations must comply with platform policies.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">9. LIMITATION OF LIABILITY</h2>
        <p>To the maximum extent permitted by law:</p>
        <p>9.1 Vestis shall not be liable for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Indirect or consequential losses</li>
          <li>Loss of data</li>
          <li>Loss of profits</li>
          <li>Emotional distress</li>
          <li>Reputational damage</li>
          <li>User disputes</li>
        </ul>
        <p>9.2 Total liability shall not exceed the amount paid by you in the preceding 12 months.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">10. INDEMNITY</h2>
        <p>You agree to indemnify and hold harmless Vestis, its directors, officers, and employees from any claims arising from:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your use of the Service</li>
          <li>Your breach of these Terms</li>
          <li>Your infringement of third-party rights</li>
          <li>Your communications with other users</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">11. THIRD-PARTY SERVICES</h2>
        <p>The Service may integrate third-party tools (e.g., AI providers, analytics).</p>
        <p>Vestis is not responsible for third-party service performance or outages.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">12. TERMINATION</h2>
        <p>12.1 Vestis may suspend or terminate accounts at its discretion.</p>
        <p>12.2 Upon termination:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access to the Service ceases</li>
          <li>User Content may be deleted</li>
          <li>No refunds shall be provided except where required by law</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">13. PRIVACY</h2>
        <p>Your use of the Service is also governed by our Privacy Policy.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">14. NO WARRANTY</h2>
        <p>The Service is provided "as is" and "as available."</p>
        <p>Vestis disclaims all warranties, express or implied, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Merchantability</li>
          <li>Fitness for purpose</li>
          <li>Non-infringement</li>
          <li>Continuous availability</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">15. FORCE MAJEURE</h2>
        <p>Vestis shall not be liable for delays or failure caused by events beyond reasonable control.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">16. CHANGES TO TERMS</h2>
        <p>We may update these Terms at any time.</p>
        <p>Continued use constitutes acceptance.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">17. GOVERNING LAW</h2>
        <p>These Terms are governed by the laws of New Zealand.</p>
        <p>Any disputes shall be resolved in New Zealand courts.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">18. SEVERABILITY</h2>
        <p>If any clause is deemed unenforceable, remaining clauses remain valid.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">19. ENTIRE AGREEMENT</h2>
        <p>These Terms constitute the entire agreement between you and Vestis.</p>
      </div>
    </div>
  );
}
