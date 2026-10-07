/**
 * Terms of Service — the legally binding text, in English (the governing language, §22.6).
 * Business rules quoted here come from lib/legal.ts (kept in sync with the API's domain rules).
 * ⚠ Before launch: complete the [BRACKETED] values in lib/legal.ts and have a US-licensed attorney
 * review this text, in particular §8 (non-circumvention fees) and §19 (arbitration).
 */
import { B, Caps, L, P, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY, NON_CIRCUMVENTION as NC, PLATFORM_RULES as R } from "@/lib/legal";

export type TermsSection = LegalSection;

const fee = `US$${NC.minimumFeeUsd.toLocaleString("en-US")}`;

export const termsSections: TermsSection[] = [
  {
    id: "agreement",
    title: "1. Agreement to these Terms",
    body: (
      <>
        <P>
          These Terms of Service (the “<B>Terms</B>”) form a legally binding agreement between you and {COMPANY.legalName}, a limited liability company organized under the
          laws of the State of {COMPANY.state}, United States (“<B>Amerivo</B>”, “<B>we</B>”, “<B>us</B>”), which operates the website {COMPANY.website}, its applications and
          related services (together, the “<B>Platform</B>”).
        </P>
        <P>
          By creating an account, ticking the box “I accept the Terms of Service”, booking or teaching a lesson, or otherwise using the Platform, you confirm that you have read,
          understood and agree to be bound by these Terms and by our Privacy Policy, which is incorporated by reference. If you do not agree, you must not use the Platform.
        </P>
        <Caps>
          Section 19 contains a binding arbitration agreement and a class-action waiver that affect how disputes with Amerivo are resolved. Please read it carefully.
        </Caps>
      </>
    ),
  },
  {
    id: "definitions",
    title: "2. Definitions",
    body: (
      <L
        items={[
          <>
            “<B>User</B>” means any person with an Amerivo account: a <B>Student</B> (who books lessons) or a <B>Teacher</B> (who has been approved by Amerivo to give lessons).
          </>,
          <>
            “<B>Lesson</B>” means a live one-to-one video session booked through the Platform ({R.lessonMinutes} minutes, or {R.trialMinutes} minutes for a trial lesson).
          </>,
          <>
            “<B>Content</B>” means any text, message, note, review, profile information, photo, video link, document or other material that a User submits to the Platform.
          </>,
          <>
            “<B>Contact Details</B>” means any information that allows a User to be contacted outside the Platform, including e-mail addresses, telephone numbers, postal
            addresses, links to websites or booking pages, social media or messaging-app usernames, and any attempt to disguise them (for example “name at gmail dot com” or
            numbers written in words).
          </>,
        ]}
      />
    ),
  },
  {
    id: "eligibility",
    title: "3. Eligibility and accounts",
    body: (
      <>
        <L
          items={[
            <>
              You must be at least <B>{R.minStudentAge} years old</B> to use the Platform. If you are under 18 (or the age of majority where you live), you may use the Platform
              only with the consent and under the supervision of a parent or legal guardian, who accepts these Terms on your behalf and is responsible for your use of the
              Platform. Teachers must be at least 18 years old.
            </>,
            <>You must provide accurate, current and complete information, keep it up to date, and use your real identity. One person may hold only one account.</>,
            <>
              You are responsible for keeping your login credentials confidential and for all activity on your account. Tell us immediately at {COMPANY.email} if you suspect
              unauthorized use.
            </>,
            <>
              You may not use the Platform if you are barred from doing so under the laws of the United States or of your country, including U.S. economic sanctions and export
              control laws.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "role",
    title: "4. Amerivo’s role",
    body: (
      <>
        <P>
          Amerivo provides a marketplace that allows Students to find, book and pay for live English lessons with independent Teachers, and the tools to hold those lessons
          (classroom, messaging, notes, reports). Amerivo selects and approves Teachers (identity verification, introduction video and interview) but does not supervise the
          content of each Lesson.
        </P>
        <P>
          <B>Teachers are independent contractors</B>, not employees, agents or partners of Amerivo. Each Teacher decides how to teach, within these Terms and the Platform
          rules, and is solely responsible for the lessons they give and for complying with the laws that apply to them, including tax obligations.
        </P>
      </>
    ),
  },
  {
    id: "payments",
    title: "5. Bookings, prices, payments and refunds",
    body: (
      <>
        <L
          items={[
            <>
              Teachers set their price per lesson between US${R.minPriceUsd} and US${R.maxPriceUsd}. Prices are shown and charged in U.S. dollars. Packages of 5 or 10
              lessons, when offered, include the discount shown at checkout. A free {R.trialMinutes}-minute trial lesson may be offered by a Teacher.
            </>,
            <>
              Payments are collected by Amerivo through its payment processor (Stripe) at the time of booking. A booking is confirmed only when the payment succeeds. Your bank may
              charge foreign-exchange or other fees.
            </>,
            <>
              <B>Cancellation by a Student:</B> more than {R.freeCancellationHours} hours before the start of the lesson, the lesson is refunded in full; less than{" "}
              {R.freeCancellationHours} hours before, it is not refunded. A Student who does not attend a lesson is not refunded.
            </>,
            <>
              <B>Cancellation by a Teacher</B> (or by Amerivo): the Student is refunded in full. Repeated cancellations by a Teacher may lead to a warning, suspension or removal.
            </>,
            <>
              <B>Problems with a lesson:</B> a Student may report a problem through the Platform within {R.disputeWindowHours} hours after the lesson ended. Amerivo reviews the
              report and decides, in good faith, whether a full or partial refund is due. Refunds are issued to the original payment method.
            </>,
            <>Lesson packages are personal to the Student and must be used with the Teacher they were bought for.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "conduct",
    title: "6. Code of conduct",
    body: (
      <>
        <P>You agree to treat every member of the Amerivo community with respect. In particular, you will not:</P>
        <L
          items={[
            "harass, threaten, bully, insult, discriminate against or intimidate anyone, including on the basis of race, ethnicity, national origin, religion, sex, gender identity, sexual orientation, age or disability;",
            "share, request or show sexual, violent, hateful or otherwise inappropriate content; any sexual content or contact involving a minor is strictly forbidden and will be reported to the competent authorities;",
            "record, photograph or capture a Lesson or another User’s image or voice without that person’s prior consent;",
            "impersonate anyone, create false accounts, post false reviews or manipulate ratings;",
            "share your account, sell or transfer it, or let another person take lessons or teach in your place;",
            "use the Platform for any illegal purpose, for spam or unsolicited advertising, or to recruit Users for another service;",
            "share Contact Details or try to move lessons or payments outside the Platform (see Section 8).",
          ]}
        />
      </>
    ),
  },
  {
    id: "monitoring",
    title: "7. Safety, moderation and monitoring of communications",
    body: (
      <>
        <P>To protect Students (some of whom are minors), Teachers and the integrity of the Platform, you acknowledge and agree that:</P>
        <L
          items={[
            <>
              <B>Messages, classroom chat, shared lesson notes, lesson reports, reviews, profiles and documents are stored by Amerivo and automatically screened</B> for Contact
              Details and other violations of these Terms. Contact Details are hidden automatically before the other User sees them.
            </>,
            <>
              Content that is flagged by our systems, or reported by a User, may be <B>reviewed by authorized Amerivo staff</B>, together with the surrounding conversation, in
              order to enforce these Terms, to investigate a dispute or a safety concern, or to comply with the law.
            </>,
            <>
              Documents that a Teacher wishes to share with Students are <B>reviewed and approved by Amerivo before they are made available</B>. Amerivo may refuse or remove
              any document at its discretion.
            </>,
            <>
              Video and audio of Lessons are transmitted through our video provider and are <B>not recorded</B> by Amerivo.
            </>,
            <>Amerivo may hide, edit or remove any Content, and may restrict any account, that it reasonably believes violates these Terms.</>,
          ]}
        />
        <P>How we process this information, how long we keep it and your rights are described in our Privacy Policy.</P>
      </>
    ),
  },
  {
    id: "non-circumvention",
    title: "8. Non-circumvention: no sharing of contact details, no off-platform lessons",
    body: (
      <>
        <P>
          Amerivo invests in finding, verifying and connecting Students and Teachers, and is paid only through lessons booked on the Platform. For this reason, and for your
          safety, you agree that:
        </P>
        <L
          items={[
            <>
              You will <B>not share, request or publish Contact Details</B> in any message, chat, note, report, review, profile, document or video, and will not use any trick
              to get around our filters.
            </>,
            <>
              During your relationship on the Platform and for <B>{NC.months} months</B> after your last lesson or message with a User you met through Amerivo, you will{" "}
              <B>not book, give, take or pay for English lessons or similar services with that User outside the Platform</B>, and will not solicit or accept such an
              arrangement.
            </>,
            <>All payments for lessons with a User you met through Amerivo must be made through the Platform. Teachers must never ask for or accept direct payment.</>,
          ]}
        />
        <P>
          <B>Consequences of a breach.</B> If you breach this Section, Amerivo may, depending on the seriousness and repetition of the breach: (a) hide the Content and send you
          a warning; (b) suspend or permanently close your account; (c) for Teachers, withhold and set off unpaid earnings against the amounts owed under this Section; and
          (d) charge you the <B>non-circumvention fee</B> described below.
        </P>
        <P>
          <B>Non-circumvention fee.</B> Because the harm caused to Amerivo by off-platform lessons is real but difficult to calculate precisely, you agree that, for each
          Student–Teacher relationship moved outside the Platform in breach of this Section, you will pay Amerivo, as liquidated damages and not as a penalty, the greater of (i){" "}
          <B>{fee}</B> or (ii) <B>{NC.feePercent}%</B> of all amounts paid or payable for lessons between those Users outside the Platform during the {NC.months}-month period
          described above. You agree that this amount is a reasonable estimate of Amerivo’s lost commission and costs. This fee does not limit any other remedy available to
          Amerivo under these Terms or the law, including injunctive relief.
        </P>
        <P>If another User asks you to communicate or pay outside Amerivo, please decline and report it with the “Report” button (in your messages or in the classroom) or to {COMPANY.email}. Reports are treated confidentially.</P>
      </>
    ),
  },
  {
    id: "content",
    title: "9. Your content and teaching materials",
    body: (
      <>
        <L
          items={[
            "You keep ownership of the Content you submit. You grant Amerivo a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, adapt (for example to hide Contact Details or to translate) and distribute your Content for the purpose of operating, improving and promoting the Platform. For Teachers, this includes displaying your name, photo, introduction video, profile and ratings.",
            "You confirm that you have all the rights needed for the Content you submit, and that it does not infringe anyone’s copyright, trademark, privacy or other rights. Teachers may share only documents they created or are licensed to share with their Students.",
            "Teaching documents are visible only to the Teacher’s Students and only after approval by Amerivo. Students may use them for their own learning and may not redistribute them.",
            <>
              <B>Copyright complaints (DMCA).</B> If you believe that Content on the Platform infringes your copyright, send a notice complying with 17 U.S.C. §512(c)(3) to our
              designated agent: {COMPANY.dmcaAgent}, or {COMPANY.email}. We remove infringing Content and terminate the accounts of repeat infringers.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "teachers",
    title: "10. Additional terms for Teachers",
    body: (
      <L
        items={[
          "You must pass identity verification and Amerivo’s review before teaching. Amerivo may approve, refuse, suspend or remove a Teacher profile at its discretion.",
          "Your profile, qualifications, certificates and introduction video must be truthful and your own. The introduction video must be a YouTube, Vimeo, Loom or Google Drive link and must not contain Contact Details.",
          "You must keep your availability up to date, be on time, give the full lesson booked, and write the lesson report after each lesson.",
          <>
            Amerivo retains a platform commission of <B>{R.commissionPercent}%</B> of the price paid for each lesson. Your net earnings become available once the lesson is completed
            and are paid through our payment provider automatically on the {R.payoutDay}th of each month or earlier on request (minimum US${R.minWithdrawalUsd}), subject to
            the provider’s terms and identity requirements. Earnings for a lesson that is later refunded may be reversed.
          </>,
          "You are solely responsible for your taxes and social contributions. Amerivo may request tax forms (such as IRS Form W-9 or W-8BEN) and may issue tax reporting forms as required by law.",
          "Amerivo may refund a Student and reverse the corresponding earnings when a lesson was not given as booked, in case of a valid dispute, or in case of a breach of these Terms.",
        ]}
      />
    ),
  },
  {
    id: "students",
    title: "11. Additional terms for Students",
    body: (
      <L
        items={[
          "Lessons are for your personal learning. Be on time and use a suitable device, camera, microphone and internet connection.",
          "Placement tests, level estimates and recommendations are provided for guidance only and are not official certifications.",
          "Reviews must be honest, based on a lesson you actually took, and must not contain Contact Details, insults or personal information.",
        ]}
      />
    ),
  },
  {
    id: "ip",
    title: "12. Amerivo’s intellectual property",
    body: (
      <P>
        The Platform, its software, design, texts, placement tests, logos and the Amerivo name are owned by Amerivo or its licensors and are protected by intellectual property
        laws. Amerivo grants you a limited, personal, revocable, non-transferable license to use the Platform in accordance with these Terms. You may not copy, scrape,
        reverse-engineer, resell or create derivative works from the Platform, or use automated means to access it, without our written permission.
      </P>
    ),
  },
  {
    id: "security",
    title: "13. Security and acceptable use",
    body: (
      <P>
        You will not attempt to gain unauthorized access to the Platform or to other accounts, test or bypass its security, introduce malware, overload the service, or interfere
        with its operation. Report security issues to {COMPANY.email}.
      </P>
    ),
  },
  {
    id: "termination",
    title: "14. Suspension and termination",
    body: (
      <>
        <P>
          You may close your account at any time by contacting us. Amerivo may suspend or terminate your account, remove Content, cancel upcoming bookings or withhold payouts,
          with or without notice, if we reasonably believe that you have breached these Terms, created a risk for other Users or for Amerivo, or if required by law.
        </P>
        <P>
          Sections that by their nature should survive (including Sections 8, 9, 15 to 19 and 22) survive termination. Amounts owed to Amerivo remain due after termination.
        </P>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "15. Disclaimers",
    body: (
      <Caps>
        The Platform is provided “as is” and “as available”. To the fullest extent permitted by law, Amerivo disclaims all warranties, express or implied, including
        merchantability, fitness for a particular purpose, title and non-infringement. Amerivo does not guarantee any particular learning result, test score, visa or
        employment outcome, nor that the Platform will be uninterrupted, secure or error-free.
      </Caps>
    ),
  },
  {
    id: "liability",
    title: "16. Limitation of liability",
    body: (
      <Caps>
        To the fullest extent permitted by law, Amerivo and its members, managers, employees and agents will not be liable for any indirect, incidental, special,
        consequential, exemplary or punitive damages, or for any loss of profits, data or goodwill. Amerivo’s total liability for any claim relating to the Platform or these
        Terms is limited to the greater of (a) the amounts you paid to Amerivo in the twelve (12) months before the event giving rise to the claim and (b) one hundred U.S.
        dollars (US$100). Some jurisdictions do not allow these limitations, in which case they apply only to the extent permitted.
      </Caps>
    ),
  },
  {
    id: "indemnity",
    title: "17. Indemnification",
    body: (
      <P>
        You agree to defend, indemnify and hold harmless Amerivo and its members, managers, employees and agents from any claim, loss, liability, damage, cost or expense
        (including reasonable attorneys’ fees) arising out of your Content, your lessons, your use of the Platform, or your breach of these Terms or of any law or third-party
        right.
      </P>
    ),
  },
  {
    id: "law",
    title: "18. Governing law",
    body: (
      <P>
        These Terms are governed by the laws of the State of {COMPANY.state} and the federal laws of the United States, without regard to conflict-of-law rules. The United
        Nations Convention on Contracts for the International Sale of Goods does not apply. Nothing in these Terms removes mandatory consumer protections that you may have
        under the laws of the country where you live.
      </P>
    ),
  },
  {
    id: "disputes",
    title: "19. Dispute resolution, arbitration and class-action waiver",
    body: (
      <>
        <P>
          <B>Informal resolution first.</B> Before starting any proceeding, you agree to contact us at {COMPANY.email} and to try to resolve the dispute informally for at least
          thirty (30) days.
        </P>
        <P>
          <B>Binding arbitration.</B> Except for claims that qualify for small-claims court and claims for injunctive relief to protect intellectual property or to stop a
          breach of Section 8, any dispute arising out of or relating to these Terms or the Platform will be resolved by final and binding arbitration administered by the
          American Arbitration Association under its Consumer Arbitration Rules (or its Commercial Arbitration Rules for disputes with Teachers), by a single arbitrator. The
          arbitration may be held by video conference; any in-person hearing will take place in {COMPANY.county}, {COMPANY.state}, unless the parties agree otherwise. Judgment
          on the award may be entered in any court of competent jurisdiction.
        </P>
        <Caps>
          You and Amerivo agree that each may bring claims against the other only in an individual capacity, and not as a plaintiff or class member in any purported class,
          collective or representative proceeding. You and Amerivo waive any right to a jury trial.
        </Caps>
        <P>
          <B>Opt-out.</B> You may opt out of this arbitration agreement by e-mailing {COMPANY.email} within thirty (30) days after first accepting these Terms, stating your
          name, account e-mail and that you opt out of arbitration. If you opt out, or if this Section is found unenforceable, disputes will be resolved exclusively in the
          state or federal courts located in {COMPANY.county}, {COMPANY.state}, and you consent to their personal jurisdiction.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "20. Changes to these Terms",
    body: (
      <P>
        We may update these Terms from time to time. We will inform you of material changes by e-mail or on the Platform, and ask you to accept the new version before you
        continue to use your account. If you do not agree with the changes, you must stop using the Platform and may close your account. The version in force is the one
        identified by the effective date at the top of this page.
      </P>
    ),
  },
  {
    id: "notices",
    title: "21. Notices and electronic communications",
    body: (
      <P>
        You agree to receive communications from Amerivo electronically (e-mail, in-app notifications), and that these satisfy any legal requirement that communications be in
        writing. Notices to Amerivo must be sent to {COMPANY.email}.
      </P>
    ),
  },
  {
    id: "general",
    title: "22. General provisions",
    body: (
      <L
        items={[
          "Entire agreement: these Terms and the Privacy Policy are the entire agreement between you and Amerivo about the Platform.",
          "Severability: if any provision is held invalid or unenforceable, it will be limited to the minimum extent necessary and the remaining provisions remain in full force.",
          "No waiver: our failure to enforce a provision is not a waiver of our right to do so later.",
          "Assignment: you may not transfer your rights or obligations under these Terms. Amerivo may assign them, including in connection with a merger, acquisition or sale of assets.",
          "Force majeure: Amerivo is not liable for delays or failures caused by events beyond its reasonable control.",
          "Language: these Terms are written in English. Translations are provided for convenience only; in case of conflict, the English version prevails.",
        ]}
      />
    ),
  },
  {
    id: "contact",
    title: "23. Contact",
    body: (
      <P>
        {COMPANY.legalName} · {COMPANY.location} · {COMPANY.email} · {COMPANY.phone}
      </P>
    ),
  },
];
