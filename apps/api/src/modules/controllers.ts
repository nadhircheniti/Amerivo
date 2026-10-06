import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { clerkClient } from "./clerk";
import { AllowUnregistered, ClerkId, CurrentUser, Public, Roles, type AuthUser } from "../auth/decorators";
import { badRequest } from "../common/errors";
import { StripeService } from "../integrations/stripe.service";
import { AccountsService } from "./accounts/accounts.service";
import { AdminService } from "./admin/admin.service";
import { BookingsService } from "./bookings/bookings.service";
import { EarningsService } from "./earnings/earnings.service";
import { LessonsService } from "./lessons/lessons.service";
import { StudentsService } from "./students/students.service";
import { ApplicationsService } from "./teachers/applications.service";
import { TeachersService } from "./teachers/teachers.service";
import {
  BlockedDateDto,
  CancelDto,
  CompleteDto,
  CreateBookingDto,
  DecisionDto,
  InterviewDto,
  NotesDto,
  PlacementDto,
  RefundDto,
  RegisterDto,
  ReportDto,
  ReviewDto,
  RulesDto,
  TeacherProfileDto,
  ToggleDto,
  UserStatusDto,
} from "./dto";

const splitList = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
const parseDate = (v: string | undefined, name: string) => {
  const d = v ? new Date(v) : undefined;
  if (!d || Number.isNaN(d.getTime())) throw badRequest(`${name} must be an ISO date`);
  return d;
};

@Controller("health")
export class HealthController {
  @Public() @Get() health() {
    return { ok: true, service: "amerivo-api" };
  }
}

@Controller("me")
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @AllowUnregistered() @Post("register")
  async register(@ClerkId() clerkId: string, @Body() dto: RegisterDto) {
    const verified = await clerkClient.isEmailVerified(clerkId, dto.email);
    return this.accounts.register(clerkId, dto, verified);
  }

  @Get() me(@CurrentUser() user: AuthUser) {
    return this.accounts.me(user.id);
  }
}

@Controller("teachers")
export class TeachersController {
  constructor(
    private readonly teachers: TeachersService,
    private readonly lessons: LessonsService,
  ) {}

  @Public() @Get()
  search(@Query() q: Record<string, string | undefined>) {
    return this.teachers.search({
      specialties: splitList(q.specialties),
      teaches: splitList(q.teaches),
      maxPriceCents: q.maxPrice ? Math.round(Number(q.maxPrice) * 100) : undefined,
      gender: q.gender === "female" || q.gender === "male" ? q.gender : undefined,
      sort: (["best", "rating", "price_asc", "experience"] as const).find((s) => s === q.sort),
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    });
  }

  @Public() @Get(":slug") profile(@Param("slug") slug: string) {
    return this.teachers.bySlug(slug);
  }

  @Public() @Get(":slug/reviews")
  async reviews(@Param("slug") slug: string) {
    const t = await this.teachers.bySlug(slug);
    return this.lessons.publicReviews(t.id);
  }

  /** GET /teachers/:slug/slots?from=…&to=…&tz=Europe/Zurich&trial=1 */
  @Public() @Get(":slug/slots")
  slots(@Param("slug") slug: string, @Query("from") from?: string, @Query("to") to?: string, @Query("tz") tz = "UTC", @Query("trial") trial?: string) {
    const f = parseDate(from, "from");
    const t = parseDate(to, "to");
    if (t.getTime() - f.getTime() > 31 * 86_400_000) throw badRequest("Range is limited to 31 days");
    return this.teachers.slots(slug, { viewerTz: tz, from: f, to: t, trial: trial === "1" });
  }
}

@Controller("teacher")
@Roles("teacher")
export class TeacherSpaceController {
  constructor(
    private readonly teachers: TeachersService,
    private readonly applications: ApplicationsService,
    private readonly earnings: EarningsService,
    private readonly stripe: StripeService,
  ) {}

