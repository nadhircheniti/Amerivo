import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { availabilityRules, blockedDates, teacherApplications, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { webOrigin } from "../../common/cors";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { assertValidPrice } from "../../domain/pricing";
import { videoEmbedUrl } from "../../domain/video";
import { StripeService } from "../../integrations/stripe.service";
import { ModerationService } from "../moderation/moderation.service";

export interface TeacherProfileInput {
  headline?: string;
  bio?: string;
  city?: string;
  gender?: "female" | "male" | "other" | null;
  timezone?: string;
  education?: string;
  yearsExperience?: number;
  specialties?: string[];
  teaches?: string[];
  languages?: { language: string; level: string }[];
  certifications?: { name: string; fileUrl?: string }[];
  priceCents?: number;
  offersPack5?: boolean;
  offersPack10?: boolean;
  offersTrial?: boolean;
  introVideoUrl?: string | null;
  interviewPreference?: string;
}

/** Fields of the application that live on the user account. */
export interface ApplicantInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
}

type IdentityState = "not_started" | "pending" | "verified" | "failed";
/** Stripe Identity session status → our identity status. */
const identityFromStripe = (s: string): IdentityState =>
  s === "verified" ? "verified" : s === "processing" ? "pending" : s === "requires_input" ? "failed" : "not_started";

/** Teacher application (spec §4): draft → pending (submitted) → approved / rejected. */
@Injectable()
export class ApplicationsService {
  private readonly log = new Logger(ApplicationsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly stripe: StripeService,
    private readonly moderation: ModerationService,
  ) {}

  /** Everything the teacher sees about their own profile: application, settings, availability. */
  async getOwn(teacherId: string) {
    const [row] = await this.db
      .select({
        profile: teacherProfiles,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        country: users.country,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(eq(teacherProfiles.userId, teacherId));
    if (!row) throw notFound("Teacher profile");
    const [rules, blocked, [latest]] = await Promise.all([
      this.db.select().from(availabilityRules).where(eq(availabilityRules.teacherId, teacherId)),
      this.db.select().from(blockedDates).where(eq(blockedDates.teacherId, teacherId)),
      this.db
        .select({ decision: teacherApplications.decision, adminNotes: teacherApplications.adminNotes, decidedAt: teacherApplications.decidedAt, interviewRequestedAt: teacherApplications.interviewRequestedAt, submittedAt: teacherApplications.submittedAt })
        .from(teacherApplications)
        .where(eq(teacherApplications.teacherId, teacherId))
        .orderBy(desc(teacherApplications.createdAt))
        .limit(1),
    ]);
    const { stripeIdentitySessionId: _s, stripeAccountId: _a, paypalEmail: _p, ...profile } = row.profile;
    return {
      ...profile,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      country: row.country,
      availability: rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
      blockedDates: blocked,
      // Message from the admin shown to the applicant (rejection reason, interview request…)
      review: latest ?? null,
    };
  }

  async updateProfile(teacherId: string, input: TeacherProfileInput & ApplicantInput) {
    const { firstName, lastName, phone, country, ...profile } = input;
    if (profile.priceCents !== undefined) assertValidPrice(profile.priceCents);
    if (profile.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: profile.timezone });
      } catch {
        throw badRequest("Invalid time zone");
      }
    }
    if (profile.introVideoUrl && !videoEmbedUrl(profile.introVideoUrl)) {
      throw badRequest("The introduction video must be a YouTube, Vimeo, Loom or Google Drive link that anyone with the link can watch");
    }
    const [current] = await this.db.select({ status: teacherProfiles.status }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!current) throw notFound("Teacher profile");
    if (current.status === "suspended") throw forbidden("This teacher account is suspended");
    // The profile is public: no e-mail, phone, links or handles in it (Terms §8).
    await this.moderation.rejectContactDetails(
      { id: teacherId },
      {
        headline: profile.headline,
        bio: profile.bio,
        city: profile.city,
        education: profile.education,
        certifications: profile.certifications?.map((c) => c.name).join("\n"),
      },
      "profile",
    );
    const userPatch = Object.fromEntries(Object.entries({ firstName, lastName, phone, country }).filter(([, v]) => v !== undefined));
    return this.db.transaction(async (tx) => {
      if (Object.keys(userPatch).length) await tx.update(users).set(userPatch).where(eq(users.id, teacherId));
      const [row] = Object.keys(profile).length
        ? await tx.update(teacherProfiles).set(profile).where(eq(teacherProfiles.userId, teacherId)).returning()
        : await tx.select().from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
      return { status: row.status };
    });
  }

  async submit(teacherId: string) {
    const [t] = await this.db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher profile");
    if (t.status !== "draft" && t.status !== "rejected") throw forbidden(`Application is already ${t.status}`);
    const missing = [
      !t.headline && "headline",
      !t.bio && "bio",
      !t.specialties.length && "what you can teach",
      !t.introVideoUrl && "2-minute introduction video",
      t.identityStatus === "not_started" && "identity verification",
    ].filter(Boolean);
    if (missing.length) throw badRequest(`Please complete: ${missing.join(", ")}`);
    await this.db.transaction(async (tx) => {
      await tx.update(teacherProfiles).set({ status: "pending" }).where(eq(teacherProfiles.userId, teacherId));
      await tx.insert(teacherApplications).values({ teacherId, submittedAt: this.clock.now() });
    });
    return { status: "pending" as const };
  }

  /* ------------------------------------------------------------ identity (Stripe Identity) */
  /** Starts an ID + selfie check on Stripe's page; the teacher comes back to the application. */
  async startIdentity(teacherId: string) {
    const [t] = await this.db.select({ identityStatus: teacherProfiles.identityStatus }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher profile");
    if (t.identityStatus === "verified") throw badRequest("Your identity is already verified");
    const session = await this.stripe.identitySession({ teacherId, returnUrl: `${webOrigin()}/teach/apply?step=identity` });
    await this.db.update(teacherProfiles).set({ stripeIdentitySessionId: session.id, identityStatus: "pending" }).where(eq(teacherProfiles.userId, teacherId));
    return { url: session.url };
  }

  /** Reads the result from Stripe (when the teacher comes back, without waiting for the webhook). */
  async syncIdentity(teacherId: string) {
    const [t] = await this.db
      .select({ identityStatus: teacherProfiles.identityStatus, sessionId: teacherProfiles.stripeIdentitySessionId })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher profile");
    if (!t.sessionId || t.identityStatus === "verified" || !this.stripe.isConfigured()) return { identityStatus: t.identityStatus };
    const session = await this.stripe.retrieveIdentitySession(t.sessionId);
    const identityStatus = identityFromStripe(session.status);
    await this.db.update(teacherProfiles).set({ identityStatus }).where(eq(teacherProfiles.userId, teacherId));
    return { identityStatus, reason: session.last_error?.code ?? null };
  }

  /** Stripe webhook: identity.verification_session.* events. */
  async onIdentityEvent(session: { id: string; status: string; metadata?: Record<string, string> | null }) {
    const identityStatus = identityFromStripe(session.status);
    const teacherId = session.metadata?.teacherId;
    const where = teacherId
      ? and(eq(teacherProfiles.userId, teacherId), eq(teacherProfiles.stripeIdentitySessionId, session.id))
      : eq(teacherProfiles.stripeIdentitySessionId, session.id);
    const rows = await this.db.update(teacherProfiles).set({ identityStatus }).where(where).returning({ id: teacherProfiles.userId });
    if (!rows.length) this.log.warn(`Identity session ${session.id} not linked to a teacher`);
    return { updated: rows.length, identityStatus };
  }
}
