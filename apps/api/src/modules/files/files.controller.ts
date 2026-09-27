import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { CurrentUser, Public, type AuthUser } from "../../auth/decorators";
import { ListFilesQuery, UploadFileDto } from "./files.dto";
import { FilesService, MAX_UPLOAD_BYTES, type UploadedFile as Upload } from "./files.service";

/**
 * Small uploads kept in the database (profile photos, certificates).
 * URLs are `/api/files/<id>`, relative to the API origin: the web app prefixes them with the
 * API origin (NEXT_PUBLIC_API_URL without its trailing "/api").
 */
@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /** multipart/form-data: "file" + "purpose" (avatar | certificate). */
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 }, defParamCharset: "utf8" }))
  upload(@CurrentUser() u: AuthUser, @Body() dto: UploadFileDto, @UploadedFile() file?: Upload) {
    return this.files.upload(u, dto.purpose, file);
  }

  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListFilesQuery) {
    return this.files.list(u, q);
  }

  /** Streams the file. Public files (avatars) to anyone; private ones to their owner or an admin. */
  @Public() @Get(":id")
  async read(@Param("id", ParseUUIDPipe) id: string, @Req() req: Request, @Res() res: Response) {
    const viewer = await this.files.viewerFrom(req.headers);
    const f = await this.files.read(id, viewer);
    res.setHeader("Content-Type", f.contentType);
    res.setHeader("Content-Length", String(f.data.length));
    res.setHeader("Content-Disposition", `inline; filename="${f.fileName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(f.fileName)}`);
    // Content never changes for a given id (a new upload gets a new id).
    res.setHeader("Cache-Control", f.isPublic ? "public, max-age=31536000, immutable" : "private, no-store");
    // The web app runs on another origin: allow it to embed the image (helmet defaults to same-origin).
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(f.data);
  }

  @Delete(":id") remove(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.files.remove(u, id);
  }
}
