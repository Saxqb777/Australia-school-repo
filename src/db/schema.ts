import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
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

export interface ArabicCache {
  sourceHash: string;
  strengths: string;
  improvements: string;
  feedback: string;
}

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
    /** Sample data shown before Go live. Deleted, with everything under it, when the school goes live. */
    isDemo: boolean("is_demo").notNull().default(false),
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
    /** Observer's name exactly as on the schedule; kept for team leaders without a login. */
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
    signedByCoordinatorName: text("signed_by_coordinator_name"),
    signedByTeacherName: text("signed_by_teacher_name"),
    /** When the observer shared the completed observation with the teacher's portal. */
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    summaryGeneratedAt: timestamp("summary_generated_at", { withTimezone: true }),
    /** Arabic translation of the teacher-facing text, keyed by a hash of the English it was made from. */
    arabicCache: jsonb("arabic_cache").$type<ArabicCache | null>(),
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

export const deliveryChannelEnum = pgEnum("delivery_channel", ["portal", "copy", "pdf", "email"]);
export const workshopStatusEnum = pgEnum("workshop_status", ["scheduled", "completed", "cancelled"]);

/** How feedback reached the teacher, and when they first opened it in the portal. */
export const feedbackDeliveries = pgTable(
  "feedback_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => observations.id, { onDelete: "cascade" }),
    channel: deliveryChannelEnum("channel").notNull(),
    sentByUserId: uuid("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
  },
  (t) => [index("feedback_deliveries_observation_idx").on(t.observationId)],
);

export const teacherReflections = pgTable("teacher_reflections", {
  id: uuid("id").primaryKey().defaultRandom(),
  observationId: uuid("observation_id")
    .notNull()
    .unique()
    .references(() => observations.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workshops = pgTable("workshops", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  areaId: integer("area_id")
    .notNull()
    .references(() => rubricAreas.id),
  leadTeacherId: uuid("lead_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  time: text("time"),
  location: text("location"),
  criterionCodes: text("criterion_codes").array().notNull().default(sql`'{}'::text[]`),
  status: workshopStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const workshopAttendees = pgTable(
  "workshop_attendees",
  {
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    /** null until attendance is taken. */
    attended: boolean("attended"),
  },
  (t) => [primaryKey({ columns: [t.workshopId, t.teacherId] })],
);

/** A teacher paired with a stronger colleague in one area. */
export const peerPairings = pgTable(
  "peer_pairings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    partnerTeacherId: uuid("partner_teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    areaId: integer("area_id")
      .notNull()
      .references(() => rubricAreas.id),
    note: text("note"),
    introducedAt: timestamp("introduced_at", { withTimezone: true }).notNull().defaultNow(),
    introducedByUserId: uuid("introduced_by_user_id").references(() => users.id, { onDelete: "set null" }),
    isDemo: boolean("is_demo").notNull().default(false),
  },
  (t) => [uniqueIndex("peer_pairings_unique").on(t.teacherId, t.partnerTeacherId, t.areaId)],
);

/** In-app notices (the school does not use email from this system). */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export interface DigestPayload {
  weekStart: string;
  weekEnd: string;
  visitsDone: number;
  visitsOutstanding: number;
  outstandingList: { teacher: string; observer: string; date: string }[];
  topStrengths: { code: string; name: string; mean: number }[];
  topConcerns: { code: string; name: string; mean: number }[];
}

/** The Friday summary for admin, generated by the weekly job. */
export const digests = pgTable("digests", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: date("week_start").notNull(),
  payload: jsonb("payload").$type<DigestPayload>().notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every change to a rating or a judgement override. */
export const ratingAudit = pgTable(
  "rating_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => observations.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id"),
    areaId: integer("area_id"),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    reason: text("reason"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rating_audit_observation_idx").on(t.observationId)],
);

/** Every change to the rubric wording made through the admin editor. */
export const rubricEdits = pgTable("rubric_edits", {
  id: uuid("id").primaryKey().defaultRandom(),
  criterionId: integer("criterion_id")
    .notNull()
    .references(() => rubricCriteria.id, { onDelete: "cascade" }),
  level: integer("level"),
  oldText: text("old_text").notNull(),
  newText: text("new_text").notNull(),
  editedByUserId: uuid("edited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
});

const bytea = customType<{ data: Buffer; driverData: string | Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return `\\x${value.toString("hex")}`;
  },
  fromDriver(value: string | Buffer) {
    if (Buffer.isBuffer(value)) return value;
    return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
  },
});

/** The original file a team leader handed in (PDF, scan or photo), kept so it can be checked against. */
export const peerFiles = pgTable("peer_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

export const peerStatusEnum = pgEnum("peer_status", ["needs_check", "confirmed"]);

/**
 * Observations made by teachers without an observer login, read from the paper or PDF form they hand in.
 * Kept completely apart from official observations: never in the dashboard, experts, workshops or teacher portal.
 */
export const peerObservations = pgTable(
  "peer_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id").references(() => peerFiles.id, { onDelete: "set null" }),
    observerTeacherId: uuid("observer_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    observerName: text("observer_name").notNull().default(""),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    teacherName: text("teacher_name").notNull().default(""),
    className: text("class_name"),
    subject: text("subject"),
    date: date("date"),
    period: integer("period"),
    topic: text("topic"),
    /** criterion id -> level 1..6 */
    ratings: jsonb("ratings").$type<Record<string, number>>().notNull().default({}),
    /** criterion id -> comment */
    comments: jsonb("comments").$type<Record<string, string>>().notNull().default({}),
    strengths: text("strengths"),
    improvements: text("improvements"),
    overallLevel: integer("overall_level"),
    /** What the AI was unsure of, for the coordinator to check against the original. */
    uncertain: jsonb("uncertain").$type<string[]>().notNull().default([]),
    status: peerStatusEnum("status").notNull().default("needs_check"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("peer_observations_teacher_idx").on(t.teacherId), index("peer_observations_observer_idx").on(t.observerTeacherId)],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

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
