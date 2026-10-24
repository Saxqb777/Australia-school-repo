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
    target: "complete",
    title: "Finish the observation",
    body: "When everything is filled in, mark the observation complete. Anything still missing is listed here with a link to it.",
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
];

export const TEACHER_TOUR: TourStep[] = [
  {
    title: "Your observations",
    body: "This page will show your lesson observations once an observer completes and shares them, with your ratings and feedback.",
  },
  {
    target: "replay",
    title: "Help is always here",
    body: "Tap Show me how to see this guide again.",
  },
];
