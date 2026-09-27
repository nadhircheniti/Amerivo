import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { TeacherSpaceService } from "./teacher-space.service";

/**
 * Teacher space screens (dashboard, students, earnings, lesson report, Stripe Connect).
 * Shares the /teacher prefix with TeacherSpaceController in controllers.ts (profile, availability,
 * GET /teacher/earnings, POST /teacher/earnings/withdraw, student history).
 */
@Controller("teacher")
@Roles("teacher")
export class TeacherDashboardController {
  constructor(private readonly space: TeacherSpaceService) {}

  @Get("overview") overview(@CurrentUser() u: AuthUser) {
    return this.space.overview(u.id);
  }

  @Get("students") students(@CurrentUser() u: AuthUser) {
    return this.space.students(u.id);
  }

  @Get("students/:studentId") student(@CurrentUser() u: AuthUser, @Param("studentId", ParseUUIDPipe) studentId: string) {
    return this.space.student(u.id, studentId);
  }

  /** Report page context for a booking (id = booking id, as in PUT /bookings/:id/report). */
  @Get("lessons/:bookingId") lesson(@CurrentUser() u: AuthUser, @Param("bookingId", ParseUUIDPipe) bookingId: string) {
    return this.space.lesson(u.id, bookingId);
  }

  @Get("earnings/details") earnings(@CurrentUser() u: AuthUser) {
    return this.space.earningsDetails(u.id);
  }

  @Post("payouts/connect") connect(@CurrentUser() u: AuthUser) {
    return this.space.connect(u.id);
  }

  @Get("payouts/status") status(@CurrentUser() u: AuthUser) {
    return this.space.payoutStatus(u.id);
  }

  @Post("payouts/dashboard") dashboard(@CurrentUser() u: AuthUser) {
    return this.space.dashboard(u.id);
  }
}
