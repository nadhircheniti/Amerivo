import { Body, Controller, Get, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { PlacementAnswerDto, PlacementStartDto } from "./placement.dto";
import { PlacementService } from "./placement.service";

/** Student placement test (goals are saved with PUT /student/placement). */
@Controller("student/placement")
@Roles("student")
export class PlacementController {
  constructor(private readonly placement: PlacementService) {}

  @Get() status(@CurrentUser() u: AuthUser) {
    return this.placement.status(u.id);
  }

  @Post("test")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  start(@CurrentUser() u: AuthUser, @Body() dto: PlacementStartDto) {
    return this.placement.start(u.id, dto.restart);
  }

  @Post("test/answer") answer(@CurrentUser() u: AuthUser, @Body() dto: PlacementAnswerDto) {
    return this.placement.answer(u.id, dto);
  }

  @Post("skip") skip(@CurrentUser() u: AuthUser) {
    return this.placement.skip(u.id);
  }

  @Get("review") review(@CurrentUser() u: AuthUser) {
    return this.placement.review(u.id);
  }
}
