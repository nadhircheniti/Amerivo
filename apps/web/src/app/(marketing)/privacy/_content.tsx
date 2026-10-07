/**
 * Privacy Policy — text supplied by the client (Amerivo English LLC, Indiana), completed so that it
 * matches what the platform really does (see the "[Added]" notes in the git history / PR):
 * - §2: payment processor named (Stripe) — it was left blank;
 * - §5 and new §7: automated screening of messages, chat, notes and documents (Terms §7–8);
 * - §7: concrete service providers used by the code (Clerk, Stripe, Daily, Resend, Render, Vercel, Neon);
 * - §11: Terms-acceptance evidence (version, date, IP address);
 * - §16: students aged 13–17 with parental consent (the platform accepts 13+);
 * - lessons are not recorded (Daily rooms are created without recording).
 * ⚠ To be reviewed by a US-licensed attorney together with the Terms of Service.
 */
import { B, H3, L, P, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY } from "@/lib/legal";

const Email = () => (
  <a href={`mailto:${COMPANY.email}`} className="font-semibold text-teal-dark hover:text-navy">
    {COMPANY.email}
  </a>
);

export const privacySections: LegalSection[] = [
  {
    id: "intro",
    title: "Introduction",
    body: (
      <>
        <P>
          Amerivo English (“<B>Amerivo</B>,” “<B>we</B>,” “<B>us</B>,” or “<B>our</B>”) operates an online language-learning marketplace that connects students with language
          teachers and provides tools for scheduling, communication, payments, and online lessons.
        </P>
        <P>
          This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use our website, platform, applications, and related services
          (collectively, the “<B>Services</B>”).
        </P>
        <P>By using the Services, you acknowledge that you have read and understood this Privacy Policy.</P>
      </>
    ),
  },
  {
    id: "who-we-are",
    title: "1. Who We Are",
    body: (
      <>
        <P>Amerivo is operated by:</P>
        <P>
          <B>{COMPANY.legalName}</B>
          <br />
          {COMPANY.state}, United States
          <br />
          Privacy contact: <Email />
        </P>
        <P>For purposes of applicable data-protection laws, Amerivo may act as the controller/business responsible for personal information collected through the Services.</P>
        <P>
          If you have questions about this Privacy Policy or your personal information, contact us at <Email />.
        </P>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    body: (
      <>
        <P>We collect information that you provide directly, information generated when you use the Services, and information received from certain third parties.</P>
        <H3>A. Information You Provide</H3>
        <P>Depending on how you use Amerivo English, we may collect:</P>
        <L
          items={[
            <>
              <B>Account information:</B> full name, email address, password (handled by our authentication provider — we never see it in plain text), phone number, date of
              birth or age information where necessary, profile photo, country and native language.
            </>,
            <>
              <B>Teacher information:</B> biography, languages spoken and taught, teaching experience, education and qualifications, certifications, teaching preferences,
              lesson rates, availability, introductory videos, professional profile information, and information necessary to verify teacher identity or qualifications.
            </>,
            <>
              <B>Student information:</B> languages being learned, learning goals, preferred lesson times, skill level (including placement-test answers and results), and
              preferences provided through your profile.
            </>,
            <>
              <B>Transaction information:</B> lessons purchased, booking information, refunds, payment status, and payout information for teachers. We generally do not store
              complete payment-card numbers. Payment information is processed directly by our payment processor, <B>Stripe</B>.
            </>,
            <>
              <B>Communications and content:</B> messages sent through Amerivo English, classroom chat and shared lesson notes, lesson reports, documents shared by teachers,
              customer-support communications, feedback, reviews, reports of inappropriate behavior, and information you provide when contacting us.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "collected-automatically",
    title: "3. Information Collected Automatically",
    body: (
      <>
        <P>When you use Amerivo, we may automatically collect certain technical and usage information, including:</P>
        <L
          items={[
            "IP address",
            "Browser type, device type and operating system",
            "Approximate location derived from IP address",
            "Pages viewed, features used and referring website",
            "Date and time of activity and login information",
            "Platform performance information",
            "Cookies and similar technologies",
          ]}
        />
        <P>We use this information to operate, secure, analyze, and improve the Services.</P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "4. Cookies and Similar Technologies",
    body: (
      <>
        <P>Amerivo may use cookies, local storage, and similar technologies to:</P>
        <L
          items={[
            "Keep you signed in (cookies set by our authentication provider)",
            "Remember preferences, such as your language",
            "Maintain security and prevent fraud (including during payment)",
            "Understand how users interact with the Services",
            "Improve website performance",
          ]}
        />
        <P>
          Where required by applicable law, we will request consent before using non-essential cookies or similar technologies. You may control cookies through your browser
          and, where applicable, our cookie-consent tools.
        </P>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "5. How We Use Personal Information",
    body: (
      <>
        <P>We may use personal information to:</P>
        <L
          items={[
            "Create and manage accounts.",
            "Provide and operate the Services, and connect students with teachers.",
            "Process bookings, payments and refunds, and process teacher payouts.",
            "Facilitate online lessons.",
            "Provide customer support and communicate with users about their accounts, bookings, and Services.",
            "Send marketing communications where permitted by law.",
            "Personalize and improve the Services, and analyze usage and performance.",
            "Prevent fraud, abuse, and security incidents, and verify teacher identities, qualifications, or other information where applicable.",
            "Maintain platform safety and integrity, including the automated screening described in Section 6.",
            "Comply with legal obligations, enforce our agreements and policies, and protect the rights, property, and safety of Amerivo, our users, and others.",
          ]}
        />
        <P>We will not use personal information for purposes materially different from those disclosed to you without providing appropriate notice or obtaining consent where required.</P>
      </>
    ),
  },
  {
    id: "safety-screening",
    title: "6. Safety Screening of Communications",
    body: (
      <>
        <P>To protect students (some of whom are minors), teachers, and the integrity of the platform, and as described in our Terms of Service:</P>
        <L
          items={[
            "Messages, classroom chat, shared lesson notes, lesson reports, reviews, lesson topics, teacher profiles and document titles are automatically screened for contact details (e-mail addresses, phone numbers, links, social-media handles and messaging apps). Contact details are hidden before the other user sees them.",
            "When something is detected, or when a user reports inappropriate behavior, the original text and the surrounding conversation may be reviewed by authorized Amerivo staff, who may warn or suspend the account concerned.",
            "Documents that teachers wish to share with their students are reviewed by Amerivo before they are made available.",
            "Video and audio of lessons are transmitted through our video provider and are not recorded by Amerivo.",
          ]}
        />
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "7. Legal Bases for Processing Under GDPR",
    body: (
      <>
        <P>If the GDPR applies to you, we process personal information using one or more of the following legal bases:</P>
        <L
          items={[
            <>
              <B>Contract</B> — when necessary to provide the Services you request, such as creating your account, booking lessons, processing payments, and facilitating
              communication between students and teachers.
            </>,
            <>
              <B>Legal obligations</B> — when necessary to comply with applicable laws, regulations, tax and accounting requirements, court orders, or other legal obligations.
            </>,
            <>
              <B>Legitimate interests</B> — such as securing the platform, preventing fraud, screening communications for safety, improving our Services, understanding platform
              usage, communicating with users, and protecting our business and users. We consider your rights and interests when relying on legitimate interests.
            </>,
            <>
              <B>Consent</B> — where required, including for certain marketing communications, cookies, or other processing activities. You may withdraw consent at any time
              where processing is based on consent.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "sharing",
    title: "8. How We Share Personal Information",
    body: (
      <>
        <P>
          <B>We do not sell personal information.</B> We may disclose personal information to service providers and other parties when necessary to operate Amerivo:
        </P>
        <L
          items={[
            <>
              <B>Payment providers</B> — Stripe processes payments, refunds, teacher payouts and identity verification on our behalf.
            </>,
            <>
              <B>Video and communication providers</B> — Daily.co provides the video classroom; Resend sends our e-mails.
            </>,
            <>
              <B>Hosting and technology providers</B> — for example Clerk (authentication), Vercel (website hosting), Render (application hosting) and Neon (database), as well
              as providers we may use for customer support, security and error monitoring.
            </>,
            <>
              <B>Teachers and students</B> — information included in a public teacher profile may be visible to students or visitors. Students and teachers also receive the
              information necessary to schedule and conduct lessons (for example first name, lesson time and topic).
            </>,
            <>
              <B>Legal and safety purposes</B> — when reasonably necessary to comply with law, respond to lawful requests, protect our rights, investigate fraud or abuse,
              protect users or the public, or enforce our Terms of Service.
            </>,
            <>
              <B>Business transfers</B> — if Amerivo is involved in a merger, acquisition, financing, reorganization, sale of assets, bankruptcy, or similar transaction,
              personal information may be transferred as part of that transaction, subject to applicable law.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "public-profiles",
    title: "9. Teacher Profiles and Public Information",
    body: (
      <>
        <P>
          Teachers may choose or be required to provide information for their public profile, which may include their name, profile photo, biography, languages, teaching
          experience, qualifications, certifications, teaching rate, availability, reviews, and introductory video.
        </P>
        <P>Teachers should not include sensitive personal information or contact details in public profile fields. Once information is publicly displayed, it may be viewed, copied, or shared by others.</P>
      </>
    ),
  },
  {
    id: "user-content",
    title: "10. Reviews and User-Generated Content",
    body: (
      <P>
        Users may submit reviews, comments, profile information, photographs, videos, documents, or other content. Some user-generated content may be publicly visible. Do not
        submit personal or confidential information that you do not want to be publicly available.
      </P>
    ),
  },
  {
    id: "payments",
    title: "11. Payments, Payouts and Verification",
    body: (
      <>
        <P>
          Payments are processed by Stripe. Amerivo may receive information such as transaction amount, payment status, payment method type, billing information, refund
          information, and transaction identifiers. We do not have access to or store complete payment-card numbers. Stripe processes your information according to its own
          privacy policy.
        </P>
        <P>
          Teachers may be required to provide additional information to receive payments, including information required for identity verification, tax reporting, fraud
          prevention, payment processing, and regulatory compliance. Such information may be collected and processed by Amerivo and/or our payment, identity-verification, or
          financial service providers.
        </P>
        <P>When you accept our Terms of Service, we record the version accepted, the date and time, and the IP address used, as evidence of your acceptance.</P>
      </>
    ),
  },
  {
    id: "transfers",
    title: "12. International Data Transfers",
    body: (
      <P>
        Amerivo English is based in the United States and may use service providers located in the United States and other countries. If you are located in the European
        Economic Area, the United Kingdom, or another jurisdiction with restrictions on international data transfers, your personal information may be transferred outside your
        country. Where required, we will use appropriate legal mechanisms and safeguards, such as adequacy decisions, Standard Contractual Clauses, or other legally recognized
        safeguards.
      </P>
    ),
  },
  {
    id: "retention",
    title: "13. Data Retention",
    body: (
      <P>
        We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy. The retention period may depend on the
        purpose for which it was collected, whether your account remains active, legal and regulatory requirements, accounting and tax requirements, dispute resolution, fraud
        prevention, security requirements, and enforcement of our agreements. When personal information is no longer reasonably required, we may delete, anonymize, or securely
        dispose of it, subject to applicable legal requirements.
      </P>
    ),
  },
  {
    id: "security",
    title: "14. Data Security",
    body: (
      <P>
        We use reasonable administrative, technical, and organizational safeguards designed to protect personal information, which may include encryption, access controls,
        authentication systems, monitoring, security testing, restricted employee access, and secure infrastructure. However, no internet-based service can guarantee absolute
        security.
      </P>
    ),
  },
  {
    id: "gdpr-rights",
    title: "15. Your GDPR Rights",
    body: (
      <>
        <P>If the GDPR applies to you, you may have the following rights, subject to applicable legal limitations:</P>
        <L
          items={[
            "Right to access your personal information",
            "Right to correct inaccurate information",
            "Right to request deletion",
            "Right to restrict processing",
            "Right to object to certain processing",
            "Right to data portability",
            "Right to withdraw consent",
            "Rights relating to automated decision-making where applicable",
          ]}
        />
        <P>You may also have the right to lodge a complaint with a data-protection supervisory authority.</P>
        <P>
          To exercise your rights, contact <Email />. We may need to verify your identity before completing certain requests. Students can also delete their account from their
          settings page.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "16. Children’s Privacy",
    body: (
      <>
        <P>
          Amerivo is not directed to children under 13, and users must be at least 13 years old to create an account. Students aged 13 to 17 may use the Services only with the
          consent and under the supervision of a parent or legal guardian, as described in our Terms of Service.
        </P>
        <P>If we learn that we have collected personal information from a child under 13, we will take reasonable steps to delete that information.</P>
      </>
    ),
  },
  {
    id: "marketing",
    title: "17. Marketing Communications",
    body: (
      <P>
        We may send promotional emails or other marketing communications where permitted by law. You may unsubscribe by clicking the unsubscribe link in the email or by
        contacting us at <Email />. You may continue to receive transactional or service-related communications even after unsubscribing from marketing communications.
      </P>
    ),
  },
  {
    id: "third-parties",
    title: "18. Third-Party Websites and Services",
    body: (
      <P>
        Amerivo English may contain links to websites, applications, or services operated by third parties (for example video platforms used for teacher introductions). We are
        not responsible for the privacy practices of third parties and encourage you to review their privacy policies before providing them with personal information.
      </P>
    ),
  },
  {
    id: "automated-decisions",
    title: "19. Automated Decision-Making and Profiling",
    body: (
      <P>
        Amerivo may use automated systems for purposes such as fraud detection, security, the safety screening described in Section 6, placement-test level estimates,
        platform recommendations, search results, and matching students and teachers. Where required by applicable law, we will provide additional information regarding
        automated decision-making and applicable rights.
      </P>
    ),
  },
  {
    id: "changes",
    title: "20. Changes to This Privacy Policy",
    body: (
      <P>
        We may update this Privacy Policy periodically. When we make changes, we will update the “Last updated” date at the top of this Privacy Policy. Where required by law,
        we will provide additional notice or obtain consent before implementing material changes.
      </P>
    ),
  },
  {
    id: "contact",
    title: "21. Contact Us",
    body: (
      <P>
        <B>{COMPANY.legalName}</B>
        <br />
        {COMPANY.state}, United States
        <br />
        Email: <Email />
        <br />
        Phone: {COMPANY.phone}
      </P>
    ),
  },
];
