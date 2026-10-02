CREATE TYPE "public"."support_status" AS ENUM('open', 'answered', 'closed');--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"locale" text,
	"user_id" uuid,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"last_reply_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_replies" ADD CONSTRAINT "support_replies_message_id_support_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."support_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_replies" ADD CONSTRAINT "support_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_status_idx" ON "support_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_replies_msg_idx" ON "support_replies" USING btree ("message_id","created_at");