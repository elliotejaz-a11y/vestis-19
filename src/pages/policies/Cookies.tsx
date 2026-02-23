import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Cookies() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-border/40">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground">Cookie Policy</h1>
      </header>
      <div className="px-5 py-6 space-y-5 text-sm text-foreground/80 leading-relaxed">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">COOKIE & TRACKING TECHNOLOGIES POLICY</h2>
          <p className="text-muted-foreground text-xs">Vestis Limited</p>
          <p className="text-muted-foreground text-xs">Effective Date: 23/02/26 · Last Updated: 23/02/26</p>
        </div>

        <p>This Cookie & Tracking Technologies Policy explains how Vestis Limited ("Vestis", "we", "us", "our") uses cookies, software development kits ("SDKs"), tracking pixels, local storage, device identifiers, and similar technologies when you access or use the Vestis website, mobile application, and related services (collectively, the "Service").</p>
        <p>This Policy should be read alongside our Privacy Policy and Terms of Service.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">1. What Are Cookies and Tracking Technologies</h2>
        <p>Cookies are small text files stored on your device when you visit a website. They allow websites to recognise your device and store certain information.</p>
        <p>Tracking technologies may also include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Software development kits (SDKs) integrated into mobile applications.</li>
          <li>Pixels and web beacons.</li>
          <li>Local storage objects.</li>
          <li>Device identifiers such as advertising IDs.</li>
          <li>Log files and server-side tracking mechanisms.</li>
        </ul>
        <p>These technologies help us operate the Service, understand usage patterns, improve performance, and maintain security.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">2. How We Use Cookies and Tracking Technologies</h2>
        <p>We use cookies and similar technologies for the following purposes.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>To enable core functionality of the Service, including login authentication, session management, and security controls.</li>
          <li>To analyse how users interact with the Service, including which features are used most frequently and how users navigate through the application.</li>
          <li>To improve performance and reliability by identifying bugs, crashes, and system errors.</li>
          <li>To personalise content, including style recommendations and feature display preferences.</li>
          <li>To maintain security by detecting fraudulent or abusive behaviour.</li>
          <li>To measure engagement and evaluate feature effectiveness.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">3. Types of Cookies We Use</h2>

        <h3 className="text-sm font-semibold text-foreground">Strictly Necessary Cookies</h3>
        <p>These cookies are essential for the operation of the Service. Without them, certain features such as account login and security protections cannot function properly.</p>
        <p>These cookies do not require consent under many jurisdictions because they are necessary to provide the Service.</p>

        <h3 className="text-sm font-semibold text-foreground">Performance and Analytics Cookies</h3>
        <p>These cookies collect information about how users interact with the Service, such as pages visited, time spent, and error messages.</p>
        <p>Analytics tools may include third-party providers. Data collected through analytics tools may be aggregated and anonymised where possible.</p>

        <h3 className="text-sm font-semibold text-foreground">Functional Cookies</h3>
        <p>These cookies enable enhanced functionality and personalisation, such as remembering user preferences and settings.</p>

        <h3 className="text-sm font-semibold text-foreground">Advertising or Marketing Technologies (If Implemented)</h3>
        <p>If Vestis introduces advertising or marketing integrations in the future, we may use tracking technologies to measure ad effectiveness or provide relevant promotional content. Any such use will be disclosed and managed in accordance with applicable laws.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">4. Mobile Application Tracking</h2>
        <p>Because Vestis operates primarily as a mobile application, we may use SDKs or mobile tracking technologies rather than traditional browser cookies.</p>
        <p>These may collect:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Device model and operating system.</li>
          <li>App version and crash logs.</li>
          <li>Interaction events.</li>
          <li>Advertising identifiers (where applicable).</li>
          <li>IP address and approximate location.</li>
        </ul>
        <p>On Apple devices, tracking across apps and websites may be subject to Apple's App Tracking Transparency framework. Where required, we will request permission before engaging in tracking for advertising purposes.</p>
        <p>Users may control tracking permissions through device settings.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">5. Third-Party Service Providers</h2>
        <p>We may use third-party providers to assist with analytics, performance monitoring, AI infrastructure, or messaging functionality.</p>
        <p>These providers may set their own tracking technologies subject to their own privacy policies.</p>
        <p>We require third-party providers to process personal information in accordance with applicable data protection laws.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">6. Legal Basis for Tracking (GDPR)</h2>
        <p>For users located in the European Economic Area or United Kingdom, the use of non-essential cookies and tracking technologies may require consent.</p>
        <p>Where required by law, we will obtain consent before placing non-essential tracking technologies on your device.</p>
        <p>You may withdraw consent at any time by adjusting your preferences or device settings.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">7. Your Choices and Controls</h2>
        <p>You can manage cookies and tracking technologies through:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Browser settings, which allow you to delete or block cookies.</li>
          <li>Mobile device settings, including limiting advertising identifiers or resetting advertising IDs.</li>
          <li>Operating system permissions, including location services and tracking permissions.</li>
        </ul>
        <p>Disabling certain cookies may impact functionality of the Service.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">8. Data Retention</h2>
        <p>Information collected through cookies and tracking technologies is retained for as long as necessary to fulfil the purposes described in this Policy.</p>
        <p>Analytics data may be retained in aggregated or anonymised form for longer periods.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">9. International Data Transfers</h2>
        <p>Tracking and analytics data may be processed in jurisdictions outside your country of residence.</p>
        <p>Where required, appropriate safeguards such as standard contractual clauses or equivalent mechanisms are implemented to protect personal information.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">10. Do Not Track Signals</h2>
        <p>Some browsers transmit "Do Not Track" signals. Because there is no uniform industry standard for responding to such signals, Vestis does not currently respond differently to these signals.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">11. Updates to This Policy</h2>
        <p>We may update this Cookie & Tracking Technologies Policy from time to time to reflect changes in technology, legal requirements, or Service functionality.</p>
        <p>Material changes may be communicated through the Service.</p>
      </div>
    </div>
  );
}
