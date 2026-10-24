import type { TourStep } from "@/components/GuidedTour";

export const VISITS_TOUR: TourStep[] = [
  {
    title: "Welcome to the Observation Hub",
    body: "This is your observation register for the week. It replaces the paper Teacher Observation Form, with the same wording, and saves as you go.",
  },
  {
    target: "week",
    title: "Your week at a glance",
    body: "Your visits are listed by day with the period, teacher, class and subject from the visitation schedule.",
  },
  {
    target: "first-visit",
    title: "Open a visit to observe",
    body: "Tap a visit when the lesson starts. The form opens with the teacher, class and subject already filled in.",
  },
  {
    target: "status-key",
    title: "Track where you are",
    body: "Each visit shows Not started, In progress with how many of the 20 criteria are rated, or Complete.",
  },
  {
    target: "export",
    title: "Keep your own copy",
    body: "Download your visits, ratings and comments as an Excel workbook or a CSV file whenever you need a copy.",
  },
  {
    target: "replay",
    title: "Help is always here",
    body: "Tap Show me how on any page to see this guide again. Open your first visit to take the short tour of the form.",
  },
];

export const OBSERVE_TOUR: TourStep[] = [
  {
    target: "lesson-details",
    title: "Lesson details first",
    body: "These are the header boxes from the official form. Fill in the time, length, topic and the number on roll and present.",
  },
  {
    target: "first-criterion",
    title: "Tap to rate",
    body: "Each criterion has the form's six columns, from Outstanding to Very Weak. Tap one with your thumb. Tap it again to clear it.",
  },
  {
    target: "first-criterion",
    title: "The exact descriptor appears",
    body: "When you choose a level, the form's own descriptor for that level appears under it, word for word, so you can check your judgement.",
  },
  {
    target: "save-status",
    title: "Everything saves by itself",
    body: "Every tap and every word saves straight away. With no signal, changes are kept on this phone and sent when you are back online. Refreshing the page loses nothing.",
  },
  {
    target: "area-nav",
    title: "Jump between areas",
    body: "Use the numbers 1 to 8 to move between the eight areas. A filled square means every criterion in that area is rated.",
  },
  {
    target: "judgement",
    title: "The judgement is worked out for you",
    body: "Each area is the average of its criteria, and the overall judgement is the average of the areas. You can change any of them, but you must give a reason.",
  },
  {
    target: "feedback",
    title: "Let the AI write the first draft",
    body: "Once at least 10 criteria are rated, Write summary drafts the Areas of Strength, the Suggested Areas for Improvement and a 150 to 220 word message to the teacher, using only your ratings, the descriptors and your comments. Edit anything you like.",
  },
  {
    target: "complete",
    title: "Finish, sign and share",
    body: "Mark the observation complete when everything is filled in. Then open the official PDF, sign electronically as coordinator, and share it with the teacher. They read it, sign it and can reply with a reflection that appears here.",
  },
];

export const ADMIN_TOUR: TourStep[] = [
  {
    title: "Administrator view",
    body: "You can see every visit on the schedule, every observation and every login. Observers only ever see their own visits.",
  },
  {
    target: "admin-visits",
    title: "All visits",
    body: "Every visit for the week, with its observer and status. Open any visit to read the observation.",
  },
  {
    target: "admin-users",
    title: "Logins",
    body: "Everyone's username and whether they have chosen their own password yet. Reset a password here if someone is locked out.",
  },
  {
    target: "export",
    title: "Export everything",
    body: "Download all visits, ratings, comments, judgements, teachers and the rubric as Excel or CSV. Passwords are never exported.",
  },
  {
    title: "Where to go next",
    body: "Dashboard shows strengths and weaknesses across the school and suggests workshops and peer pairs. Workshops tracks them. Teachers shows each person's progress over time. Setup is where you add cycles, schedules, people and edit the rubric wording.",
  },
];

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: "dash-filters",
    title: "Filter the whole school",
    body: "Narrow everything on this page by cycle, observer, subject or grade band. With all cycles, each teacher's latest observation is used.",
  },
  {
    target: "dash-areas",
    title: "Where the school is strong and weak",
    body: "Each area's school average on the form's six-point scale, weakest first. The same for all 20 criteria alongside.",
  },
  {
    target: "dash-heatmap",
    title: "Every teacher, every criterion",
    body: "Darker is stronger. Each cell shows the level's letters too, so nothing depends on colour. Click a teacher to see their progress.",
  },
  {
    target: "dash-insights",
    title: "Experts and teachers needing support",
    body: "Very Good or Outstanding in an area makes a teacher an expert there. Acceptable or below flags a teacher for support in that area.",
  },
  {
    target: "dash-plan",
    title: "Workshops, planned for you",
    body: "The weakest areas become workshop suggestions: who should attend, who should lead and which criteria to cover. The administrator schedules one with a click and everyone is told in the app.",
  },
  {
    target: "dash-pairs",
    title: "Pair colleagues",
    body: "Each teacher needing support is matched with the strongest colleague in that area. Introduce sends both of them a note in the app.",
  },
];

export const TEACHER_TOUR: TourStep[] = [
  {
    title: "Your observations",
    body: "When an observer shares your lesson observation it appears here. Open it to read the feedback, see your ratings on the official form, sign it electronically and write a short reflection back.",
  },
  {
    title: "In Arabic too",
    body: "On each observation, the عربي button shows the feedback in Arabic. The rubric wording stays in English, exactly as on the school's form.",
  },
  {
    target: "replay",
    title: "Help is always here",
    body: "Tap Show me how to see this guide again.",
  },
];
