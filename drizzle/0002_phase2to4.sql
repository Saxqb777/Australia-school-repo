CREATE TYPE "public"."delivery_channel" AS ENUM('portal', 'copy', 'pdf', 'email');--> statement-breakpoint
CREATE TYPE "public"."workshop_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"payload" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observation_id" uuid NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"sent_by_user_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"partner_teacher_id" uuid NOT NULL,
	"area_id" integer NOT NULL,
	"note" text,
	"introduced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"introduced_by_user_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observation_id" uuid NOT NULL,
	"criterion_id" integer,
	"area_id" integer,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"changed_by_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criterion_id" integer NOT NULL,
	"level" integer,
	"old_text" text NOT NULL,
	"new_text" text NOT NULL,
	"edited_by_user_id" uuid,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observation_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_reflections_observation_id_unique" UNIQUE("observation_id")
);
--> statement-breakpoint
CREATE TABLE "workshop_attendees" (
	"workshop_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"attended" boolean,
	CONSTRAINT "workshop_attendees_workshop_id_teacher_id_pk" PRIMARY KEY("workshop_id","teacher_id")
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"area_id" integer NOT NULL,
	"lead_teacher_id" uuid,
	"date" date NOT NULL,
	"time" text,
	"location" text,
	"criterion_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "workshop_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observation_cycles" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "signed_by_coordinator_name" text;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "signed_by_teacher_name" text;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "arabic_cache" jsonb;--> statement-breakpoint
ALTER TABLE "feedback_deliveries" ADD CONSTRAINT "feedback_deliveries_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_deliveries" ADD CONSTRAINT "feedback_deliveries_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_pairings" ADD CONSTRAINT "peer_pairings_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_pairings" ADD CONSTRAINT "peer_pairings_partner_teacher_id_teachers_id_fk" FOREIGN KEY ("partner_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_pairings" ADD CONSTRAINT "peer_pairings_area_id_rubric_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."rubric_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_pairings" ADD CONSTRAINT "peer_pairings_introduced_by_user_id_users_id_fk" FOREIGN KEY ("introduced_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_audit" ADD CONSTRAINT "rating_audit_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_audit" ADD CONSTRAINT "rating_audit_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_edits" ADD CONSTRAINT "rubric_edits_criterion_id_rubric_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_edits" ADD CONSTRAINT "rubric_edits_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reflections" ADD CONSTRAINT "teacher_reflections_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reflections" ADD CONSTRAINT "teacher_reflections_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_attendees" ADD CONSTRAINT "workshop_attendees_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_attendees" ADD CONSTRAINT "workshop_attendees_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_area_id_rubric_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."rubric_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_lead_teacher_id_teachers_id_fk" FOREIGN KEY ("lead_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_deliveries_observation_idx" ON "feedback_deliveries" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "peer_pairings_unique" ON "peer_pairings" USING btree ("teacher_id","partner_teacher_id","area_id");--> statement-breakpoint
CREATE INDEX "rating_audit_observation_idx" ON "rating_audit" USING btree ("observation_id");--> statement-breakpoint
INSERT INTO "app_settings" ("key", "value") VALUES ('mode', 'demo') ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
UPDATE "users" SET "username" = 'admin', "name" = 'Administrator', "email" = NULL WHERE "role" = 'ADMIN' AND "username" <> 'admin';
