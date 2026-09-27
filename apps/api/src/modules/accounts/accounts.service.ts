import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { studentProfiles, teacherProfiles, users } from "../../db/schema";
import { badRequest, conflict } from "../../common/errors";
import { CLOCK, type Clock } from "../../common/clock";
import { isOldEnough, MIN_STUDENT_AGE } from "../../domain/age";

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
  async register(clerkId: string, input: RegisterInput, emailVerified: boolean) {
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
        .values({ clerkId, ...input, birthDate: input.birthDate ?? null, role: "admin", status: "active" })
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
        .values({ clerkId, ...input, status: input.role === "teacher" ? "pending_verification" : emailVerified ? "active" : "pending_verification" })
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
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    return u;
  }

  /** Clerk confirms the email → the student becomes Active (spec §3 step 2). */
  markEmailVerified(clerkId: string) {
    return this.db.update(users).set({ status: "active" }).where(eq(users.clerkId, clerkId)).returning({ id: users.id, status: users.status });
  }
}
