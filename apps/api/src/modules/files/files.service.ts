import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyToken } from "@clerk/backend";
import { and, desc, eq, ne, notInArray, sql } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { bookings, files, teachingMaterials, users } from "../../db/schema";
import { badRequest, forbidden, notFound } from "../../common/errors";
import type { AuthUser } from "../../auth/decorators";
import { TERMS_VERSION } from "../../domain/terms";
import type { FilePurpose } from "./files.dto";

const MB = 1024 * 1024;

/** What each kind of upload accepts. Types are checked on the file's bytes, not only on its declared type. */
export const FILE_RULES: Record<FilePurpose, { types: string[]; maxBytes: number; isPublic: boolean; label: string }> = {
  avatar: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 2 * MB, isPublic: true, label: "JPG, PNG or WebP" },
  certificate: { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 5 * MB, isPublic: false, label: "PDF, JPG or PNG" },
  /** Teaching documents: private; students can download them once an admin approved them. */
  material: { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 5 * MB, isPublic: false, label: "PDF, JPG or PNG" },
};
/** Largest upload accepted by the multipart parser (the per-purpose limit is checked afterwards). */
export const MAX_UPLOAD_BYTES = 5 * MB;
/** Certificates a teacher can keep (abuse guard: files live in the database for now). */
export const MAX_CERTIFICATES = 20;

/** Bookings that make someone "a student of" a teacher: anything but an unpaid or cancelled hold. */
export const STUDENT_OF_TEACHER = sql`${bookings.status} in ('confirmed', 'completed', 'no_show')`;

/** Public path of a stored file, relative to the API origin (the web prefixes it with the API origin). */
export const fileUrl = (id: string) => `/api/files/${id}`;

/** Detects the real type from the first bytes (magic numbers). */
export function sniffType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 5 && buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/** A readable, safe base name (no path, no control characters or quotes). */
export function cleanFileName(raw: string | undefined, contentType: string) {
  const name = (raw ?? "")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim()
    .slice(-150);
  if (name) return name;
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[contentType] ?? "bin";
  return `file.${ext}`;
}

export interface UploadedFile {
  originalname?: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

const meta = {
  id: files.id,
  ownerId: files.ownerId,
  purpose: files.purpose,
  fileName: files.fileName,
  contentType: files.contentType,
  sizeBytes: files.sizeBytes,
  isPublic: files.isPublic,
  createdAt: files.createdAt,
};

@Injectable()
export class FilesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Checks size and real type (magic bytes); returns the detected type and a safe file name. */
  validate(purpose: FilePurpose, file: UploadedFile | undefined) {
    if (!file?.buffer?.length) throw badRequest("Choose a file to upload");
    const rule = FILE_RULES[purpose];
    if (file.size > rule.maxBytes || file.buffer.length > rule.maxBytes) throw badRequest(`File is too large (max ${rule.maxBytes / MB} MB)`);
    const contentType = sniffType(file.buffer);
    if (!contentType || !rule.types.includes(contentType)) throw badRequest(`Unsupported file type. Use ${rule.label}.`);
    return { contentType, fileName: cleanFileName(file.originalname, contentType), data: file.buffer, rule };
  }

  async upload(user: AuthUser, purpose: FilePurpose, file: UploadedFile | undefined) {
    if (purpose === "material") throw badRequest("Upload teaching documents from your Documents page");
    if (purpose === "certificate" && user.role === "student") throw forbidden("Only teachers can upload certificates");
    const { contentType, fileName, rule } = this.validate(purpose, file);
    file = file!;

    return this.db.transaction(async (tx) => {
      if (purpose === "certificate") {
        const [{ n }] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(files)
          .where(and(eq(files.ownerId, user.id), eq(files.purpose, "certificate")));
        if (n >= MAX_CERTIFICATES) throw badRequest(`You can keep up to ${MAX_CERTIFICATES} certificate files. Remove one first.`);
      }
      const [row] = await tx
        .insert(files)
        .values({ ownerId: user.id, purpose, fileName, contentType, sizeBytes: file.buffer.length, data: file.buffer, isPublic: rule.isPublic })
        .returning(meta);
      if (purpose === "avatar") {
        // One photo per account: the previous one is replaced.
        await tx.delete(files).where(and(eq(files.ownerId, user.id), eq(files.purpose, "avatar"), ne(files.id, row.id)));
        await tx.update(users).set({ avatarUrl: fileUrl(row.id) }).where(eq(users.id, user.id));
      }
      return this.present(row);
    });
  }

