CREATE TYPE "public"."peer_status" AS ENUM('needs_check', 'confirmed');--> statement-breakpoint
CREATE TABLE "peer_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid,
	"observer_teacher_id" uuid,
	"observer_name" text DEFAULT '' NOT NULL,
	"teacher_id" uuid,
	"teacher_name" text DEFAULT '' NOT NULL,
	"class_name" text,
	"subject" text,
	"date" date,
	"period" integer,
	"topic" text,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strengths" text,
	"improvements" text,
	"overall_level" integer,
	"uncertain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "peer_status" DEFAULT 'needs_check' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "peer_observations" ADD CONSTRAINT "peer_observations_file_id_peer_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."peer_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_observations" ADD CONSTRAINT "peer_observations_observer_teacher_id_teachers_id_fk" FOREIGN KEY ("observer_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_observations" ADD CONSTRAINT "peer_observations_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_observations" ADD CONSTRAINT "peer_observations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_observations" ADD CONSTRAINT "peer_observations_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "peer_observations_teacher_idx" ON "peer_observations" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "peer_observations_observer_idx" ON "peer_observations" USING btree ("observer_teacher_id");