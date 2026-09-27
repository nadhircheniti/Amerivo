import { IsIn, IsOptional, IsUUID } from "class-validator";

export const FILE_PURPOSES = ["avatar", "certificate"] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

/** Text fields of the multipart upload (the file itself is the "file" field). */
export class UploadFileDto {
  @IsIn(FILE_PURPOSES) purpose!: FilePurpose;
}

/** GET /files?purpose=certificate (&ownerId=… for admins). */
export class ListFilesQuery {
  @IsOptional() @IsIn(FILE_PURPOSES) purpose?: FilePurpose;
  @IsOptional() @IsUUID() ownerId?: string;
}
