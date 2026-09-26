import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { teacherApplications, teacherProfiles } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { assertValidPrice } from "../../domain/pricing";

export interface TeacherProfileInput {
  headline?: string;
  bio?: string;
  city?: string;
  gender?: "female" | "male" | "other";
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
  introVideoUrl?: string;
}

/** Teacher application (spec §4): draft → pending (submitted) → approved / rejected. */
@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async updateProfile(teacherId: string, input: TeacherProfileInput) {
    if (input.priceCents !== undefined) assertValidPrice(input.priceCents);
    const [row] = await this.db.update(teacherProfiles).set(input).where(eq(teacherProfiles.userId, teacherId)).returning();
    if (!row) throw notFound("Teacher profile");
    return row;
  }

  async submit(teacherId: string) {
    const [t] = await this.db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher profile");
    if (t.status !== "draft" && t.status !== "rejected") throw forbidden(`Application is already ${t.status}`);
    const missing = [
      !t.introVideoUrl && "2-minute introduction video",
      t.identityStatus === "not_started" && "identity verification",
      !t.specialties.length && "what you can teach",
      !t.bio && "bio",
    ].filter(Boolean);
    if (missing.length) throw badRequest(`Please complete: ${missing.join(", ")}`);
    await this.db.transaction(async (tx) => {
      await tx.update(teacherProfiles).set({ status: "pending" }).where(eq(teacherProfiles.userId, teacherId));
      await tx.insert(teacherApplications).values({ teacherId, submittedAt: this.clock.now() });
    });
    return { status: "pending" as const };
  }
}
