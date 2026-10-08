import type { Lang } from "@/lib/locale";

export const VISIBILITY_CHANGE_EVENT = "visibilitychange";

const MS_PER_MINUTE = 60000;
const MS_PER_SECOND = 1000;

// hourCycle is fixed because hour12 alone renders midnight as "24:00" on some engines (D8).
const FORMATTERS: Readonly<Record<Lang, Intl.DateTimeFormat>> = {
  es: new Intl.DateTimeFormat("es", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }),
  en: new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }),
};

// Newer ICU puts a narrow no-break space before AM/PM; a plain space keeps Node and browsers equal (D8).
const NARROW_SPACES = /[  ]/g;

export function formatClock(now: Date, lang: Lang): string {
  return FORMATTERS[lang].format(now).replace(NARROW_SPACES, " ");
}

export function msUntilNextMinute(now: Date): number {
  return (
    MS_PER_MINUTE - (now.getSeconds() * MS_PER_SECOND + now.getMilliseconds())
  );
}

// A timeout to the exact boundary (not a 60 s interval) keeps the clock on the current minute,
// and visibilitychange resyncs it because background tabs throttle timers (RF-13, D4).
export function subscribeToMinute(
  onChange: () => void,
  visibility: EventTarget,
  now: () => Date,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(tick, msUntilNextMinute(now()));
  };

  function tick(): void {
    onChange();
    schedule();
  }

  visibility.addEventListener(VISIBILITY_CHANGE_EVENT, tick);
  schedule();

  return () => {
    clearTimeout(timer);
    visibility.removeEventListener(VISIBILITY_CHANGE_EVENT, tick);
  };
}
