import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { studentProfiles, teacherProfiles, users } from "../../db/schema";
import { badRequest, conflict } from "../../common/errors";

export interface RegisterInput {
  role: "student" | "teacher";
  email: string;
  firstName: string;
  lastName: string;
  country?: string;
  nativeLanguage?: string;
  phone?: string;
  timezone: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

@Injectable()
export class AccountsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Creates the Amerivo account for a signed-in Clerk user (student sign-up or teacher application start). */
  async register(clerkId: string, input: RegisterInput, emailVerified: boolean) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    } catch {
      throw badRequest("Invalid time zone");
    }
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId));
    if (existing) throw conflict("Account already exists");
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
