import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { AllowWithoutTerms, CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { UpdateProfileDto } from "./student-space.dto";
import { StudentSpaceService } from "./student-space.service";

/** Student space screens: /api/student/overview, lessons, homework, progress, payments. */
@Controller("student")
@Roles("student")
export class StudentSpaceController {
  constructor(private readonly space: StudentSpaceService) {}

  @Get("overview") overview(@CurrentUser() u: AuthUser) {
    return this.space.overview(u);
  }
  @Get("lessons") lessons(@CurrentUser() u: AuthUser, @Query("scope") scope?: string) {
    return this.space.lessons(u, scope === "past" ? "past" : "upcoming");
  }
  @Get("lessons/:id") lesson(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.space.lesson(u, id);
  }
  @Get("homework") homework(@CurrentUser() u: AuthUser) {
    return this.space.homework(u);
  }
  @Post("homework/:id/complete") complete(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.space.setHomeworkStatus(u, id, "completed");
  }
  @Post("homework/:id/reopen") reopen(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.space.setHomeworkStatus(u, id, "assigned");
  }
  @Get("progress") progress(@CurrentUser() u: AuthUser) {
    return this.space.progress(u);
  }
  @Get("payments") payments(@CurrentUser() u: AuthUser) {
    return this.space.paymentsPage(u);
  }
}

/**
 * The student's own account: GET/PUT /api/me/profile and DELETE /api/me (GDPR erasure).
 * (AccountsController owns POST /me/register and GET /me.)
 */
@Controller("me")
@Roles("student")
export class StudentAccountController {
  constructor(private readonly space: StudentSpaceService) {}

  @Get("profile") profile(@CurrentUser() u: AuthUser) {
    return this.space.profile(u.id);
  }
  @Put("profile") update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.space.updateProfile(u.id, dto);
  }
  /** Reachable without accepting new Terms: someone who refuses them must be able to close their account. */
  @AllowWithoutTerms() @Delete() remove(@CurrentUser() u: AuthUser) {
    return this.space.deleteAccount(u);
  }
}
