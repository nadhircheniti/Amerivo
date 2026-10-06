import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const SUPPORT_TOPICS = ["general", "student", "teacher", "billing", "business", "technical"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export const SUPPORT_STATUSES = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/** POST /contact — public contact form. */
export class ContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(200) email!: string;
  @IsIn(SUPPORT_TOPICS) topic!: SupportTopic;
  @IsString() @MinLength(10) @MaxLength(5000) message!: string;
  @IsOptional() @IsString() @MaxLength(10) locale?: string;
  /** Honeypot: hidden from people, filled in by bots. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

/** POST /admin/support/:id/reply */
export class SupportReplyDto {
  @IsString() @MinLength(2) @MaxLength(10000) body!: string;
}

/** POST /admin/support/:id/status */
export class SupportStatusDto {
  @IsIn(SUPPORT_STATUSES) status!: SupportStatus;
}
