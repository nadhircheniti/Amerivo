import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class RegisterDto {
  @IsIn(["student", "teacher"]) role!: "student" | "teacher";
  @IsEmail() email!: string;
  @IsString() @MaxLength(80) firstName!: string;
  @IsString() @MaxLength(80) lastName!: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(80) nativeLanguage?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsString() timezone!: string;
  /** Required for students (13+). yyyy-mm-dd */
  @IsOptional() @IsDateString() birthDate?: string;
}

export class CreateBookingDto {
  @IsString() teacherSlug!: string;
  @IsIn(["trial", "single", "pack5", "pack10", "from_package"]) offer!: "trial" | "single" | "pack5" | "pack10" | "from_package";
  @IsDateString() startsAt!: string;
  @IsOptional() @IsString() packageId?: string;
  @IsOptional() @IsString() @MaxLength(200) topic?: string;
}

export class CancelDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CompleteDto {
  @IsOptional() @IsIn(["attended", "late", "no_show"]) attendance?: "attended" | "late" | "no_show";
}

export class ReportDto {
  @IsString() @MaxLength(2000) topicsCovered!: string;
  @IsOptional() @IsString() @MaxLength(2000) strengths?: string;
  @IsOptional() @IsString() @MaxLength(2000) developmentAreas?: string;
  @IsOptional() @IsString() @MaxLength(2000) homework?: string;
  @IsOptional() @IsDateString() homeworkDue?: string;
  @IsOptional() @IsString() @MaxLength(2000) recommendation?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) privateFluency?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) privateAccuracy?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) privateEngagement?: number;
}

export class ReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class NotesDto {
  @IsString() @MaxLength(20000) notes!: string;
}

export class PlacementDto {
  @IsIn(["business", "travel", "university", "immigration", "conversation"]) goal!: "business" | "travel" | "university" | "immigration" | "conversation";
  @IsIn(["beginner", "intermediate", "advanced"]) selfLevel!: "beginner" | "intermediate" | "advanced";
  @IsIn(["female", "male", "no_preference"]) preferredTeacherGender!: "female" | "male" | "no_preference";
  @IsArray() @IsIn(["morning", "afternoon", "evening", "weekend"], { each: true }) preferredTimes!: ("morning" | "afternoon" | "evening" | "weekend")[];
}

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
export class TestResultDto {
  @IsOptional() @IsIn(CEFR) grammar?: "A1";
  @IsOptional() @IsIn(CEFR) reading?: "A1";
  @IsOptional() @IsIn(CEFR) listening?: "A1";
  @IsOptional() @IsIn(CEFR) speaking?: "A1";
}

export class RuleDto {
  @IsInt() @Min(1) @Max(7) weekday!: number;
  @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @IsInt() @Min(1) @Max(1440) endMinute!: number;
}
export class RulesDto {
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RuleDto) rules!: RuleDto[];
}

export class BlockedDateDto {
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
}

export class ToggleDto {
  @IsBoolean() on!: boolean;
}

class LanguageDto {
  @IsString() language!: string;
  @IsString() level!: string;
}
class CertificationDto {
  @IsString() name!: string;
  @IsOptional() @IsUrl() fileUrl?: string;
}
export class TeacherProfileDto {
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(3000) bio?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsIn(["female", "male", "other"]) gender?: "female" | "male" | "other";
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @MaxLength(200) education?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) yearsExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsArray() @IsIn(["adults", "teens"], { each: true }) teaches?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LanguageDto) languages?: LanguageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CertificationDto) certifications?: CertificationDto[];
  @IsOptional() @IsInt() @Min(2000) @Max(5000) priceCents?: number;
  @IsOptional() @IsBoolean() offersPack5?: boolean;
  @IsOptional() @IsBoolean() offersPack10?: boolean;
  @IsOptional() @IsBoolean() offersTrial?: boolean;
  @IsOptional() @IsUrl() introVideoUrl?: string;
}

export class DecisionDto {
  @IsIn(["approved", "rejected", "suspended", "pending"]) decision!: "approved" | "rejected" | "suspended" | "pending";
  @IsOptional() evaluation?: Record<string, number>;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class RefundDto {
  @IsString() @MaxLength(500) reason!: string;
}

export class UserStatusDto {
  @IsIn(["active", "blocked"]) status!: "active" | "blocked";
}
