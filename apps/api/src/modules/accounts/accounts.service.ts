import { Inject, Injectable } from "@nestjs/common";
import { eq, getTableColumns } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { studentProfiles, teacherProfiles, users } from "../../db/schema";
import { badRequest, conflict } from "../../common/errors";
import { CLOCK, type Clock } from "../../common/clock";
import { isOldEnough, MIN_STUDENT_AGE } from "../../domain/age";
import { TERMS_VERSION } from "../../domain/terms";
import { clerkClient } from "../clerk";

export interface RegisterInput {
  role: "student" | "teacher";
  email: string;
  firstName: string;
  lastName: string;
  country?: string;
  nativeLanguage?: string;
  phone?: string;
  timezone: string;
  birthDate?: string;
  acceptTerms: boolean;
}

/** Evidence of acceptance kept on the account: version, time and IP address. */
export interface TermsAcceptance {
  ip?: string | null;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** E-mails listed in ADMIN_EMAILS (comma-separated) become admins when they register with that verified address. */
export function isAdminEmail(email: string | undefined, list = process.env.ADMIN_EMAILS ?? "") {
  if (!email) return false;
  const wanted = email.trim().toLowerCase();
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .some((e) => e && e === wanted);
}

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Creates the Amerivo account for a signed-in Clerk user (student sign-up or teacher application start). */
  async register(clerkId: string, registration: RegisterInput, emailVerified: boolean, acceptance: TermsAcceptance = {}) {
    const { acceptTerms, ...input } = registration;
    if (acceptTerms !== true) throw badRequest("You must accept the Terms of Service");
    const terms = { termsVersion: TERMS_VERSION, termsAcceptedAt: this.clock.now(), termsAcceptedIp: acceptance.ip ?? null };
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    } catch {
      throw badRequest("Invalid time zone");
    }
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId));
    if (existing) throw conflict("Account already exists");
    if (emailVerified && isAdminEmail(input.email)) {
      const [admin] = await this.db
        .insert(users)
        .values({ clerkId, ...input, ...terms, birthDate: input.birthDate ?? null, role: "admin", status: "active" })
        .returning();
      return admin;
    }
    if (input.role === "student") {
      if (!input.birthDate) throw badRequest("Date of birth is required");
      if (!isOldEnough(input.birthDate, this.clock.now())) throw badRequest(`You must be at least ${MIN_STUDENT_AGE} years old to use Amerivo`);
    }
    return this.db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({ clerkId, ...input, ...terms, status: input.role === "teacher" ? "pending_verification" : emailVerified ? "active" : "pending_verification" })
        .returning();
      if (input.role === "student") {
        await tx.insert(studentProfiles).values({ userId: u.id });
      } else {
        const base = slugify(`${input.firstName}-${input.lastName}`) || "teacher";
        await tx.insert(teacherProfiles).values({ userId: u.id, slug: `${base}-${u.id.slice(0, 6)}`, timezone: input.timezone, status: "draft" });
      }
      return u;
    });
  }

  async me(userId: string) {
    const [u] = await this.withTeacherStatus(userId);
    // An account created before its e-mail was added to ADMIN_EMAILS is promoted on its next visit,
    // once Clerk confirms the e-mail is verified (e-mail code, Google or Apple).
    if (u && u.role !== "admin" && isAdminEmail(u.email) && (await clerkClient.isEmailVerified(u.clerkId, u.email))) {
      await this.db.update(users).set({ role: "admin", status: "active" }).where(eq(users.id, u.id));
      return (await this.withTeacherStatus(userId))[0];
    }
    return u;
  }

  /** The account, plus the teacher's application status (draft, pending, approved…) for teachers. */
  private withTeacherStatus(userId: string) {
    return this.db
      .select({ ...getTableColumns(users), teacherStatus: teacherProfiles.status })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.id, userId));
  }

  /** The user accepts the current Terms of Service (sign-up via Google/Apple, or after the Terms changed). */
  async acceptTerms(userId: string, version: string, acceptance: TermsAcceptance = {}) {
    if (version !== TERMS_VERSION) throw badRequest("These Terms of Service are out of date. Reload the page to read the current version.");
    await this.db.update(users).set({ termsVersion: TERMS_VERSION, termsAcceptedAt: this.clock.now(), termsAcceptedIp: acceptance.ip ?? null }).where(eq(users.id, userId));
    return { termsVersion: TERMS_VERSION };
  }

  /** Clerk confirms the email → the student becomes Active (spec §3 step 2). */
  markEmailVerified(clerkId: string) {
    return this.db.update(users).set({ status: "active" }).where(eq(users.clerkId, clerkId)).returning({ id: users.id, status: users.status });
  }
}
