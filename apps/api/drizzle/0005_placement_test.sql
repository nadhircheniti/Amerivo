CREATE TYPE "public"."placement_attempt_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."placement_status" AS ENUM('not_started', 'skipped', 'completed');--> statement-breakpoint
CREATE TABLE "placement_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "placement_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"state" jsonb NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "placement_status" "placement_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "placement_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "placement_attempts_student_idx" ON "placement_attempts" USING btree ("student_id","created_at");--> statement-breakpoint
-- Students placed before the real test existed keep their level.
UPDATE "student_profiles" SET "placement_status" = 'completed' WHERE "cefr_level" IS NOT NULL;