  /** The teacher's own profile, application status, availability and blocked dates. */
  @Get("profile") own(@CurrentUser() u: AuthUser) {
    return this.applications.getOwn(u.id);
  }
  @Put("profile") profile(@CurrentUser() u: AuthUser, @Body() dto: TeacherProfileDto) {
    return this.applications.updateProfile(u.id, dto);
  }
  @Post("application/submit") submit(@CurrentUser() u: AuthUser) {
    return this.applications.submit(u.id);
  }
  @Post("identity/session") identity(@CurrentUser() u: AuthUser) {
    return this.applications.startIdentity(u.id);
  }
  @Post("identity/sync") identitySync(@CurrentUser() u: AuthUser) {
    return this.applications.syncIdentity(u.id);
  }
  @Put("availability") availability(@CurrentUser() u: AuthUser, @Body() dto: RulesDto) {
    for (const r of dto.rules) if (r.startMinute >= r.endMinute) throw badRequest("Each window must end after it starts");
    return this.teachers.replaceRules(u.id, dto.rules);
  }
  @Post("vacation") vacation(@CurrentUser() u: AuthUser, @Body() dto: ToggleDto) {
    return this.teachers.setVacation(u.id, dto.on);
  }
  @Post("blocked-dates") block(@CurrentUser() u: AuthUser, @Body() dto: BlockedDateDto) {
    if (dto.endDate < dto.startDate) throw badRequest("endDate must be on or after startDate");
    return this.teachers.addBlockedDate(u.id, dto);
  }
  @Delete("blocked-dates/:id") unblock(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.teachers.removeBlockedDate(u.id, id);
  }
  @Get("students/:studentId/history") history(@CurrentUser() u: AuthUser, @Param("studentId", ParseUUIDPipe) studentId: string) {
    return this.teachers.historyWithStudent(u.id, studentId);
  }
  @Get("earnings") summary(@CurrentUser() u: AuthUser) {
    return this.earnings.summary(u.id);
  }
  @Post("earnings/withdraw") withdraw(@CurrentUser() u: AuthUser) {
    return this.earnings.payout(u.id, true);
  }
}

@Controller("student")
@Roles("student")
export class StudentController {
  constructor(private readonly students: StudentsService) {}

  @Put("placement") placement(@CurrentUser() u: AuthUser, @Body() dto: PlacementDto) {
    return this.students.savePlacement(u.id, dto);
  }
  @Get("recommendations") recommendations(@CurrentUser() u: AuthUser) {
    return this.students.recommendations(u.id);
  }
}

@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly lessons: LessonsService,
  ) {}

  @Roles("student") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(u, { ...dto, startsAt: new Date(dto.startsAt) });
  }
  @Get() list(@CurrentUser() u: AuthUser, @Query("scope") scope: "upcoming" | "past" = "upcoming") {
    return this.bookings.listForUser(u, scope === "past" ? "past" : "upcoming");
  }
  /** Called by the payment page right after Stripe confirms: no need to wait for the webhook. */
  @Post(":id/sync-payment") syncPayment(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.syncPayment(u, id);
  }
  @Post(":id/cancel") cancel(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CancelDto) {
    return this.bookings.cancel(u, id, dto.reason);
  }
  @Get(":id/classroom") classroom(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.lessons.classroom(u, id);
  }
  @Post(":id/join") join(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.lessons.join(u, id);
  }
  @Put(":id/notes") notes(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: NotesDto) {
    return this.lessons.saveNotes(u, id, dto.notes);
  }
  @Roles("teacher") @Post(":id/complete")
  complete(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CompleteDto) {
    return this.bookings.complete(u, id, dto.attendance);
  }
  @Roles("teacher") @Put(":id/report")
  report(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ReportDto) {
    return this.lessons.submitReport(u, id, dto);
  }
  @Get(":id/report") getReport(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.lessons.reportFor(u, id);
  }
  @Roles("student") @Post(":id/review")
  review(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewDto) {
    return this.lessons.review(u, id, dto.rating, dto.comment);
  }
}

@Controller("admin")
@Roles("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly earnings: EarningsService,
  ) {}

  @Get("analytics") analytics(@Query("days") days?: string) {
    return this.admin.analytics(days ? Math.min(Number(days), 365) : 30);
  }
  @Get("teachers") teachers(@Query("status") status?: "draft" | "pending" | "approved" | "rejected" | "suspended") {
    return this.admin.listTeachers(status);
  }
  @Post("teachers/:id/interview") interview(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: InterviewDto) {
    return this.admin.requestInterview(u, id, dto.notes);
  }
  @Post("teachers/:id/decision") decide(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: DecisionDto) {
    return this.admin.decideTeacher(u, id, dto.decision, { evaluation: dto.evaluation, notes: dto.notes });
  }
  @Post("bookings/:id/refund") refund(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RefundDto) {
    return this.admin.refundCompletedLesson(u, id, dto.reason);
  }
  @Post("users/:id/status") status(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UserStatusDto) {
    return this.admin.setUserStatus(u, id, dto.status);
  }
  /** Admin override of the monthly schedule: run payouts now. */
  @Post("payouts/run") runPayouts() {
    return this.earnings.monthlyRun();
  }
}

@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly stripe: StripeService,
    private readonly bookings: BookingsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Public() @Post("stripe") @HttpCode(200)
  async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string) {
    if (!req.rawBody) throw badRequest("Missing raw body");
    const event = this.stripe.constructEvent(req.rawBody, signature);
    switch (event.type) {
      case "payment_intent.succeeded":
        return this.bookings.onPaymentSucceeded(event.id, event.data.object.id);
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        return this.bookings.onPaymentFailed(event.id, event.data.object.id);
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.processing":
      case "identity.verification_session.canceled":
        return this.applications.onIdentityEvent(event.data.object);
      default:
        return { ignored: event.type };
    }
  }
}
