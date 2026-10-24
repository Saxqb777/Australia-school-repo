CREATE TYPE "public"."grade_band" AS ENUM('KG', 'LOWER_PRIMARY', 'UPPER_PRIMARY');--> statement-breakpoint
CREATE TYPE "public"."observation_status" AS ENUM('draft', 'complete');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'OBSERVER', 'TEACHER');--> statement-breakpoint
CREATE TABLE "area_judgements" (
	"observation_id" uuid NOT NULL,
	"area_id" integer NOT NULL,
	"override_level" integer,
	"reason" text,
	"client_ts" timestamp (3) with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "area_judgements_observation_id_area_id_pk" PRIMARY KEY("observation_id","area_id"),
	CONSTRAINT "area_judgements_override_range" CHECK ("area_judgements"."override_level" is null or "area_judgements"."override_level" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "observation_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year" text NOT NULL,
	"term" integer NOT NULL,
	"week" integer NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_ratings" (
	"observation_id" uuid NOT NULL,
	"criterion_id" integer NOT NULL,
	"level" integer,
	"comment" text,
	"level_client_ts" timestamp (3) with time zone,
	"comment_client_ts" timestamp (3) with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "observation_ratings_observation_id_criterion_id_pk" PRIMARY KEY("observation_id","criterion_id"),
	CONSTRAINT "observation_ratings_level_range" CHECK ("observation_ratings"."level" is null or "observation_ratings"."level" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"observed_date" date,
	"time" text,
	"length_of_observation" text,
	"title" text,
	"subject" text,
	"topic" text,
	"number_on_roll" integer,
	"number_present" integer,
	"overall_override_level" integer,
	"overall_override_reason" text,
	"strengths_text" text,
	"improvements_text" text,
	"feedback_text" text,
	"status" "observation_status" DEFAULT 'draft' NOT NULL,
	"completed_at" timestamp with time zone,
	"signed_by_teacher_at" timestamp with time zone,
	"signed_by_coordinator_at" timestamp with time zone,
	"field_clock" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "observations_visit_id_unique" UNIQUE("visit_id"),
	CONSTRAINT "observations_override_range" CHECK ("observations"."overall_override_level" is null or "observations"."overall_override_level" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "rubric_areas" (
	"id" integer PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"judgement_label" text NOT NULL,
	CONSTRAINT "rubric_areas_position_unique" UNIQUE("position")
);
--> statement-breakpoint
CREATE TABLE "rubric_criteria" (
	"id" integer PRIMARY KEY NOT NULL,
	"area_id" integer NOT NULL,
	"position" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "rubric_criteria_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rubric_descriptors" (
	"criterion_id" integer NOT NULL,
	"level" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "rubric_descriptors_criterion_id_level_pk" PRIMARY KEY("criterion_id","level"),
	CONSTRAINT "rubric_descriptors_level_range" CHECK ("rubric_descriptors"."level" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid,
	"subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"grade_band" "grade_band",
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_name_unique" UNIQUE("name"),
	CONSTRAINT "teachers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"role" "role" NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"observer_user_id" uuid,
	"observer_name" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_name" text NOT NULL,
	"subject" text NOT NULL,
	"date" date NOT NULL,
	"period" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area_judgements" ADD CONSTRAINT "area_judgements_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_judgements" ADD CONSTRAINT "area_judgements_area_id_rubric_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."rubric_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_ratings" ADD CONSTRAINT "observation_ratings_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_ratings" ADD CONSTRAINT "observation_ratings_criterion_id_rubric_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_area_id_rubric_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."rubric_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_descriptors" ADD CONSTRAINT "rubric_descriptors_criterion_id_rubric_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_cycle_id_observation_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."observation_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_observer_user_id_users_id_fk" FOREIGN KEY ("observer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "observation_cycles_year_term_week" ON "observation_cycles" USING btree ("academic_year","term","week");--> statement-breakpoint
CREATE INDEX "visits_observer_idx" ON "visits" USING btree ("observer_user_id");--> statement-breakpoint
CREATE INDEX "visits_teacher_idx" ON "visits" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visits_slot_unique" ON "visits" USING btree ("cycle_id","teacher_id","date","period");