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
      <div className="px-5 py-6 space-y-5 text-sm text-foreground/80 leading-relaxed">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">PRIVACY POLICY</h2>
          <p className="text-muted-foreground text-xs">Vestis Limited</p>
          <p className="text-muted-foreground text-xs">Effective Date: February 2026 · Last Updated: February 2026</p>
        </div>

        <p>Vestis Limited ("Vestis", "we", "us", "our") is a company incorporated in New Zealand. We operate the Vestis mobile application, website, AI wardrobe platform, messaging features, and related services (collectively, the "Service").</p>
        <p>We are committed to protecting personal information in accordance with applicable data protection laws, including but not limited to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The New Zealand Privacy Act 2020</li>
          <li>The General Data Protection Regulation (EU) 2016/679 ("GDPR")</li>
          <li>The UK GDPR</li>
          <li>The California Consumer Privacy Act ("CCPA"), as amended</li>
          <li>Other applicable global data protection laws</li>
        </ul>
        <p>This Privacy Policy explains how we collect, use, process, disclose, transfer, and safeguard personal information when you use the Service.</p>
        <p>By accessing or using the Service, you acknowledge that you have read and understood this Privacy Policy.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">1. Data Controller</h2>
        <p>For the purposes of data protection law, Vestis Limited acts as the data controller of personal information collected through the Service.</p>
        <p>If you are located in the European Union or United Kingdom, you may contact us regarding your GDPR rights using the contact details within the app.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">2. Scope of This Policy</h2>
        <p>This Privacy Policy applies to all users worldwide. If you access the Service from outside New Zealand, you acknowledge that your personal information may be transferred to, stored in, and processed in countries where data protection laws may differ from those in your jurisdiction.</p>
        <p>Where mandatory local laws apply, those rights are preserved.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">3. Categories of Personal Information We Collect</h2>
        <p>We collect personal information directly from you, automatically through your use of the Service, and in certain cases from third parties.</p>

        <h3 className="text-sm font-semibold text-foreground">3.1 Information You Provide Directly</h3>
        <p>This may include your name, username, email address, password, profile picture, wardrobe images, styling preferences, saved outfits, messaging content, feedback, support requests, and any other information voluntarily submitted through the Service.</p>

        <h3 className="text-sm font-semibold text-foreground">3.2 Messaging Data</h3>
        <p>When you use the messaging feature, we collect the content of messages, timestamps, delivery metadata, and associated identifiers necessary to facilitate communications.</p>
        <p>We do not routinely monitor private messages in real time; however, message data may be reviewed where required for moderation, safety enforcement, or legal compliance.</p>

        <h3 className="text-sm font-semibold text-foreground">3.3 Wardrobe & Image Data</h3>
        <p>When you upload clothing images or other photos, we collect the images themselves, embedded metadata, timestamps, and AI-generated categorisation data.</p>
        <p>These images may be processed by automated systems for styling analysis and AI improvement.</p>

        <h3 className="text-sm font-semibold text-foreground">3.4 Automatically Collected Data</h3>
        <p>We may automatically collect:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>IP address</li>
          <li>Device identifiers</li>
          <li>Operating system</li>
          <li>App version</li>
          <li>Session data</li>
          <li>Clickstream activity</li>
          <li>Feature usage</li>
          <li>Crash logs</li>
          <li>Approximate geolocation (if enabled)</li>
        </ul>

        <h3 className="text-sm font-semibold text-foreground">3.5 Inferred & Derived Data</h3>
        <p>We may generate inferred data such as style preferences, engagement patterns, interaction behaviours, and algorithmic classifications based on your activity within the Service.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">4. Children and Minors</h2>
        <p>The Service is available to users aged 13 and above.</p>
        <p>Where users are under 16 years of age, we may require parental or guardian consent where required by applicable law.</p>
        <p>We take children's data protection seriously and:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not knowingly collect more information than reasonably necessary.</li>
          <li>Do not intentionally sell children's personal information.</li>
          <li>Implement additional safeguards for minor accounts.</li>
        </ul>
        <p>Parents or guardians may contact us to request access to or deletion of a minor's personal information.</p>
        <p>If we become aware that personal information has been collected from a child in violation of applicable law, we will take reasonable steps to delete such data.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">5. Purposes of Processing</h2>
        <p>We process personal information for the following lawful purposes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage user accounts.</li>
          <li>To provide AI-powered outfit recommendations and wardrobe functionality.</li>
          <li>To facilitate messaging and social features.</li>
          <li>To personalise content and recommendations.</li>
          <li>To maintain platform integrity, detect fraud, prevent abuse, and enforce safety policies.</li>
          <li>To improve our algorithms, features, and system performance.</li>
          <li>To conduct internal research and analytics.</li>
          <li>To comply with legal obligations and regulatory requirements.</li>
          <li>To respond to support enquiries and user communications.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">6. AI Processing & Machine Learning</h2>
        <p>Vestis uses artificial intelligence and automated decision-making systems to analyse wardrobe images and generate outfit recommendations.</p>
        <p>Uploaded images may be processed for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Categorisation</li>
          <li>Style matching</li>
          <li>Pattern recognition</li>
          <li>Algorithm training</li>
          <li>System optimisation</li>
        </ul>
        <p>Where feasible, we use anonymisation or aggregation techniques when using data to improve AI systems.</p>
        <p>AI outputs are automated suggestions and do not constitute professional advice.</p>
        <p>Users may contact us for further information regarding automated processing.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">7. Legal Bases for Processing (GDPR)</h2>
        <p>For users in the European Economic Area and United Kingdom, our legal bases include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Performance of a contract</strong>, where processing is necessary to provide the Service.</li>
          <li><strong>Compliance with legal obligations.</strong></li>
          <li><strong>Legitimate interests</strong>, including platform security, feature development, and fraud prevention.</li>
          <li><strong>Consent</strong>, where required for optional features such as location services.</li>
        </ul>
        <p>Where consent is relied upon, it may be withdrawn at any time without affecting the lawfulness of processing prior to withdrawal.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">8. Sharing and Disclosure</h2>
        <p>We may share personal information with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service providers assisting with hosting, analytics, messaging infrastructure, AI infrastructure, and security services.</li>
          <li>Legal authorities where required by law, subpoena, court order, or regulatory request.</li>
          <li>Successor entities in the event of merger, acquisition, or restructuring.</li>
        </ul>
        <p>We require service providers to process personal information in accordance with applicable data protection laws.</p>
        <p>We do not sell personal information in the conventional sense. However, users in certain jurisdictions may have additional rights under broad statutory definitions of "sale."</p>

        <h2 className="text-base font-semibold text-foreground pt-2">9. International Data Transfers</h2>
        <p>Because we operate globally, personal information may be transferred outside your country of residence.</p>
        <p>Where data is transferred from the European Union or United Kingdom to countries without adequacy decisions, we implement appropriate safeguards such as:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Standard Contractual Clauses.</li>
          <li>Contractual data protection commitments.</li>
          <li>Other lawful mechanisms recognised under applicable law.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">10. Data Retention</h2>
        <p>We retain personal information only for as long as necessary to fulfil the purposes described in this Privacy Policy.</p>
        <p>When accounts are deleted, we may retain limited information for legal compliance, dispute resolution, fraud prevention, or security purposes.</p>
        <p>Backups may persist for limited periods before deletion cycles complete.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">11. Data Security</h2>
        <p>We implement appropriate technical and organisational measures to protect personal information from unauthorised access, loss, misuse, or alteration.</p>
        <p>However, no method of electronic transmission or storage is entirely secure. Users acknowledge that data transmission occurs at their own risk.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">12. User Rights</h2>
        <p>Depending on your jurisdiction, you may have rights to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access your personal information.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of personal information.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Request data portability.</li>
          <li>Withdraw consent where applicable.</li>
          <li>Lodge complaints with a supervisory authority.</li>
        </ul>
        <p>Requests may be submitted through the Help & Feedback section within the app.</p>
        <p>We may require identity verification before fulfilling requests.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">13. California Privacy Rights</h2>
        <p>California residents may have additional rights, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The right to know categories of personal information collected.</li>
          <li>The right to request deletion.</li>
          <li>The right to opt out of certain data uses.</li>
          <li>The right not to be discriminated against for exercising privacy rights.</li>
        </ul>
        <p>Requests may be submitted through our Help & Feedback section.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">14. Cookies and Tracking</h2>
        <p>Where web functionality exists, we may use cookies, analytics tools, and tracking technologies to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Measure engagement.</li>
          <li>Improve performance.</li>
          <li>Diagnose system issues.</li>
        </ul>
        <p>Users may adjust browser settings to limit tracking where applicable.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">15. Automated Decision-Making</h2>
        <p>AI-generated recommendations are automated outputs designed to enhance user experience.</p>
        <p>They do not constitute legally binding decisions and do not produce significant legal effects under applicable law.</p>
        <p>Users may contact us for further clarification regarding automated processing.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">16. Third-Party Links</h2>
        <p>The Service may contain links to third-party websites or services.</p>
        <p>We are not responsible for the privacy practices of third parties.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">17. Policy Changes</h2>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>Where material changes occur, we may notify users through the Service.</p>
        <p>Continued use after updates constitutes acceptance.</p>
      </div>
    </div>
  );
}
