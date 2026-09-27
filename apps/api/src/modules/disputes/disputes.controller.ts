import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { DisputesService, type DisputeStatus } from "./disputes.service";
import { OpenDisputeDto, ResolveDisputeDto } from "./disputes.dto";

const STATUSES: DisputeStatus[] = ["open", "refunded", "rejected"];

/** Student side: report a problem with a lesson (within 24 h after it). */
@Controller("bookings")
export class BookingDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Roles("student")
  @Post(":id/dispute")
  open(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: OpenDisputeDto) {
    return this.disputes.open(u, id, dto.reason);
  }

  /** Returns the dispute or JSON `null` (Nest would otherwise send an empty body). */
  @Roles("student", "admin")
  @Get(":id/dispute")
  async get(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    res.json(await this.disputes.forBooking(u, id));
  }
}

@Controller("admin/disputes")
@Roles("admin")
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get() list(@Query("status") status?: string) {
    return this.disputes.list(STATUSES.find((s) => s === status));
  }

  @Post(":id/resolve")
  resolve(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolve(u, id, dto.decision, dto.note);
  }
}
