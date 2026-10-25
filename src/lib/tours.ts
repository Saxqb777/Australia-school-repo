import type { TourStep } from "@/components/GuidedTour";

// One sentence a step, at most four steps a page. The welcome story explains the big picture first.

export const VISITS_TOUR: TourStep[] = [
  {
    target: "first-visit",
    title: "Tap a visit when the lesson starts",
    body: "The form opens with the teacher, class and subject already filled in.",
  },
  {
    target: "status-key",
    title: "See how far you are",
    body: "Each visit shows Not started, In progress or Complete.",
  },
  {
    target: "replay",
    title: "Help is always here",
    body: "Tap Show me how on any page to see this again.",
  },
];

export const OBSERVE_TOUR: TourStep[] = [
  {
    target: "first-criterion",
    title: "Tap a level",
    body: "The form's exact words for that level appear underneath. Tap it again to clear it.",
  },
  {
    target: "save-status",
    title: "It saves itself",
    body: "Every tap is kept, even with no signal.",
  },
  {
    target: "feedback",
    title: "Let the AI draft the letter",
    body: "After 10 ratings, Write summary drafts it from your ratings and comments. Change any word.",
  },
  {
    target: "complete",
    title: "Finish, sign, share",
    body: "Mark complete, sign, then share it with the teacher.",
  },
];

export const ADMIN_TOUR: TourStep[] = [
  {
    target: "admin-visits",
    title: "Every visit, every observer",
    body: "Open any visit to read the observation.",
  },
  {
    target: "admin-users",
    title: "Everyone's login",
    body: "Reset a password here if someone is locked out.",
  },
  {
    target: "export",
    title: "Take a copy any time",
    body: "Everything downloads as Excel or CSV. Passwords never do.",
  },
];

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: "dash-areas",
    title: "Strong and weak areas",
    body: "The school's average in each area, weakest first.",
  },
  {
    target: "dash-heatmap",
    title: "Every teacher, every criterion",
    body: "Darker is stronger. Tap a teacher to see their progress.",
  },
  {
    target: "dash-plan",
    title: "Workshops, planned for you",
    body: "The weakest areas become workshops, with who should attend and who should lead.",
  },
  {
    target: "dash-pairs",
    title: "Pair colleagues",
    body: "Each teacher needing support is matched with a strong colleague.",
  },
];

export const TEACHER_TOUR: TourStep[] = [
  {
    target: "my-list",
    title: "Your observations",
    body: "Open one to read the feedback, sign it and reply.",
  },
  {
    target: "replay",
    title: "Help is always here",
    body: "Tap Show me how to see this again.",
  },
];
