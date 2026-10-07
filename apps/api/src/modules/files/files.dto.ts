import { IsIn, IsOptional, IsUUID } from "class-validator";

/** Purposes accepted by the generic upload route (POST /files). */
export const FILE_PURPOSES = ["avatar", "certificate"] as const;
/** Every stored purpose; teaching materials are uploaded through POST /teacher/materials (they need a title and a review). */
export type FilePurpose = (typeof FILE_PURPOSES)[number] | "material";

/** Text fields of the multipart upload (the file itself is the "file" field). */
export class UploadFileDto {
  @IsIn(FILE_PURPOSES) purpose!: (typeof FILE_PURPOSES)[number];
}

/** GET /files?purpose=certificate (&ownerId=… for admins). */
export class ListFilesQuery {
  @IsOptional() @IsIn(FILE_PURPOSES) purpose?: (typeof FILE_PURPOSES)[number];
  @IsOptional() @IsUUID() ownerId?: string;
}
