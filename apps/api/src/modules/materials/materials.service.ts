import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { AuthUser } from "../../auth/decorators";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, files, teacherProfiles, teachingMaterials, users } from "../../db/schema";
import { NotificationsService } from "../../integrations/notifications.service";
import { fileUrl, FilesService, STUDENT_OF_TEACHER, type UploadedFile } from "../files/files.service";
import { ModerationService } from "../moderation/moderation.service";

export const MATERIAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
/** Documents a teacher can keep (they live in the database for now). */
export const MAX_MATERIALS = 50;
const PAGE = 25;

const columns = {
  id: teachingMaterials.id,
  title: teachingMaterials.title,
  description: teachingMaterials.description,
  status: teachingMaterials.status,
  reviewNote: teachingMaterials.reviewNote,
  reviewedAt: teachingMaterials.reviewedAt,
  createdAt: teachingMaterials.createdAt,
  fileId: files.id,
  fileName: files.fileName,
  contentType: files.contentType,
  sizeBytes: files.sizeBytes,
};
const present = <T extends { fileId: string }>({ fileId, ...m }: T) => ({ ...m, fileUrl: fileUrl(fileId) });

/**
 * Teaching documents: a teacher uploads → an admin approves (or rejects with a reason) → the
 * teacher's students can download it. Nothing reaches a student before an admin checked it.
 */
@Injectable()
export class MaterialsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly files: FilesService,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ------------------------------------------------------------------ teacher */

  async upload(teacher: AuthUser, input: { title: string; description?: string }, file: UploadedFile | undefined) {
    const [profile] = await this.db.select({ status: teacherProfiles.status }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacher.id));
    if (profile?.status !== "approved") throw forbidden("Your teacher profile must be approved before you can share documents");
    const title = input.title.trim();
    const description = input.description?.trim() || null;
    if (!title) throw badRequest("Give the document a title");
    await this.moderation.rejectContactDetails(teacher, { title, description }, "material");
    const { contentType, fileName, data, rule } = this.files.validate("material", file);

    const id = await this.db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: count() }).from(teachingMaterials).where(eq(teachingMaterials.teacherId, teacher.id));
      if (n >= MAX_MATERIALS) throw badRequest(`You can keep up to ${MAX_MATERIALS} documents. Delete one first.`);
      const [f] = await tx
        .insert(files)
        .values({ ownerId: teacher.id, purpose: "material", fileName, contentType, sizeBytes: data.length, data, isPublic: rule.isPublic })
        .returning({ id: files.id });
      const [m] = await tx.insert(teachingMaterials).values({ teacherId: teacher.id, fileId: f.id, title, description, createdAt: this.clock.now() }).returning({ id: teachingMaterials.id });
      return m.id;
    });
    return this.get(id);
  }

  async listOwn(teacher: AuthUser) {
    const rows = await this.db
      .select(columns)
      .from(teachingMaterials)
      .innerJoin(files, eq(files.id, teachingMaterials.fileId))
      .where(eq(teachingMaterials.teacherId, teacher.id))
      .orderBy(desc(teachingMaterials.createdAt));
    return rows.map(present);
  }

  async remove(teacher: AuthUser, id: string) {
    const [m] = await this.db.select({ teacherId: teachingMaterials.teacherId, fileId: teachingMaterials.fileId }).from(teachingMaterials).where(eq(teachingMaterials.id, id));
    if (!m) throw notFound("Document");
    if (m.teacherId !== teacher.id) throw forbidden();
    // Deleting the file deletes the document (foreign key cascade).
    await this.db.delete(files).where(eq(files.id, m.fileId));
    return { id };
  }

  /* ------------------------------------------------------------------ student */

  /** Approved documents of the teachers the student has lessons with. */
  async listForStudent(student: AuthUser) {
    const teacherIds = (
      await this.db
        .selectDistinct({ teacherId: bookings.teacherId })
        .from(bookings)
        .where(and(eq(bookings.studentId, student.id), STUDENT_OF_TEACHER))
    ).map((r) => r.teacherId);
    if (!teacherIds.length) return [];
    const rows = await this.db
      .select({ ...columns, teacher: { id: users.id, firstName: users.firstName, lastName: users.lastName, slug: teacherProfiles.slug } })
      .from(teachingMaterials)
      .innerJoin(files, eq(files.id, teachingMaterials.fileId))
      .innerJoin(users, eq(users.id, teachingMaterials.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, teachingMaterials.teacherId))
      .where(and(inArray(teachingMaterials.teacherId, teacherIds), eq(teachingMaterials.status, "approved"), eq(users.status, "active")))
      .orderBy(desc(teachingMaterials.reviewedAt), desc(teachingMaterials.createdAt));
    // Students don't see the admins' review notes.
    return rows.map(({ reviewNote: _n, ...r }) => present(r));
  }

  /* ------------------------------------------------------------------ admin */

  async listForAdmin(q: { status?: MaterialStatus; page?: number }) {
    const page = Math.max(1, Math.trunc(q.page ?? 1) || 1);
    const where = q.status ? eq(teachingMaterials.status, q.status) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ ...columns, teacher: { id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email } })
        .from(teachingMaterials)
        .innerJoin(files, eq(files.id, teachingMaterials.fileId))
        .innerJoin(users, eq(users.id, teachingMaterials.teacherId))
        .where(where)
        // Oldest pending first (a queue); otherwise newest first.
        .orderBy(q.status === "pending" ? teachingMaterials.createdAt : desc(teachingMaterials.createdAt))
        .limit(PAGE)
        .offset((page - 1) * PAGE),
      this.db.select({ total: count() }).from(teachingMaterials).where(where),
    ]);
    return { items: rows.map(present), total: Number(total), page, pageSize: PAGE };
  }

  async pendingCount() {
    const [r] = await this.db.select({ n: count() }).from(teachingMaterials).where(eq(teachingMaterials.status, "pending"));
    return Number(r?.n ?? 0);
  }

  async review(admin: AuthUser, id: string, decision: "approved" | "rejected", note?: string) {
    const [m] = await this.db.select().from(teachingMaterials).where(eq(teachingMaterials.id, id));
    if (!m) throw notFound("Document");
    if (decision === "rejected" && !note?.trim()) throw badRequest("Tell the teacher why the document is rejected");
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx.update(teachingMaterials).set({ status: decision, reviewNote: note?.trim() || null, reviewedBy: admin.id, reviewedAt: now }).where(eq(teachingMaterials.id, id));
      await tx.insert(auditLogs).values({ actorId: admin.id, action: `material.${decision}`, entity: "material", entityId: id, data: { title: m.title, note: note ?? null } });
    });
    await this.notifications.notify(m.teacherId, {
      type: `material_${decision}`,
      title: decision === "approved" ? `Your document "${m.title}" is now available to your students` : `Your document "${m.title}" was not approved`,
      body: note?.trim() || undefined,
      channels: ["in_app", "email"],
    });
    return this.get(id);
  }

  private async get(id: string) {
    const [row] = await this.db.select(columns).from(teachingMaterials).innerJoin(files, eq(files.id, teachingMaterials.fileId)).where(eq(teachingMaterials.id, id));
    if (!row) throw notFound("Document");
    return present(row);
  }
}
