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
          <p className="text-xs text-muted-foreground">(Global Version – Enterprise Grade)</p>
          <p className="text-xs text-muted-foreground">Effective Date: 23rd February 2026</p>
          <p className="text-xs text-muted-foreground">Last Updated: 23rd February 2026</p>
        </div>

        <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", "your") and Vestis Limited, a company incorporated in New Zealand ("Vestis", "Company", "we", "us", "our"), governing your access to and use of:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Vestis mobile application</li>
          <li>The Vestis website</li>
          <li>Messaging and social features</li>
          <li>AI-powered wardrobe and styling tools</li>
          <li>Any related services, features, or content</li>
        </ul>
        <p>(collectively, the "Service").</p>
        <p>By accessing or using the Service, you agree to be bound by these Terms.</p>
        <p className="font-semibold text-foreground">If you do not agree, you must not use the Service.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">1. DEFINITIONS</h2>
        <p>For the purposes of these Terms:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>"User Content"</strong> means any images, text, profile information, wardrobe uploads, messages, comments, or other materials uploaded or submitted by a user.</li>
          <li><strong>"AI Outputs"</strong> means outfit recommendations, styling suggestions, generated combinations, automated categorizations, or other machine-generated results produced by Vestis systems.</li>
          <li><strong>"Minor"</strong> means any person under the age of 18.</li>
          <li><strong>"Child"</strong> means a user under the age of 16.</li>
          <li><strong>"Guardian"</strong> means a parent or legal guardian of a Minor.</li>
          <li><strong>"Platform Provider"</strong> means Apple App Store, Google Play Store, or any other distribution platform.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">2. ELIGIBILITY & AGE REQUIREMENTS</h2>
        <p>2.1 The Service is available worldwide.</p>
        <p>2.2 Users must be at least 13 years of age to create an account.</p>
        <p>2.3 If you are under 18, you represent that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You have obtained parental or legal guardian consent.</li>
          <li>Your Guardian has reviewed and agreed to these Terms and the Privacy Policy.</li>
        </ul>
        <p>2.4 If required by applicable law in your jurisdiction, additional parental consent mechanisms may apply.</p>
        <p>2.5 Vestis reserves the right to request proof of age or guardian consent.</p>
        <p>2.6 Vestis may immediately suspend or terminate accounts where age misrepresentation is suspected.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">3. PARENTAL RESPONSIBILITY</h2>
        <p>3.1 Guardians are responsible for supervising Minor users.</p>
        <p>3.2 Vestis does not guarantee monitoring of user interactions.</p>
        <p>3.3 Guardians acknowledge that messaging features may expose users to communications from other users.</p>
        <p>3.4 Vestis disclaims liability for user-to-user interactions to the fullest extent permitted by law.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">4. ACCOUNT REGISTRATION & SECURITY</h2>
        <p>4.1 You must provide accurate, current, and complete information.</p>
        <p>4.2 You are responsible for maintaining the confidentiality of your credentials.</p>
        <p>4.3 You agree to notify Vestis immediately of any unauthorised access.</p>
        <p>4.4 Vestis is not liable for losses resulting from compromised credentials unless caused by our gross negligence.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">5. USER-GENERATED CONTENT (UGC)</h2>
        <p>5.1 You retain ownership of your User Content.</p>
        <p>5.2 By uploading User Content, you grant Vestis a:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Worldwide</li>
          <li>Non-exclusive</li>
          <li>Royalty-free</li>
          <li>Sub-licensable</li>
          <li>Perpetual (subject to deletion rights)</li>
        </ul>
        <p>license to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Store</li>
          <li>Process</li>
          <li>Reproduce</li>
          <li>Modify</li>
          <li>Adapt</li>
          <li>Display</li>
          <li>Analyse</li>
          <li>Use for AI training (subject to Privacy Policy)</li>
        </ul>
        <p>for purposes including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operating the Service</li>
          <li>Improving algorithms</li>
          <li>Developing new features</li>
          <li>Research and development</li>
        </ul>
        <p>5.3 You represent and warrant that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You own or control necessary rights.</li>
          <li>Your content does not infringe intellectual property rights.</li>
          <li>Your content does not violate privacy or publicity rights.</li>
          <li>Your content is lawful in your jurisdiction.</li>
        </ul>
        <p>5.4 Vestis may remove User Content at its sole discretion.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">6. AI PROCESSING & MACHINE LEARNING</h2>
        <p>6.1 Vestis uses artificial intelligence and automated systems.</p>
        <p>6.2 AI Outputs:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Are generated automatically.</li>
          <li>May be inaccurate.</li>
          <li>May reflect bias.</li>
          <li>Are not guaranteed to meet expectations.</li>
        </ul>
        <p>6.3 Vestis does not guarantee:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fashion suitability.</li>
          <li>Social appropriateness.</li>
          <li>Weather reliability.</li>
          <li>Accuracy of categorisation.</li>
        </ul>
        <p>6.4 You acknowledge that AI Outputs are suggestions only.</p>
        <p>6.5 Vestis may use anonymised or aggregated data to improve AI systems.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">7. MESSAGING & SOCIAL FEATURES</h2>
        <p>7.1 The Service may allow users to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add friends.</li>
          <li>Send private messages.</li>
          <li>Discover other users.</li>
          <li>Share outfits.</li>
        </ul>
        <p>7.2 Vestis does not monitor messages in real time.</p>
        <p>7.3 Vestis does not endorse, verify, or validate user communications.</p>
        <p>7.4 You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harass, bully, threaten, or intimidate.</li>
          <li>Send sexually explicit material.</li>
          <li>Engage in grooming behaviour.</li>
          <li>Impersonate others.</li>
          <li>Solicit minors for inappropriate purposes.</li>
        </ul>
        <p>7.5 Vestis reserves the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Suspend messaging privileges.</li>
          <li>Remove accounts.</li>
          <li>Report unlawful behaviour to authorities.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">8. CHILD SAFETY & PROHIBITED CONDUCT</h2>
        <p>8.1 The following is strictly prohibited:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sexual exploitation of minors.</li>
          <li>Grooming behaviour.</li>
          <li>Sharing sexually explicit images involving minors.</li>
          <li>Soliciting private information from minors for exploitative purposes.</li>
        </ul>
        <p>8.2 Vestis may:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cooperate with law enforcement.</li>
          <li>Preserve and disclose data when legally required.</li>
          <li>Permanently ban violators.</li>
        </ul>
        <p>8.3 Vestis reserves sole discretion in determining violations.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">9. ACCEPTABLE USE</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Reverse engineer the Service.</li>
          <li>Use bots or scraping tools.</li>
          <li>Attempt to breach security.</li>
          <li>Distribute malware.</li>
          <li>Use the Service for unlawful purposes.</li>
          <li>Exploit the Service commercially without permission.</li>
        </ul>
        <p>Violation may result in immediate termination.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">10. PAYMENTS, SUBSCRIPTIONS & IN-APP PURCHASES</h2>
        <p>10.1 Vestis may offer paid features, premium subscriptions, or one-time purchases.</p>
        <p>10.2 All payments are processed through third-party Platform Providers (e.g., Apple App Store, Google Play).</p>
        <p>10.3 You agree that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Platform billing rules apply.</li>
          <li>Refunds are governed by platform policies.</li>
          <li>Vestis does not directly process or store full payment card information.</li>
        </ul>
        <p>10.4 Pricing may change at any time.</p>
        <p>10.5 Vestis may suspend paid features for non-payment.</p>
        <p>10.6 To the maximum extent permitted by law, fees are non-refundable except where required by mandatory consumer protection laws.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">11. CONSUMER LAW & GLOBAL COMPLIANCE</h2>
        <p>11.1 Nothing in these Terms excludes rights that cannot be excluded under applicable law.</p>
        <p>11.2 For users in New Zealand:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Consumer Guarantees Act 1993 may apply.</li>
          <li>To the extent permitted for business users, guarantees may be contracted out.</li>
        </ul>
        <p>11.3 For users in the European Union or UK:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mandatory consumer protections under GDPR and local consumer law remain applicable.</li>
        </ul>
        <p>11.4 For users in the United States:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>State-level consumer rights may apply.</li>
        </ul>
        <p>11.5 Where a provision is unenforceable in a jurisdiction, it shall be modified only to the extent necessary.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">12. CONTENT MODERATION & TAKEDOWN PROCEDURE</h2>
        <p>12.1 Vestis reserves the right (but not the obligation) to monitor, review, or remove content.</p>
        <p>12.2 Users may report:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Copyright infringement</li>
          <li>Harassment</li>
          <li>Illegal content</li>
          <li>Child safety concerns</li>
        </ul>
        <p>12.3 Upon receiving a valid notice of infringement, Vestis may:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Remove content</li>
          <li>Suspend accounts</li>
          <li>Terminate repeat infringers</li>
        </ul>
        <p>12.4 Vestis reserves sole discretion in content enforcement decisions.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">13. REPEAT INFRINGER POLICY</h2>
        <p>13.1 Accounts that repeatedly violate intellectual property rights or these Terms may be permanently terminated.</p>
        <p>13.2 Vestis maintains internal records of enforcement actions.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">14. INTELLECTUAL PROPERTY RIGHTS</h2>
        <p>14.1 All intellectual property in the Service is owned by Vestis Limited or its licensors.</p>
        <p>14.2 This includes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Software code</li>
          <li>AI models</li>
          <li>Algorithms</li>
          <li>Databases</li>
          <li>Design</li>
          <li>Branding</li>
          <li>Logos</li>
          <li>Trade dress</li>
        </ul>
        <p>14.3 No licence is granted except as expressly stated.</p>
        <p>14.4 You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Copy or reproduce the Service</li>
          <li>Modify or create derivative works</li>
          <li>Reverse engineer</li>
          <li>Extract data at scale</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">15. FEEDBACK LICENCE</h2>
        <p>15.1 If you provide suggestions, feedback, or improvements:</p>
        <p>You grant Vestis a perpetual, irrevocable, royalty-free licence to use such feedback without compensation.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">16. SERVICE AVAILABILITY</h2>
        <p>16.1 Vestis does not guarantee uninterrupted access.</p>
        <p>16.2 The Service may be:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Modified</li>
          <li>Suspended</li>
          <li>Discontinued</li>
        </ul>
        <p>at any time without liability.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">17. SECURITY DISCLAIMER</h2>
        <p>17.1 While Vestis implements reasonable security measures, no system is completely secure.</p>
        <p>17.2 You acknowledge that:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Transmission of information is at your own risk.</li>
          <li>Vestis cannot guarantee absolute data security.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">18. WARRANTY DISCLAIMER</h2>
        <p>To the maximum extent permitted by law:</p>
        <p>The Service is provided "as is" and "as available."</p>
        <p>Vestis disclaims all warranties including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Merchantability</li>
          <li>Fitness for purpose</li>
          <li>Non-infringement</li>
          <li>Accuracy</li>
          <li>Reliability</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">19. LIMITATION OF LIABILITY</h2>
        <p>To the maximum extent permitted by law:</p>
        <p>19.1 Vestis shall not be liable for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Indirect damages</li>
          <li>Consequential damages</li>
          <li>Lost profits</li>
          <li>Emotional distress</li>
          <li>Reputational harm</li>
          <li>User disputes</li>
          <li>AI inaccuracies</li>
          <li>Messaging misconduct</li>
          <li>Content posted by users</li>
        </ul>
        <p>19.2 Vestis' total aggregate liability shall not exceed:</p>
        <p>The greater of:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>NZD $100; or</li>
          <li>The amount you paid to Vestis in the past 12 months.</li>
        </ul>
        <p>19.3 This limitation applies regardless of legal theory.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">20. INDEMNIFICATION</h2>
        <p>You agree to indemnify, defend, and hold harmless Vestis and its directors, officers, employees, and affiliates from claims arising out of:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your use of the Service</li>
          <li>Your User Content</li>
          <li>Your communications with other users</li>
          <li>Your breach of these Terms</li>
          <li>Your violation of applicable laws</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">21. CORPORATE TRANSACTIONS</h2>
        <p>If Vestis is involved in:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Merger</li>
          <li>Acquisition</li>
          <li>Asset sale</li>
          <li>Restructuring</li>
        </ul>
        <p>User data may be transferred subject to applicable law.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">22. TERMINATION</h2>
        <p>22.1 Vestis may suspend or terminate accounts at any time.</p>
        <p>22.2 Upon termination:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access ceases</li>
          <li>Data may be deleted</li>
          <li>No refund is owed except where legally required</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">23. DISPUTE RESOLUTION & ARBITRATION</h2>
        <p className="font-semibold text-foreground">23.1 Informal Resolution</p>
        <p>Users agree to attempt informal resolution before initiating legal proceedings.</p>
        <p className="font-semibold text-foreground">23.2 Binding Arbitration</p>
        <p>Except where prohibited by law, disputes shall be resolved by binding arbitration.</p>
        <p className="font-semibold text-foreground">23.3 Class Action Waiver</p>
        <p>You agree that disputes shall be conducted on an individual basis only and not as part of any class action.</p>
        <p className="font-semibold text-foreground">23.4 Exceptions</p>
        <p>Nothing prevents Vestis from seeking injunctive relief in court for intellectual property violations.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">24. GOVERNING LAW</h2>
        <p>These Terms are governed by the laws of New Zealand.</p>
        <p>Venue for court proceedings (where arbitration does not apply) shall be New Zealand.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">25. FORCE MAJEURE</h2>
        <p>Vestis is not liable for delays caused by events beyond reasonable control.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">26. SEVERABILITY</h2>
        <p>If any provision is unenforceable, remaining provisions remain valid.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">27. WAIVER</h2>
        <p>Failure to enforce a right does not constitute waiver.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">28. ENTIRE AGREEMENT</h2>
        <p>These Terms constitute the entire agreement between you and Vestis.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">29. CONTACT INFORMATION</h2>
        <p>Vestis Limited</p>
      </div>
    </div>
  );
}
