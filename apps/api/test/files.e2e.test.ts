/** File uploads: profile photos (public) and certificates (private), stored in the files table. */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createTestApp } from "./harness";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64, 3)]);
const pngOfSize = (n: number) => Buffer.concat([PNG, Buffer.alloc(n - PNG.length, 0)]);
/** supertest parser keeping the raw bytes. */
const bin = ((res: NodeJS.ReadableStream, cb: (e: Error | null, b: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
}) as never;

describe("files", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  let teacher: { id: string };
  before(async () => {
    h = await createTestApp();
    teacher = await h.seedTeacher("clerk_f_t", { slug: "files-teacher" });
    await h.seedTeacher("clerk_f_t2");
    await h.seedStudent("clerk_f_s");
    await h.seedAdmin("clerk_f_admin");
  });
  after(() => h?.close());

  const upload = (clerkId: string | null, purpose: string | null, file: Buffer | null, name = "photo.png", contentType = "image/png") => {
    let r = h.http().post("/api/files");
    if (clerkId) r = r.set(h.as(clerkId));
    if (purpose) r = r.field("purpose", purpose);
    if (file) r = r.attach("file", file, { filename: name, contentType });
    return r;
  };

  it("uploads a profile photo: public, sets the account's avatarUrl, shown on the public profile", async () => {
    await upload(null, "avatar", PNG).expect(401);
    const { body } = await upload("clerk_f_t", "avatar", PNG).expect(201);
    assert.equal(body.url, `/api/files/${body.id}`);
    assert.equal(body.contentType, "image/png");
    assert.equal(body.sizeBytes, PNG.length);
    assert.equal(body.fileName, "photo.png");
    assert.equal(body.isPublic, true);

    const [u] = await h.db.select().from(h.schema.users).where(eq(h.schema.users.id, teacher.id));
    assert.equal(u.avatarUrl, body.url);

    const res = await h.http().get(body.url).buffer(true).parse(bin).expect(200);
    assert.equal(res.headers["content-type"], "image/png");
    assert.match(res.headers["cache-control"], /public/);
    assert.equal(res.headers["cross-origin-resource-policy"], "cross-origin");
    assert.match(res.headers["content-disposition"], /^inline; filename="photo.png"/);
    assert.ok(Buffer.compare(res.body as Buffer, PNG) === 0);

    const pub = await h.http().get("/api/teachers/files-teacher").expect(200);
    assert.equal(pub.body.avatarUrl, body.url);
    const me = await h.http().get("/api/me").set(h.as("clerk_f_t")).expect(200);
    assert.equal(me.body.avatarUrl, body.url);

    // A new photo replaces the old one.
    const second = await upload("clerk_f_t", "avatar", JPG, "me.jpg", "image/jpeg").expect(201);
    await h.http().get(body.url).expect(404);
    const [u2] = await h.db.select().from(h.schema.users).where(eq(h.schema.users.id, teacher.id));
    assert.equal(u2.avatarUrl, second.body.url);
    assert.equal(second.body.contentType, "image/jpeg");
  });

  it("checks type (by content) and size", async () => {
    await upload("clerk_f_t", "avatar", PDF, "cv.pdf", "application/pdf").expect(400);
    // Declared as an image but not one.
    const fake = await upload("clerk_f_t", "avatar", Buffer.from("<script>alert(1)</script>"), "x.png", "image/png").expect(400);
    assert.match(fake.body.message, /Unsupported file type/);
    const big = await upload("clerk_f_t", "avatar", pngOfSize(2 * 1024 * 1024 + 1)).expect(400);
    assert.match(big.body.message, /2 MB/);
    await upload("clerk_f_t", "certificate", pngOfSize(5 * 1024 * 1024 + 1)).expect(413);
    await upload("clerk_f_t", "avatar", null).expect(400);
    await upload("clerk_f_t", null, PNG).expect(400);
    await upload("clerk_f_t", "resume", PNG).expect(400);
  });

  it("certificates are private: owner and admins only", async () => {
    await upload("clerk_f_s", "certificate", PDF, "tesol.pdf", "application/pdf").expect(403);
    const { body } = await upload("clerk_f_t", "certificate", PDF, "TESOL certificate.pdf", "application/pdf").expect(201);
    assert.equal(body.isPublic, false);
    assert.equal(body.contentType, "application/pdf");

    await h.http().get(body.url).expect(401);
    await h.http().get(body.url).set(h.as("clerk_f_t2")).expect(403);
    const own = await h.http().get(body.url).set(h.as("clerk_f_t")).buffer(true).parse(bin).expect(200);
    assert.equal(own.headers["content-type"], "application/pdf");
    assert.match(own.headers["cache-control"], /no-store/);
    assert.match(own.headers["content-disposition"], /filename\*=UTF-8''TESOL%20certificate\.pdf/);
    await h.http().get(body.url).set(h.as("clerk_f_admin")).expect(200);

    // Listing: own files, or a teacher's files for an admin.
    const mine = await h.http().get("/api/files?purpose=certificate").set(h.as("clerk_f_t")).expect(200);
    assert.deepEqual(
      mine.body.map((f: { id: string }) => f.id),
      [body.id],
    );
    const forAdmin = await h.http().get(`/api/files?ownerId=${teacher.id}`).set(h.as("clerk_f_admin")).expect(200);
    assert.equal(forAdmin.body.length, 2); // photo + certificate
    await h.http().get(`/api/files?ownerId=${teacher.id}`).set(h.as("clerk_f_t2")).expect(403);

    // Deleting: owner (or admin) only.
    await h.http().delete(body.url).set(h.as("clerk_f_t2")).expect(403);
    await h.http().delete(body.url).set(h.as("clerk_f_t")).expect(200);
    await h.http().get(body.url).set(h.as("clerk_f_t")).expect(404);
  });

  it("students can have a photo too; deleting it clears avatarUrl", async () => {
    const { body } = await upload("clerk_f_s", "avatar", PNG).expect(201);
    await h.http().delete(body.url).set(h.as("clerk_f_s")).expect(200);
    const me = await h.http().get("/api/me").set(h.as("clerk_f_s")).expect(200);
    assert.equal(me.body.avatarUrl, null);
    await h.http().get("/api/files/not-a-uuid").expect(400);
  });
});
