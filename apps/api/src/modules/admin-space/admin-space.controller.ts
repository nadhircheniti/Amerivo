import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { Roles } from "../../auth/decorators";
import { badRequest } from "../../common/errors";
import { AdminSpaceService, BOOKING_STATUSES, PAYMENT_STATUSES, STUDENT_STATUSES } from "./admin-space.service";

const pick = <T extends string>(list: readonly T[], v?: string) => list.find((s) => s === v);
const int = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
const date = (v: string | undefined, field: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw badRequest(`${field} must be an ISO date`);
  return d;
};
const text = (v?: string) => (v ? v.slice(0, 120) : undefined);

/** Admin screens: overview, students, bookings, payments, audit log, platform settings. */
@Controller("admin")
@Roles("admin")
export class AdminSpaceController {
  constructor(private readonly space: AdminSpaceService) {}

  /** GET /admin/overview?days=30 — dashboard KPIs, 12-month chart and latest bookings. */
  @Get("overview") overview(@Query("days") days?: string) {
    return this.space.overview(Math.min(Math.max(int(days) ?? 30, 1), 366));
  }

  /** GET /admin/badges — counts for the sidebar (pending applications, open disputes). */
  @Get("badges") badges() {
    return this.space.badges();
  }

  @Get("students") students(@Query("search") search?: string, @Query("status") status?: string, @Query("page") page?: string) {
    return this.space.students({ search: text(search), status: pick(STUDENT_STATUSES, status), page: int(page) });
  }

  @Get("students/:id") student(@Param("id", ParseUUIDPipe) id: string) {
    return this.space.student(id);
  }

  /** GET /admin/bookings?status=&from=&to=&search=&page= */
  @Get("bookings")
  bookings(@Query("status") status?: string, @Query("from") from?: string, @Query("to") to?: string, @Query("search") search?: string, @Query("page") page?: string) {
    return this.space.bookings({
      status: status === "disputed" ? "disputed" : pick(BOOKING_STATUSES, status),
      from: date(from, "from"),
      to: date(to, "to"),
      search: text(search),
      page: int(page),
    });
  }

  @Get("payments") payments(@Query("page") page?: string, @Query("payoutsPage") payoutsPage?: string, @Query("status") status?: string, @Query("search") search?: string) {
    return this.space.payments({ page: int(page), payoutsPage: int(payoutsPage), status: pick(PAYMENT_STATUSES, status), search: text(search) });
  }

  @Get("audit-logs") auditLogs(@Query("page") page?: string, @Query("entity") entity?: string, @Query("search") search?: string) {
    return this.space.auditLogs({ page: int(page), entity: text(entity), search: text(search) });
  }

  @Get("settings") settings() {
    return this.space.settings();
  }
}
