import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Equals, IsBoolean, IsString, Matches, MaxLength, MinLength } from "class-validator";
import type { Request } from "express";
import { CurrentUser, Public, Roles, type AuthUser } from "../../auth/decorators";
import { clientIp } from "../controllers";
import { AgreementsService } from "./agreements.service";

export class SignAgreementDto {
  @IsString() @MinLength(3) @MaxLength(120) fullName!: string;
  @IsString() @MaxLength(20) version!: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) sha256!: string;
  @IsBoolean() @Equals(true) agree!: boolean;
}

/** The text anyone can read (also before applying). */
@Controller("legal")
export class LegalController {
  constructor(private readonly agreements: AgreementsService) {}

  @Public() @Get("teacher-agreement") teacherAgreement() {
    return this.agreements.current();
  }
}

/** The teacher's own signature: status, sign (typed full name), signed copy, e-mail it again. */
@Controller("teacher/agreement")
@Roles("teacher")
export class TeacherAgreementController {
  constructor(private readonly agreements: AgreementsService) {}

  @Get() status(@CurrentUser() u: AuthUser) {
    return this.agreements.status(u);
  }

  @Post("sign") @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sign(@CurrentUser() u: AuthUser, @Body() dto: SignAgreementDto, @Req() req: Request) {
    return this.agreements.sign(u, dto, { ip: clientIp(req), userAgent: String(req.headers["user-agent"] ?? "") || null });
  }

  @Get("copy") copy(@CurrentUser() u: AuthUser) {
    return this.agreements.signedCopy(u);
  }

  @Post("resend") @HttpCode(200) @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  resend(@CurrentUser() u: AuthUser) {
    return this.agreements.resend(u);
  }
}
