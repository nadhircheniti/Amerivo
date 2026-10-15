CREATE TABLE "teacher_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"version" text NOT NULL,
	"text_sha256" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"identity_status" text NOT NULL,
	"identity_session_id" text,
	"record_sha256" text NOT NULL,
	"emailed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "teacher_agreements" ADD CONSTRAINT "teacher_agreements_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_agreements_teacher_version_uq" ON "teacher_agreements" USING btree ("teacher_id","version");--> statement-breakpoint
-- Signatures are evidence: never changed or deleted. Only emailed_at may be set once (copy sent).
CREATE OR REPLACE FUNCTION teacher_agreements_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'teacher_agreements rows cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'emailed_at') IS DISTINCT FROM (to_jsonb(OLD) - 'emailed_at') OR (OLD.emailed_at IS NOT NULL AND NEW.emailed_at IS DISTINCT FROM OLD.emailed_at) THEN
    RAISE EXCEPTION 'teacher_agreements rows cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER teacher_agreements_immutable BEFORE UPDATE OR DELETE ON "teacher_agreements" FOR EACH ROW EXECUTE FUNCTION teacher_agreements_immutable();
