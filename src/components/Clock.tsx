"use client";

import { useSyncExternalStore } from "react";
import { formatClock, subscribeToMinute } from "@/lib/clock";
import type { Lang } from "@/lib/locale";

type ClockProps = {
  lang: Lang;
  name: string;
};

// Module-level so React keeps a single subscription across renders (plan, D4).
function subscribe(onChange: () => void): () => void {
  return subscribeToMinute(onChange, document, () => new Date());
}

// The server cannot know the visitor's local time, so the slot stays empty until
// hydration instead of showing a foreign hour (RF-13).
function getServerSnapshot(): null {
  return null;
}

// The fixed width and tabular digits reserve the slot for the widest time measured ("10:00 AM"),
// and the one-line minimum height keeps the empty pre-hydration slot as tall as a filled one, so
// the clock appearing or changing never shifts the rest of the taskbar, even when the tray wraps
// at high zoom (RF-13, RF-14). No live region: announcing every minute would be noise (plan, section 6).
export function Clock({ lang, name }: ClockProps) {
  const time = useSyncExternalStore<string | null>(
    subscribe,
    () => formatClock(new Date(), lang),
    getServerSnapshot,
  );
  return (
    <p className="min-h-[1lh] w-[5em] shrink-0 text-center whitespace-nowrap tabular-nums">
      <span className="sr-only">{name} </span>
      {time}
    </p>
  );
}
