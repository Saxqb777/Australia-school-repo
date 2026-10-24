# ASAD Observation Hub

Teacher observation register for the Australian School of Abu Dhabi (IB PYP). Observers rate lessons on the
school's official Teacher Observation Form. The data then feeds feedback, workshops and peer pairing.

- Stack:
  - Next.js 15 (App Router), strict TypeScript, Tailwind 4.
  - Neon Postgres with Drizzle.
  - Auth.js credentials.
  - Vercel.
- Rubric wording: `src/db/seed-data/rubric.ts` (verbatim from the form).
- Schedule: `src/db/seed-data/schedule.ts`.
- Docs: `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/PROPOSED.md`.

Scripts:
- `npm run db:generate` generates migrations.
- `npm run db:migrate` applies them.
- `npm run db:seed` seeds, idempotently. Set `CREDENTIALS_OUT` to a path outside the repo to receive new
  temporary passwords.
- `npm test` runs the judgement and percentage key tests.
