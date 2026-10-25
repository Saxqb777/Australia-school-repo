# Changelog

## A new welcome and simpler guides (2026-10-25)
- **Welcome story** on first sign-in: a full-screen intro of three or four parts, one idea in each, with a small
  live demonstration.
  - **Ms. Ayan and Ms. Marwa:**
    - Their real week of visits.
    - The real first criterion to try: tap a level and the form's exact words appear.
    - A letter that types itself from ratings.
    - "Saved, even offline", then Share and the teacher's notice arriving.
    - It ends on "Open my next visit".
  - **Teachers**, in English with Arabic under each part:
    - The notice arriving.
    - An English and Arabic switch to try.
    - A Sign button that stamps an electronic signature, followed by a reflection.
  - **Administrator:**
    - Who sees what, as a grid of ticked boxes.
    - Switch role.
    - Go live, typed out.
  - Skip intro is always there. It works with a keyboard and by swiping on a phone, and respects reduced motion.
- **"Your first steps" checklist** on My visits (coordinators) and My observations (teachers):
  - Four boxes that tick themselves as the person really does each thing.
  - Coordinators: rate a lesson, draft the letter with AI, mark complete and sign, share.
  - Teachers: open, read in Arabic, sign, reflect.
  - The next step links straight to the right visit. It can be closed once finished.
- **Shorter page guides:** at most four steps a page, one sentence each. A page guide waits until the welcome story
  is closed. **Watch the intro** on a guide's first step plays the story again, including on the observation form.
- Go live and Reset the demo start the story, guides and checklist afresh.

## "Peer observations" renamed to "Team leader observations" (2026-10-25)
- The menu, page titles, upload box, review screen, comparison table and sample form now say **Team leader
  observations** and **team leader** instead of "peer observations" and "peer observer".
- Nothing else changed: the web address stays `/peer`, existing records are untouched, and the dashboard's
  **Peer pairing** keeps its name because it is a different feature.

## Coordinator access, peer observations, import from any file (2026-10-25)
- **Ms. Ayan and Ms. Marwa run the system:**
  - They have every page the administrator has: register, setup, schedule import, people, password resets, rubric
    wording, workshops, pairing, audit log and full exports.
  - They see every observation and change only their own.
  - Go live and Reset demo stay with the administrator.
- **Peer observations**, a separate section:
  - Upload the completed form a peer observer hands in: a PDF, a scan or a photo, typed or handwritten. The AI reads
    the names, class, date, every rating, comments, strengths and improvements.
  - Anything unclear is flagged. The coordinator checks it next to the original, corrects it and confirms.
  - "How each peer observer rates" compares each peer observer's ratings with the coordinators' own latest
    observation of the same teachers.
  - Never counted in the dashboard, experts, workshops or a teacher's own page. Visible only to the coordinators
    and the administrator.
- **Schedule import from any file:**
  - Excel (.xlsx), including merged observer cells, and CSV are read directly.
  - PDF, Word (.docx) and photos are read by AI into the preview table for checking before import.

## Phases 2, 3 and 4, with demo mode and Go live (2026-10-24)

### Phase 2: AI feedback
- **Write summary with AI** (Claude Sonnet 5.5, server side only). From the ratings, the form's exact descriptors and
  the observer's comments, it drafts:
  - Areas of Strength (3 to 5 lines)
  - Suggested Areas for Improvement (2 to 4 lines)
  - A 150 to 220 word message: opens "Dear …", closes "Kind regards," and the observer's name, British English, no
    dashes, nothing that isn't in the evidence.
- The server checks every rule and asks the AI once more if one is broken. The form shows any rule still not met.
- Everything is editable and saves automatically. All three boxes are required before Mark complete.
- PDF laid out like the official form, landscape:
  - All six descriptor columns, with the chosen level ticked and shaded.
  - Comments, the percentage key and the judgement table.
  - Strengths and improvements, plus the signature lines with electronic signature stamps.
  - A final page with the feedback message.
- Electronic signatures for the coordinator (the observer) and the teacher.
- Sharing happens in the app; there is no email. A copy button is available too, and every delivery (portal, copy,
  PDF) and the teacher's first opening are recorded.
- Teacher portal:
  - Each teacher sees only their own shared observations.
  - They read the feedback, see their ratings with the exact descriptors, sign, and send a reflection that the
    observer sees.
- Arabic toggle on the teacher page. The labels, strengths, improvements and message switch to Arabic; the rubric
  stays in English as on the official form.

### Phase 3: analytics and workshops
- Dashboard for admin and observers:
  - Filters by cycle, observer, subject and grade band.
  - School average per area and per criterion on the form's scale.
  - Heatmap of every teacher against every criterion (navy scale, with level letters in each cell).
- Experts (Very Good or Outstanding in an area) and teachers needing support (Acceptable or below).
- Workshop plan for the weakest areas: who attends, who leads, which criteria to cover. Admin schedules one with a
  click and attendees and the lead get an in-app notice.
- Workshops page:
  - Attendance, complete, cancel.
  - Each attendee's area level before and after the workshop (whether it moved the needle).
- Peer pairing: each flagged teacher matched with the strongest colleague in that area. Same grade band is
  preferred, and no colleague supports more than two people. **Introduce** sends both an in-app notice.
- Teacher progress page: every completed observation side by side, with the change on every criterion since the
  previous one.
- Dashboard export to Excel.

### Phase 4: polish and scale
- Setup:
  - Create cycles.
  - Import a visitation schedule by pasting the table or uploading a CSV, with a preview first. Blank observer
    cells repeat the one above, and new teachers get logins.
  - Add teachers and observers.
  - Make a teacher an observer, or an observer a teacher.
- Rubric wording editor, with a full history of old and new wording.
- Friday summary every Friday at 16:00 UAE time (Vercel cron): visits done, outstanding, top strengths, top
  concerns. Shown on the admin page and in notifications, with a "make it now" button.
- Audit log of every rating and judgement change: old value, new value, who and when.
- Notifications page and bell, which replace email throughout.
- Accessibility:
  - Skip link, labelled navigation and `aria-current`.
  - Native radios for every rating, keyboard reachable heatmap cells with text equivalents.
  - Visible focus, and colour never the only signal.

### Demo mode and Go live
- The system starts in **demo mode**:
  - The sign-in page offers one click to view as the Administrator, Ms. Ayan, Ms. Marwa or any teacher.
  - Sample weeks use real staff names with clearly labelled sample ratings (a banner on every page, and a label on
    every demo PDF).
  - Password sign-in is closed.
- **Go live** (admin only, type GO LIVE to confirm):
  - Deletes every piece of demo data.
  - Restarts the tours.
  - Opens password sign-in with the real Week 10 schedule.
- **Reset the demo** rebuilds the demo for the next presentation.
- The administrator now appears only as "Administrator" with the username `admin`; no personal name or email
  appears anywhere in the app, exports or PDFs.

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
