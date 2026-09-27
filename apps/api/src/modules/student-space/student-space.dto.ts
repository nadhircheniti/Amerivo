import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

/** PUT /me/profile — every field optional; "" or null clears the optional ones (phone, country, native language). */
export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) lastName?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) country?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) nativeLanguage?: string | null;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

