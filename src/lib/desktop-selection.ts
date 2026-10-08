import type { IconId } from "@/lib/desktop-catalog";

export const INTENT = { select: "select", open: "open", none: "none" } as const;
export type Intent = (typeof INTENT)[keyof typeof INTENT];

export type Selection = IconId | null;
// target null is any point of the desktop area outside an icon: background, title or grid gap (RF-5).
export type SelectionEvent =
  { target: IconId; intent: Intent } | { target: null };

const ENTER_KEY = "Enter";
const SPACE_KEY = " ";
// A pen tap behaves like a finger tap (spec 002), so both open on the first touch.
const TOUCH_POINTERS: readonly string[] = ["touch", "pen"];

// Only one icon is ever selected: selecting or opening one replaces the previous (RF-4).
export function nextSelection(
  current: Selection,
  event: SelectionEvent,
): Selection {
  if (event.target === null) return null;
  return event.intent === INTENT.none ? current : event.target;
}

// A held Enter repeats keydown; ignoring the repeats keeps it to a single open (RF-6).
export function keyIntent(key: string, repeat: boolean): Intent {
  if (key === ENTER_KEY) return repeat ? INTENT.none : INTENT.open;
  if (key === SPACE_KEY) return INTENT.select;
  return INTENT.none;
}

// detail 0 is a click without a pointer press: Enter or element.click() from dblclick,
// both of which mean "open" whatever pointer was used last (RF-6).
export function clickIntent(
  pointerType: string | null,
  detail: number,
): Intent {
  if (detail === 0) return INTENT.open;
  if (pointerType !== null && TOUCH_POINTERS.includes(pointerType)) {
    return INTENT.open;
  }
  return INTENT.select;
}

// Long enough to swallow a double tap or a fast double click, short enough not to feel stuck.
export const OPEN_COOLDOWN_MS = 500;

// Last open time per icon: a global timestamp would block opening LinkedIn right after GitHub (RF-6).
export type OpenLog = Readonly<Partial<Record<IconId, number>>>;

export function canOpen(log: OpenLog, id: IconId, now: number): boolean {
  const last = log[id];
  if (last === undefined) return true;
  const elapsed = now - last;
  // A clock set backwards gives a negative gap; blocking then could lock the icon for hours.
  return elapsed < 0 || elapsed >= OPEN_COOLDOWN_MS;
}

export function recordOpen(log: OpenLog, id: IconId, now: number): OpenLog {
  return { ...log, [id]: now };
}
