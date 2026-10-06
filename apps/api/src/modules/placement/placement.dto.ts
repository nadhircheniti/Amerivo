import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsUUID, Min } from "class-validator";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** POST /student/placement/test/answer */
export class PlacementAnswerDto {
  @IsUUID() attemptId!: string;
  /** Index of the stage being answered (protects against double submits). */
  @IsInt() @Min(0) stageIndex!: number;
  /** question id → option index (0–3) */
  @IsOptional() @IsObject() answers?: Record<string, number>;
  /** Speaking: levels whose "I can…" statement the student ticked. */
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(CEFR, { each: true }) canDo?: (typeof CEFR)[number][];
  /** Listening only: the device can't play audio. */
  @IsOptional() @IsBoolean() skipSection?: boolean;
}

/** POST /student/placement/test */
export class PlacementStartDto {
  /** Abandon the test in progress and start a new one. */
  @IsOptional() @IsBoolean() restart?: boolean;
}