  /** The signed-in user's files (admins can pass ownerId to see a teacher's certificates). Teaching documents are listed by /teacher/materials. */
  async list(user: AuthUser, q: { purpose?: FilePurpose; ownerId?: string }) {
    if (q.ownerId && q.ownerId !== user.id && user.role !== "admin") throw forbidden();
    const owner = q.ownerId ?? user.id;
    const rows = await this.db
      .select(meta)
      .from(files)
      .where(and(eq(files.ownerId, owner), q.purpose ? eq(files.purpose, q.purpose) : notInArray(files.purpose, ["material"])))
      .orderBy(desc(files.createdAt));
    return rows.map((r) => this.present(r));
  }

  /**
   * The file with its bytes. Public files: anyone. Private: owner or admin — and, for a teaching
   * document, students of that teacher once an admin approved it.
   */
  async read(id: string, viewer: { id: string; role: string; termsVersion?: string | null } | null) {
    const [row] = await this.db.select().from(files).where(eq(files.id, id));
    if (!row) throw notFound("File");
    if (!row.isPublic) {
      if (!viewer) throw new UnauthorizedException("Sign in to see this file");
      if (viewer.id !== row.ownerId && viewer.role !== "admin" && !(row.purpose === "material" && (await this.studentMaySeeMaterial(viewer, row.id, row.ownerId)))) {
        throw forbidden();
      }
    }
    return row;
  }

  /** Approved document of a teacher the student has a paid (or free trial) booking with. */
  private async studentMaySeeMaterial(viewer: { id: string; role: string; termsVersion?: string | null }, fileId: string, teacherId: string) {
    // Same rule as the API guard: the current Terms of Service must be accepted.
    if (viewer.role !== "student" || viewer.termsVersion !== TERMS_VERSION) return false;
    const [ok] = await this.db
      .select({ id: teachingMaterials.id })
      .from(teachingMaterials)
      .innerJoin(bookings, and(eq(bookings.teacherId, teachingMaterials.teacherId), eq(bookings.studentId, viewer.id)))
      .innerJoin(users, eq(users.id, teachingMaterials.teacherId))
      .where(
        and(
          eq(teachingMaterials.fileId, fileId),
          eq(teachingMaterials.teacherId, teacherId),
          eq(teachingMaterials.status, "approved"),
          // A blocked or deleted teacher's documents are no longer shared.
          eq(users.status, "active"),
          STUDENT_OF_TEACHER,
        ),
      )
      .limit(1);
    return !!ok;
  }

  async remove(user: AuthUser, id: string) {
    const [row] = await this.db.select(meta).from(files).where(eq(files.id, id));
    if (!row) throw notFound("File");
    if (row.ownerId !== user.id && user.role !== "admin") throw forbidden();
    await this.db.transaction(async (tx) => {
      await tx.delete(files).where(eq(files.id, id));
      if (row.purpose === "avatar") {
        await tx.update(users).set({ avatarUrl: null }).where(and(eq(users.id, row.ownerId), eq(users.avatarUrl, fileUrl(id))));
      }
    });
    return { id };
  }

  /**
   * Optional sign-in for GET /files/:id (a public route): same rules as the global AuthGuard, but a
   * missing or invalid session just means "anonymous".
   */
  async viewerFrom(headers: Record<string, string | string[] | undefined>) {
    let clerkId: string | null = null;
    const dev = headers["x-dev-user"];
    if (typeof dev === "string" && process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production") clerkId = dev;
    else {
      const auth = typeof headers.authorization === "string" ? headers.authorization : "";
      if (auth.startsWith("Bearer ")) {
        try {
          clerkId = (await verifyToken(auth.slice(7), { secretKey: process.env.CLERK_SECRET_KEY })).sub;
        } catch {
          clerkId = null;
        }
      }
    }
    if (!clerkId) return null;
    const [u] = await this.db.select({ id: users.id, role: users.role, status: users.status, termsVersion: users.termsVersion }).from(users).where(eq(users.clerkId, clerkId));
    return u && u.status !== "blocked" && u.status !== "deleted" ? u : null;
  }

  private present(r: { id: string; purpose: string; fileName: string; contentType: string; sizeBytes: number; isPublic: boolean; createdAt: Date }) {
    return { id: r.id, url: fileUrl(r.id), purpose: r.purpose, fileName: r.fileName, contentType: r.contentType, sizeBytes: r.sizeBytes, isPublic: r.isPublic, createdAt: r.createdAt };
  }
}
