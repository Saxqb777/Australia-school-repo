"use client";

import type { SaveState } from "./useSaveQueue";

function time(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function SaveIndicator({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  let text: string;
  let tone: "quiet" | "busy" | "warn" = "quiet";
  if (readOnly) text = "Read only";
  else if (state.kind === "saving") {
    text = "Saving…";
    tone = "busy";
  } else if (state.kind === "offline") {
    text = `Offline · ${state.pending} kept on this device`;
    tone = "warn";
  } else if (state.kind === "retrying") {
    text = `Not sent yet · retrying`;
    tone = "warn";
  } else if (state.kind === "signed_out") {
    text = "Signed out · changes kept";
    tone = "warn";
  } else if (state.kind === "locked") text = "Marked complete";
  else if (state.kind === "error") {
    text = "A change was not saved";
    tone = "warn";
  } else if (state.kind === "saved") text = `Saved ${time(state.savedAt)}`;
  else text = "All changes saved";

  return (
    <span
      role="status"
      aria-live="polite"
      data-tour="save-status"
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-xs font-medium ${
        tone === "warn" ? "border border-dashed border-navy text-navy" : "text-ink-soft"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 ${tone === "busy" ? "animate-pulse bg-navy" : tone === "warn" ? "border border-navy" : "bg-navy"}`}
      />
      {text}
    </span>
  );
}
