import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { MODERATION_STATUSES, ModerationService, REPORT_REASONS, type ModerationAction, type ReportReason } from "./moderation.service";

export class ModerationReviewDto {
  @IsIn(["dismiss", "warn", "block"]) action!: ModerationAction;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ReportDto {
  @IsUUID() reportedUserId!: string;
  @IsIn(REPORT_REASONS) reason!: ReportReason;
  @IsString() @MinLength(10) @MaxLength(2000) details!: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsUUID() bookingId?: string;
}

/** "Report" button for students and teachers (from a conversation or a lesson). */
@Controller("reports")
@Roles("student", "teacher")
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post() @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() u: AuthUser, @Body() dto: ReportDto) {
    return this.moderation.report(u, dto);
  }
}

/** Admin trust & safety queue: contact details detected in messages, classroom chat, notes, reports, reviews. */
@Controller("admin/moderation")
@Roles("admin")
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) {}

  /** GET /admin/moderation?status=open|dismissed|warned|blocked&page= */
  @Get() list(@Query("status") status?: string, @Query("page") page?: string) {
    return this.moderation.list({ status: MODERATION_STATUSES.find((s) => s === status), page: /^\d+$/.test(page ?? "") ? Number(page) : 1 });
  }

  @Get(":id/context") context(@Param("id", ParseUUIDPipe) id: string) {
    return this.moderation.context(id);
  }

  @Post(":id/review") @HttpCode(200)
  review(@CurrentUser() admin: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ModerationReviewDto) {
    return this.moderation.review(admin, id, dto.action, dto.note);
  }
}
