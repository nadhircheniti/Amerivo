import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** Student: `{teacherSlug}` — teacher: `{studentId}` (exactly one, checked by the service). */
export class StartConversationDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) teacherSlug?: string;
  @IsOptional() @IsUUID() studentId?: string;
}

export class SendMessageDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class MarkNotificationsReadDto {
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsUUID("all", { each: true }) ids?: string[];
}
