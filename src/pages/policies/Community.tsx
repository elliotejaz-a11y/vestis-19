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
      <div className="px-5 py-6 space-y-5 text-sm text-foreground/80 leading-relaxed">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">COMMUNITY GUIDELINES & PLATFORM CONDUCT POLICY</h2>
          <p className="text-muted-foreground text-xs">Vestis Limited</p>
          <p className="text-muted-foreground text-xs">Effective Date: 23/02/26 · Last Updated: 23/02/26</p>
        </div>

        <p>These Community Guidelines ("Guidelines") govern acceptable behaviour on the Vestis platform, including the Vestis mobile application, messaging functionality, wardrobe uploads, social discovery features, and all related services (collectively, the "Platform").</p>
        <p>These Guidelines form part of the Vestis Terms of Service. By using the Platform, you agree to comply with these Guidelines.</p>
        <p>Vestis is committed to fostering a safe, respectful, and creative environment for users worldwide, including minors.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">1. Purpose of These Guidelines</h2>
        <p>The purpose of these Guidelines is to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Promote respectful interactions.</li>
          <li>Protect minors and vulnerable users.</li>
          <li>Prevent harassment and exploitation.</li>
          <li>Maintain platform integrity.</li>
          <li>Provide transparency regarding moderation decisions.</li>
        </ul>
        <p>Vestis reserves the right to interpret and enforce these Guidelines at its sole discretion.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">2. General Conduct Expectations</h2>
        <p>Users must act respectfully and lawfully at all times.</p>
        <p>You may not use the Platform to engage in conduct that is harmful, abusive, unlawful, deceptive, threatening, discriminatory, exploitative, or otherwise inconsistent with community safety.</p>
        <p>Users are responsible for all content they upload, share, or communicate.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">3. Harassment and Bullying</h2>
        <p>The following conduct is strictly prohibited:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harassment, including repeated unwanted messages.</li>
          <li>Bullying, intimidation, or humiliation of other users.</li>
          <li>Threats of violence or harm.</li>
          <li>Targeted abuse based on appearance, gender, race, religion, disability, sexual orientation, or other protected characteristics.</li>
          <li>Encouraging self-harm or harmful behaviour.</li>
        </ul>
        <p>Vestis may suspend or permanently remove accounts engaged in harassment.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">4. Child Safety and Protection</h2>
        <p>Because the Platform permits users under 16, Vestis maintains a zero-tolerance policy toward exploitation or endangerment of minors.</p>
        <p>The following conduct is strictly prohibited:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sexual grooming behaviour.</li>
          <li>Soliciting explicit images from minors.</li>
          <li>Sharing sexually suggestive content involving minors.</li>
          <li>Attempting to obtain personal information from minors for exploitative purposes.</li>
          <li>Encouraging minors to move conversations to external platforms for inappropriate reasons.</li>
        </ul>
        <p>Vestis may cooperate with law enforcement and report suspected illegal conduct.</p>
        <p>Accounts found engaging in exploitative behaviour will be permanently banned.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">5. Sexual Content</h2>
        <p>The Platform is designed as a wardrobe and fashion application and is not intended for sexual content.</p>
        <p>Users may not upload or share:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Explicit nudity.</li>
          <li>Pornographic material.</li>
          <li>Sexually explicit messaging.</li>
          <li>Sexual solicitation.</li>
          <li>Sexually suggestive content involving minors under any circumstances.</li>
        </ul>
        <p>Content that is artistic or fashion-related but contains partial nudity may be reviewed on a case-by-case basis at Vestis' discretion.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">6. Image Uploads and Visual Content</h2>
        <p>Users may upload wardrobe-related images for styling purposes.</p>
        <p>Uploaded images must not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Contain illegal material.</li>
          <li>Contain copyrighted content without permission.</li>
          <li>Depict individuals without consent.</li>
          <li>Include hidden malicious content.</li>
        </ul>
        <p>Vestis reserves the right to remove images that violate safety or intellectual property standards.</p>
        <p>Repeated violations may result in account termination.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">7. Messaging Behaviour</h2>
        <p>Messaging features are provided to enable positive and safe social interaction.</p>
        <p>Users may not use messaging to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harass or intimidate.</li>
          <li>Send spam or unsolicited promotions.</li>
          <li>Impersonate others.</li>
          <li>Attempt fraud or phishing.</li>
          <li>Send explicit content.</li>
          <li>Circumvent platform safety mechanisms.</li>
        </ul>
        <p>Vestis does not guarantee real-time monitoring of messages but may investigate reports of abuse.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">8. Impersonation and Misrepresentation</h2>
        <p>Users may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Impersonate another individual.</li>
          <li>Create fake profiles.</li>
          <li>Misrepresent identity for deceptive purposes.</li>
          <li>Falsely claim affiliation with Vestis or other organisations.</li>
        </ul>
        <p>Accounts engaged in impersonation may be permanently banned.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">9. Hateful or Discriminatory Conduct</h2>
        <p>The Platform does not permit content that promotes hatred or violence based on protected characteristics.</p>
        <p>Prohibited content includes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hate speech.</li>
          <li>Extremist propaganda.</li>
          <li>Incitement to violence.</li>
          <li>Dehumanising language directed at individuals or groups.</li>
        </ul>
        <p>Vestis may remove such content immediately and terminate accounts.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">10. Illegal Activity</h2>
        <p>Users may not use the Platform to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Engage in fraud.</li>
          <li>Distribute malware.</li>
          <li>Coordinate unlawful conduct.</li>
          <li>Sell illegal goods or services.</li>
          <li>Violate applicable laws.</li>
        </ul>
        <p>Vestis may cooperate with authorities in investigations.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">11. Platform Integrity and Security</h2>
        <p>Users may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Attempt to reverse engineer the Platform.</li>
          <li>Use bots or automated scraping tools.</li>
          <li>Circumvent security controls.</li>
          <li>Attempt to exploit technical vulnerabilities.</li>
          <li>Interfere with server infrastructure.</li>
        </ul>
        <p>Accounts engaging in such behaviour may be permanently banned.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">12. Intellectual Property Respect</h2>
        <p>Users must respect intellectual property rights.</p>
        <p>You may not upload copyrighted images, brand logos, or proprietary content without proper rights or permission.</p>
        <p>Vestis maintains a takedown process for intellectual property complaints.</p>
        <p>Repeat infringers may be removed from the Platform.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">13. Reporting Violations</h2>
        <p>Users may report violations through the in-app reporting mechanism.</p>
        <p>Reports may include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harassment.</li>
          <li>Inappropriate content.</li>
          <li>Child safety concerns.</li>
          <li>Impersonation.</li>
          <li>Copyright infringement.</li>
        </ul>
        <p>Vestis may review reports and take action at its discretion.</p>
        <p>False or malicious reporting may result in enforcement action.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">14. Moderation and Enforcement</h2>
        <p>Vestis may take the following actions:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Content removal.</li>
          <li>Messaging restrictions.</li>
          <li>Temporary suspension.</li>
          <li>Permanent account termination.</li>
          <li>Device-level bans in severe cases.</li>
        </ul>
        <p>Vestis is not obligated to provide advance notice before enforcement.</p>
        <p>Moderation decisions are final, though users may request review through support channels.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">15. Appeals Process</h2>
        <p>Users whose content or accounts are removed may submit an appeal.</p>
        <p>Vestis will review appeals in good faith but reserves final discretion.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">16. Off-Platform Conduct</h2>
        <p>In cases where off-platform conduct poses a credible risk to user safety or the integrity of the Platform, Vestis may take enforcement action.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">17. Commercial Solicitation</h2>
        <p>Users may not use the Platform to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Promote products.</li>
          <li>Conduct marketing campaigns.</li>
          <li>Send unsolicited advertisements.</li>
          <li>Sell goods or services without permission.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground pt-2">18. Evasion of Enforcement</h2>
        <p>Users may not create new accounts to circumvent suspension or bans.</p>
        <p>Such accounts may be immediately terminated.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">19. Changes to Guidelines</h2>
        <p>Vestis may update these Guidelines as necessary to reflect legal, safety, or operational requirements.</p>
        <p>Continued use of the Platform constitutes acceptance of updates.</p>

        <h2 className="text-base font-semibold text-foreground pt-2">20. Our Commitment</h2>
        <p>Vestis is committed to maintaining a safe, inclusive, and creative environment.</p>
        <p>However, we cannot guarantee that all user behaviour will be compliant at all times.</p>
        <p>Users share responsibility for maintaining a respectful community.</p>
      </div>
    </div>
  );
}
