import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** POST /bookings/:id/dispute — the student explains what went wrong. */
export class OpenDisputeDto {
  @IsString() @MinLength(10) @MaxLength(2000) reason!: string;
}

/** POST /admin/disputes/:id/resolve */
export class ResolveDisputeDto {
  @IsIn(["refund", "reject"]) decision!: "refund" | "reject";
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
