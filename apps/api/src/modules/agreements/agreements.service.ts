import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type { AuthUser } from "../../auth/decorators";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors";
import { DB, type Db } from "../../db/db";
import { createHash } from "node:crypto";
import { auditLogs, teacherAgreements, teacherProfiles, users } from "../../db/schema";
import { NotificationsService } from "../../integrations/notifications.service";
import { agreementHtml, agreementText, signatureMatchesAccount, TEACHER_AGREEMENT_SHA256, TEACHER_AGREEMENT_VERSION } from "../../legal/teacher-agreement";
import { supportEmail } from "../support/support.service";

type Signature = typeof teacherAgreements.$inferSelect;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Independent Teacher Agreement: the current text, the teacher's electronic signature (typed full
 * name + "I agree", U.S. E-SIGN Act / Indiana UETA) and the signed copy e-mailed to the teacher and
 * to Amerivo. A signature records the exact text (version + SHA-256), the account, the time and the
 * IP address and browser, and can't be changed afterwards.
 */
/**
 * Fingerprint of a signature record (fixed field order): printed in the copy both parties receive,
 * so the stored record can always be checked against it.
 */
export function recordHash(r: {
  teacherId: string;
  version: string;
  textSha256: string;
  fullName: string;
  email: string;
  signedAt: Date;
  ip: string | null;
  userAgent: string | null;
  identityStatus: string;
  identitySessionId: string | null;
}) {
  const canonical = JSON.stringify([r.teacherId, r.version, r.textSha256, r.fullName, r.email, r.signedAt.toISOString(), r.ip, r.userAgent, r.identityStatus, r.identitySessionId]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

@Injectable()
export class AgreementsService {
  private readonly log = new Logger(AgreementsService.name);
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  /** The text to read before signing. */
  current() {
    return { version: TEACHER_AGREEMENT_VERSION, sha256: TEACHER_AGREEMENT_SHA256, html: agreementHtml() };
  }

  private async signatureOf(teacherId: string, version = TEACHER_AGREEMENT_VERSION) {
    const [s] = await this.db
      .select()
      .from(teacherAgreements)
      .where(and(eq(teacherAgreements.teacherId, teacherId), eq(teacherAgreements.version, version)));
    return s ?? null;
  }

  private publicSignature(s: Signature) {
    return { version: s.version, fullName: s.fullName, signedAt: s.signedAt, emailedAt: s.emailedAt, sha256: s.textSha256, recordSha256: s.recordSha256 };
  }

  /** The teacher's signature of the version in force (null = must sign). */
  async status(teacher: AuthUser) {
    if (teacher.role !== "teacher") throw forbidden();
    const s = await this.signatureOf(teacher.id);
    return { version: TEACHER_AGREEMENT_VERSION, sha256: TEACHER_AGREEMENT_SHA256, signature: s ? this.publicSignature(s) : null };
  }

  /** True when the teacher signed the version in force (application submit, teacher space). */
  async hasSigned(teacherId: string) {
    return !!(await this.signatureOf(teacherId));
  }

  async sign(teacher: AuthUser, input: { fullName: string; version: string; sha256: string; agree: boolean }, ctx: { ip: string | null; userAgent: string | null }) {
    if (teacher.role !== "teacher") throw forbidden("Only teachers sign the teacher agreement");
    if (input.agree !== true) throw badRequest("Tick the box to confirm you agree to the agreement");
    // The text on screen must be the one in force (it may have changed while the page was open).
    if (input.version !== TEACHER_AGREEMENT_VERSION || input.sha256 !== TEACHER_AGREEMENT_SHA256) {
      throw conflict("The agreement was updated. Reload the page and read the new version before signing.");
    }
    const fullName = input.fullName.replace(/\s+/g, " ").trim();
    const [account] = await this.db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, teacher.id));
    if (!account) throw notFound("Account");
    if (fullName.length < 3 || !signatureMatchesAccount(fullName, account.firstName, account.lastName)) {
      throw badRequest(`Type your full legal name as on your account (${`${account.firstName} ${account.lastName}`.trim()}).`);
    }
    const existing = await this.signatureOf(teacher.id);
    if (existing) return { signature: this.publicSignature(existing), alreadySigned: true };

    // Attribution: the signer's identity is being (or has been) checked by Stripe Identity (ID + selfie).
    const [profile] = await this.db
      .select({ identityStatus: teacherProfiles.identityStatus, sessionId: teacherProfiles.stripeIdentitySessionId })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, teacher.id));
    if (!profile || (profile.identityStatus !== "pending" && profile.identityStatus !== "verified")) {
      throw badRequest("Verify your identity first (step \"Identity\"), then sign the agreement.");
    }

    const now = this.clock.now();
    const evidence = {
      teacherId: teacher.id,
      version: TEACHER_AGREEMENT_VERSION,
      textSha256: TEACHER_AGREEMENT_SHA256,
      fullName,
      email: account.email,
      signedAt: now,
      ip: ctx.ip,
      userAgent: ctx.userAgent?.slice(0, 400) ?? null,
      identityStatus: profile.identityStatus,
      identitySessionId: profile.sessionId,
    };
    const [row] = await this.db
      .insert(teacherAgreements)
      .values({ ...evidence, recordSha256: recordHash(evidence) })
      .onConflictDoNothing()
      .returning();
    if (!row) return { signature: this.publicSignature((await this.signatureOf(teacher.id))!), alreadySigned: true };
    await this.db.insert(auditLogs).values({ actorId: teacher.id, action: "teacher.agreement.sign", entity: "teacher_agreement", entityId: row.id, data: { version: row.version, sha256: row.textSha256 } });

    const emailed = await this.sendCopies(row);
    return { signature: this.publicSignature(emailed ?? row), alreadySigned: false };
  }

  /** The signed copy (agreement + signature certificate), as shown and e-mailed. */
  async signedCopy(teacher: AuthUser) {
    if (teacher.role !== "teacher") throw forbidden();
    const [s] = await this.db.select().from(teacherAgreements).where(eq(teacherAgreements.teacherId, teacher.id)).orderBy(desc(teacherAgreements.signedAt)).limit(1);
    if (!s) throw notFound("Signed agreement");
    return { ...this.publicSignature(s), html: this.copyHtml(s) };
  }

  /** Sends the signed copy again (teacher asks for it, or the first e-mail failed). */
  async resend(teacher: AuthUser) {
    const s = await this.signatureOf(teacher.id);
    if (!s) throw notFound("Signed agreement");
    const done = await this.sendCopies(s);
    return { emailed: !!done?.emailedAt };
  }

  private certificate(s: Signature) {
    return [
      ["Signed electronically by", s.fullName],
      ["Account e-mail", s.email],
      ["Date and time (UTC)", s.signedAt.toISOString().replace("T", " ").slice(0, 19)],
      ["IP address", s.ip ?? "—"],
      ["Identity check (Stripe Identity)", `${s.identityStatus}${s.identitySessionId ? ` — ${s.identitySessionId}` : ""}`],
      ["Agreement version", s.version],
      ["Text fingerprint (SHA-256)", s.textSha256],
      ["Signature record fingerprint (SHA-256)", s.recordSha256],
    ] as const;
  }

  private copyHtml(s: Signature) {
    // The signed text is the version recorded with the signature; only the version in force is kept in
    // the code, so an older signature shows its fingerprint (the e-mailed copy holds its full text).
    const text = s.version === TEACHER_AGREEMENT_VERSION ? agreementHtml() : `<p>Version ${escapeHtml(s.version)} — see the copy e-mailed when it was signed.</p>`;
    const rows = this.certificate(s)
      .map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;vertical-align:top">${k}</th><td style="padding:4px 0;font-family:monospace;word-break:break-all">${escapeHtml(v)}</td></tr>`)
      .join("");
    return `${text}\n<h2>Electronic signature</h2>\n<p>The Teacher accepted this Agreement electronically by ticking “I agree” and typing their full name, which has the same effect as a handwritten signature (U.S. E-SIGN Act, 15 U.S.C. § 7001 et seq.; Indiana Uniform Electronic Transactions Act, IC 26-2-8). Accepted on behalf of Amerivo English LLC through the Platform.</p>\n<table style="border-collapse:collapse">${rows}</table>`;
  }

  /** E-mails the signed copy to the teacher and to Amerivo; records when it went out. */
  private async sendCopies(s: Signature) {
    const subject = `Signed copy — Independent Teacher Agreement (${s.fullName})`;
    const certificateText = this.certificate(s)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const text = `${agreementText()}\n\nELECTRONIC SIGNATURE\n${certificateText}\n`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#0b2a3c;max-width:720px">\n<p>Here is your signed copy of the Amerivo Independent Teacher Agreement. Please keep it for your records.</p>\n${this.copyHtml(s)}\n</div>`;
    try {
      const toTeacher = await this.notifications.sendEmail({ to: s.email, subject, text, html, replyTo: supportEmail() });
      const toAmerivo = await this.notifications.sendEmail({ to: supportEmail(), subject: `[Contracts] ${subject}`, text, html, replyTo: s.email });
      if (!toTeacher || !toAmerivo) return null; // e-mail not configured: the copy stays available in the teacher space
      const [row] = await this.db.update(teacherAgreements).set({ emailedAt: this.clock.now() }).where(eq(teacherAgreements.id, s.id)).returning();
      return row;
    } catch (e) {
      this.log.warn(`agreement copy e-mail failed for ${s.id}: ${e}`);
      return null;
    }
  }
}
