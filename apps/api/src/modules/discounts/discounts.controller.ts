import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import type { Offer } from "../../domain/pricing";
import { DiscountsService } from "./discounts.service";

export class CreateDiscountDto {
  @IsInt() @Min(1) @Max(100) percent!: number;
  /** Leave empty for a random code. */
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class CheckDiscountDto {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(120) teacherSlug!: string;
  @IsIn(["trial", "single", "pack5", "pack10"]) offer!: Offer;
}

/** Checkout: the student checks a code and sees the new price (the code is reserved only when booking). */
@Controller("discount-codes")
@Roles("student")
export class DiscountCheckController {
  constructor(private readonly discounts: DiscountsService) {}

  // Tight limit: codes can't be found by trying many of them.
  @Post("check") @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  check(@Body() dto: CheckDiscountDto) {
    return this.discounts.preview(dto);
  }
}

/** Admin: one-time discount codes (a percentage, used once in total). */
@Controller("admin/discount-codes")
@Roles("admin")
export class AdminDiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get() list() {
    return this.discounts.list();
  }

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateDiscountDto) {
    return this.discounts.create(u, { percent: dto.percent, code: dto.code, note: dto.note, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined });
  }

  @Post(":id/disable") @HttpCode(200)
  disable(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.discounts.disable(u, id);
  }
}
