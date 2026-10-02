import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Public, Roles, type AuthUser } from "../../auth/decorators";
import { ContactDto, SUPPORT_STATUSES, SupportReplyDto, SupportStatusDto } from "./support.dto";
import { SupportService, supportEmail } from "./support.service";

/** Public contact form. */
@Controller("contact")
export class ContactController {
  constructor(private readonly support: SupportService) {}

  /** GET /contact — the support address (so the site and the API stay in sync). */
  @Public() @Get() info() {
    return { email: supportEmail() };
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Body() dto: ContactDto) {
    return this.support.submit(dto);
  }
}

/** Admin support inbox. */
@Controller("admin/support")
@Roles("admin")
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  /** GET /admin/support?status=open|answered|closed&search=&page= */
  @Get() list(@Query("status") status?: string, @Query("search") search?: string, @Query("page") page?: string) {
    const n = Number(page);
    return this.support.list({ status: SUPPORT_STATUSES.find((s) => s === status), search: search?.slice(0, 100), page: Number.isFinite(n) ? n : 1 });
  }

  @Get(":id") get(@Param("id", ParseUUIDPipe) id: string) {
    return this.support.get(id);
  }

  @Post(":id/reply") reply(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SupportReplyDto) {
    return this.support.reply(u, id, dto.body);
  }

  @Post(":id/status") status(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: SupportStatusDto) {
    return this.support.setStatus(u, id, dto.status);
  }
}
