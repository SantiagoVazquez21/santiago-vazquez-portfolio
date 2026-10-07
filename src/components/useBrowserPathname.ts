import { useSyncExternalStore } from "react";

// Every navigation in the site reloads the page (plan, D5), so the path cannot change while
// the global error is shown and there is nothing to subscribe to (plan, D24).
function subscribe(): () => void {
  return () => undefined;
}

function getSnapshot(): string {
  return window.location.pathname;
}

// On the server there is no browser path; the caller falls back to Spanish (RF-58, plan, D19).
function getServerSnapshot(): null {
  return null;
}

export function useBrowserPathname(): string | null {
  return useSyncExternalStore<string | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
