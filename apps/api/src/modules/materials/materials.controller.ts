import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "../../auth/decorators";
import { MAX_UPLOAD_BYTES, type UploadedFile as Upload } from "../files/files.service";
import { MATERIAL_STATUSES, MaterialsService } from "./materials.service";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class MaterialUploadDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) description?: string;
}

export class MaterialReviewDto {
  @IsIn(["approved", "rejected"]) decision!: "approved" | "rejected";
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/** A teacher's documents: upload (multipart "file" + title + description), list, delete. */
@Controller("teacher/materials")
@Roles("teacher")
export class TeacherMaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 }, defParamCharset: "utf8" }))
  upload(@CurrentUser() u: AuthUser, @Body() dto: MaterialUploadDto, @UploadedFile() file?: Upload) {
    return this.materials.upload(u, dto, file);
  }

  @Get() list(@CurrentUser() u: AuthUser) {
    return this.materials.listOwn(u);
  }

  @Delete(":id") remove(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.materials.remove(u, id);
  }
}

/** Approved documents from the student's teachers. */
@Controller("student/materials")
@Roles("student")
export class StudentMaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get() list(@CurrentUser() u: AuthUser) {
    return this.materials.listForStudent(u);
  }
}

/** Admin review queue for teaching documents. */
@Controller("admin/materials")
@Roles("admin")
export class AdminMaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  /** GET /admin/materials?status=pending|approved|rejected&page= */
  @Get() list(@Query("status") status?: string, @Query("page") page?: string) {
    return this.materials.listForAdmin({ status: MATERIAL_STATUSES.find((s) => s === status), page: /^\d+$/.test(page ?? "") ? Number(page) : 1 });
  }

  @Post(":id/review") @HttpCode(200)
  review(@CurrentUser() admin: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: MaterialReviewDto) {
    return this.materials.review(admin, id, dto.decision, dto.note);
  }
}
