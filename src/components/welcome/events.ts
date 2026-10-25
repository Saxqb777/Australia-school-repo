/** The welcome story and the page tours share the screen: a page tour waits until the story is closed. */
export const WELCOME_REPLAY = "asad:welcome-replay";
export const WELCOME_DONE = "asad:welcome-done";

export function welcomeIsOpen(): boolean {
  return document.documentElement.dataset.welcome === "open";
}
