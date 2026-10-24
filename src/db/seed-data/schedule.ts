// Transcribed from "PYP Inquiry Classroom Visitation Schedule – Term 1 (2026–2027)", Week 10: 02–06 November 2026.
// Names are kept exactly as written on the schedule (including "Ms. Svitilana").

export const CYCLE = {
  term: 1,
  week: 10,
  academicYear: "2026–2027",
  label: "Term 1, Week 10",
  startDate: "2026-11-02",
  endDate: "2026-11-06",
} as const;

export const DAY_DATES = {
  Monday: "2026-11-02",
  Tuesday: "2026-11-03",
  Wednesday: "2026-11-04",
  Thursday: "2026-11-05",
  Friday: "2026-11-06",
} as const;

export type ScheduleDay = keyof typeof DAY_DATES;

export interface ScheduleRow {
  observer: string;
  teacher: string;
  className: string;
  subject: string;
  day: ScheduleDay;
  period: number;
}

export const SCHEDULE: ScheduleRow[] = [
  { observer: "Ms. Ayan", teacher: "Ms. Cornelia", className: "KG2A", subject: "English", day: "Monday", period: 3 },
  { observer: "Ms. Ayan", teacher: "Ms. Rana", className: "1A", subject: "English", day: "Monday", period: 6 },
  { observer: "Ms. Ayan", teacher: "Ms. Mona", className: "4A", subject: "Music", day: "Monday", period: 7 },
  { observer: "Ms. Ayan", teacher: "Ms. Asmaa Aly", className: "KG1A", subject: "UOI", day: "Tuesday", period: 2 },
  { observer: "Ms. Ayan", teacher: "Ms. Walaa", className: "3A", subject: "Science", day: "Thursday", period: 1 },
  { observer: "Ms. Ayan", teacher: "Ms. Riham", className: "2A", subject: "English", day: "Thursday", period: 3 },
  { observer: "Ms. Ayan", teacher: "Ms. Oras", className: "4B", subject: "Math", day: "Friday", period: 2 },
  { observer: "Ms. Marwa", teacher: "Ms. Maha", className: "4B", subject: "PSPE", day: "Monday", period: 3 },
  { observer: "Ms. Marwa", teacher: "Ms. Shaheeda", className: "5B", subject: "UOI", day: "Tuesday", period: 1 },
  { observer: "Ms. Marwa", teacher: "Ms. Hanan", className: "4A", subject: "Arabic", day: "Tuesday", period: 2 },
  { observer: "Ms. Marwa", teacher: "Ms. Wafaa", className: "5B", subject: "Social Studies", day: "Wednesday", period: 1 },
  { observer: "Ms. Marwa", teacher: "Ms. Amira", className: "5A", subject: "Islamic", day: "Thursday", period: 5 },
  { observer: "Ms. Asmaa Aly", teacher: "Ms. Ola", className: "KG1A", subject: "Arabic", day: "Wednesday", period: 2 },
  { observer: "Ms. Asmaa Aly", teacher: "Ms. Svitilana", className: "KG1B", subject: "English", day: "Wednesday", period: 6 },
  { observer: "Ms. Cornelia", teacher: "Ms. Irimia", className: "KG2C", subject: "English", day: "Monday", period: 1 },
  { observer: "Ms. Cornelia", teacher: "Ms. Oksana", className: "KG2B", subject: "UOI", day: "Tuesday", period: 6 },
  { observer: "Ms. Cornelia", teacher: "Ms. Naglaa", className: "KG2D", subject: "English", day: "Wednesday", period: 3 },
  { observer: "Ms. Rana", teacher: "Ms. Arshia", className: "1B", subject: "Science", day: "Monday", period: 2 },
  { observer: "Ms. Rana", teacher: "Ms. Asmaa Shehata", className: "1A", subject: "Arabic", day: "Tuesday", period: 4 },
  { observer: "Ms. Riham", teacher: "Ms. Abir", className: "2A", subject: "Arabic", day: "Wednesday", period: 2 },
  { observer: "Ms. Riham", teacher: "Ms. Afaf", className: "2B", subject: "Math", day: "Thursday", period: 4 },
  { observer: "Ms. Walaa", teacher: "Ms. Saadia", className: "3B", subject: "Math", day: "Wednesday", period: 5 },
  { observer: "Ms. Walaa", teacher: "Ms. Fatma Hassan", className: "3B", subject: "Arabic", day: "Thursday", period: 7 },
  { observer: "Ms. Amira", teacher: "Ms. Samah", className: "3B", subject: "Islamic", day: "Tuesday", period: 1 },
  { observer: "Ms. Amira", teacher: "Ms. Sawsan", className: "3A", subject: "Islamic", day: "Tuesday", period: 4 },
  { observer: "Ms. Wafaa", teacher: "Ms. Gihan", className: "3A", subject: "Social Studies", day: "Thursday", period: 7 },
];

/** Observers who get an observer login. Every other observer on the schedule is seeded as a teacher only. */
export const OBSERVER_USERS = [
  { name: "Ms. Ayan", username: "ayan" },
  { name: "Ms. Marwa", username: "marwa" },
] as const;

export const ADMIN_USER = { name: "Administrator", username: "admin" } as const;
