CREATE TABLE "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"percent" smallint NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by" uuid,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "discount_percent_range" CHECK ("discount_codes"."percent" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_code_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "earning_base_cents" integer;--> statement-breakpoint
ALTER TABLE "lesson_packages" ADD COLUMN "discount_code_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_packages" ADD COLUMN "earning_base_cents" integer;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_packages" ADD CONSTRAINT "lesson_packages_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;