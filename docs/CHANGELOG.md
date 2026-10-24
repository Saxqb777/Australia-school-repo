# Changelog

## Phase 1: Foundation (2026-10-24)

### Added
- Credentials sign-in with bcrypt passwords and three roles: Admin, Observer, Teacher. Every seeded login has a
  temporary password and must choose their own at first sign-in.
- Seed data:
  - The official Teacher Observation Form: 8 areas, 20 criteria, 120 descriptors, transcribed word for word and
    checked word by word against the source document. Also the percentage key, judgement table labels,
    Strengths and Improvements headings, and signature lines.
  - The PYP Inquiry Classroom Visitation Schedule, Term 1 Week 10 (2–6 November 2026): 26 visits, 26 teachers.
  - Logins for the administrator, Ms. Ayan and Ms. Marwa (observers), and every teacher on the schedule.
- Observer register (`/visits`): visits grouped by day with Not started, In progress (n/20) and Complete marks.
- Observation form (`/observe/[visit]`), mirroring the official form:
  - The form's header boxes.
  - Tap-to-rate strip with the form's six levels; tap the chosen level again to clear it.
  - The exact descriptor shown for the chosen level, with "Compare all six descriptors".
  - An optional comment per criterion.
- Saving:
  - Every change saves straight away.
  - Changes are kept on the device while offline and retried with backoff.
  - The page survives a refresh mid-observation.
  - Late-arriving saves never overwrite newer ones (newest wins, per field).
- Judgement table:
  - Area judgement = mean of its criteria, rounded. Overall = mean of the areas.
  - An exact half rounds to the weaker level.
  - Each area and the overall can be overridden, with a required reason.
- Approved Proposed ideas:
  - Percentage key helper on Attainment (4.1) and Progress (5.1).
  - Previous observation peek.
  - Ready-to-complete check.
- Mark complete (locks the ratings) and Reopen.
- Floating step-by-step guided tour for observers (register and form), admin and teachers. It starts on first
  visit, and "Show me how" replays it.
- Export:
  - Observers: Excel workbook (Visits, Ratings, Judgements) or Ratings CSV of their own data.
  - Admin: everything, plus Teachers, Logins (never passwords) and Rubric.
- Admin register (`/admin`): all 26 visits, read-only view of any observation, logins with password reset (new
  temporary password shown once).
- Teacher landing page (`/my`) explaining what will appear in Phase 2.
