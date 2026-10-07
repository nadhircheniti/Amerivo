ALTER TABLE "moderation_flags" ADD COLUMN "reporter_id" uuid;--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;