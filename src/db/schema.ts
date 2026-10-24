import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "OBSERVER", "TEACHER"]);
export const gradeBandEnum = pgEnum("grade_band", ["KG", "LOWER_PRIMARY", "UPPER_PRIMARY"]);
export const observationStatusEnum = pgEnum("observation_status", ["draft", "complete"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  role: roleEnum("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  /** Guided tours this user has finished or skipped, by tour key (for example "visits", "observe"). */
  toursCompleted: text("tours_completed").array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  userId: uuid("user_id")
    .unique()
    .references(() => users.id, { onDelete: "set null" }),
  subjects: text("subjects").array().notNull().default(sql`'{}'::text[]`),
  gradeBand: gradeBandEnum("grade_band"),
  email: text("email"),
  createdAt: createdAt(),
});

export const observationCycles = pgTable(
  "observation_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYear: text("academic_year").notNull(),
    term: integer("term").notNull(),
    week: integer("week").notNull(),
    label: text("label").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("observation_cycles_year_term_week").on(t.academicYear, t.term, t.week)],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => observationCycles.id, { onDelete: "cascade" }),
    /** Set when the observer has a login (Ms. Ayan, Ms. Marwa). */
    observerUserId: uuid("observer_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Observer's name exactly as on the schedule; kept for peer observers without a login. */
    observerName: text("observer_name").notNull(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    className: text("class_name").notNull(),
    subject: text("subject").notNull(),
    date: date("date").notNull(),
    period: integer("period").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("visits_observer_idx").on(t.observerUserId),
    index("visits_teacher_idx").on(t.teacherId),
    uniqueIndex("visits_slot_unique").on(t.cycleId, t.teacherId, t.date, t.period),
  ],
);

export const rubricAreas = pgTable("rubric_areas", {
  id: integer("id").primaryKey(),
  position: integer("position").notNull().unique(),
  name: text("name").notNull(),
  judgementLabel: text("judgement_label").notNull(),
});

export const rubricCriteria = pgTable("rubric_criteria", {
  id: integer("id").primaryKey(),
  areaId: integer("area_id")
    .notNull()
    .references(() => rubricAreas.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
});

export const rubricDescriptors = pgTable(
  "rubric_descriptors",
  {
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => rubricCriteria.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
    text: text("text").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.criterionId, t.level] }),
    check("rubric_descriptors_level_range", sql`${t.level} between 1 and 6`),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .unique()
      .references(() => visits.id, { onDelete: "cascade" }),
    observedDate: date("observed_date"),
    time: text("time"),
    lengthOfObservation: text("length_of_observation"),
    title: text("title"),
    subject: text("subject"),
    topic: text("topic"),
    numberOnRoll: integer("number_on_roll"),
    numberPresent: integer("number_present"),
    overallOverrideLevel: integer("overall_override_level"),
    overallOverrideReason: text("overall_override_reason"),
    strengthsText: text("strengths_text"),
    improvementsText: text("improvements_text"),
    feedbackText: text("feedback_text"),
    status: observationStatusEnum("status").notNull().default("draft"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    signedByTeacherAt: timestamp("signed_by_teacher_at", { withTimezone: true }),
    signedByCoordinatorAt: timestamp("signed_by_coordinator_at", { withTimezone: true }),
    /** Per-field client timestamps (ms) so late-arriving offline saves never overwrite newer edits. */
    fieldClock: jsonb("field_clock").$type<Record<string, number>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "observations_override_range",
      sql`${t.overallOverrideLevel} is null or ${t.overallOverrideLevel} between 1 and 6`,
    ),
  ],
);

export const observationRatings = pgTable(
  "observation_ratings",
  {
    observationId: uuid("observation_id")
      .notNull()
      .references(() => observations.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => rubricCriteria.id),
    level: integer("level"),
    comment: text("comment"),
    levelClientTs: timestamp("level_client_ts", { withTimezone: true, precision: 3 }),
    commentClientTs: timestamp("comment_client_ts", { withTimezone: true, precision: 3 }),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.observationId, t.criterionId] }),
    check("observation_ratings_level_range", sql`${t.level} is null or ${t.level} between 1 and 6`),
  ],
);

/** Observer's override of the computed area judgement, with the reason the form's table now records. */
export const areaJudgements = pgTable(
  "area_judgements",
  {
    observationId: uuid("observation_id")
      .notNull()
      .references(() => observations.id, { onDelete: "cascade" }),
    areaId: integer("area_id")
      .notNull()
      .references(() => rubricAreas.id),
    overrideLevel: integer("override_level"),
    reason: text("reason"),
    clientTs: timestamp("client_ts", { withTimezone: true, precision: 3 }),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.observationId, t.areaId] }),
    check(
      "area_judgements_override_range",
      sql`${t.overrideLevel} is null or ${t.overrideLevel} between 1 and 6`,
    ),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  teacher: one(teachers, { fields: [users.id], references: [teachers.userId] }),
  visits: many(visits),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, { fields: [teachers.userId], references: [users.id] }),
  visits: many(visits),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  cycle: one(observationCycles, { fields: [visits.cycleId], references: [observationCycles.id] }),
  observer: one(users, { fields: [visits.observerUserId], references: [users.id] }),
  teacher: one(teachers, { fields: [visits.teacherId], references: [teachers.id] }),
  observation: one(observations, { fields: [visits.id], references: [observations.visitId] }),
}));

export const observationsRelations = relations(observations, ({ one, many }) => ({
  visit: one(visits, { fields: [observations.visitId], references: [visits.id] }),
  ratings: many(observationRatings),
  areaJudgements: many(areaJudgements),
}));

export const observationRatingsRelations = relations(observationRatings, ({ one }) => ({
  observation: one(observations, {
    fields: [observationRatings.observationId],
    references: [observations.id],
  }),
  criterion: one(rubricCriteria, {
    fields: [observationRatings.criterionId],
    references: [rubricCriteria.id],
  }),
}));

export const areaJudgementsRelations = relations(areaJudgements, ({ one }) => ({
  observation: one(observations, {
    fields: [areaJudgements.observationId],
    references: [observations.id],
  }),
}));

export const rubricAreasRelations = relations(rubricAreas, ({ many }) => ({
  criteria: many(rubricCriteria),
}));

export const rubricCriteriaRelations = relations(rubricCriteria, ({ one, many }) => ({
  area: one(rubricAreas, { fields: [rubricCriteria.areaId], references: [rubricAreas.id] }),
  descriptors: many(rubricDescriptors),
}));

export const rubricDescriptorsRelations = relations(rubricDescriptors, ({ one }) => ({
  criterion: one(rubricCriteria, {
    fields: [rubricDescriptors.criterionId],
    references: [rubricCriteria.id],
  }),
}));
