export type ExplorerView<Id extends string> = Readonly<{
  // null is the list view (folders or cards).
  open: Id | null;
  selected: Id | null;
  navigatedAt: number | null;
}>;

// Typed as never so it is a valid start for any id: the fields are readonly, so the type is covariant.
export const EXPLORER_START: ExplorerView<never> = Object.freeze({
  open: null,
  selected: null,
  navigatedAt: null,
});

// Same number as OPEN_COOLDOWN_MS: it swallows the second tap of a double tap that lands
// on "Back" or on an item once the view has already changed.
export const NAVIGATION_COOLDOWN_MS = 500;

const BACK_KEY = "Backspace";

export function canNavigate(view: ExplorerView<string>, now: number): boolean {
  if (view.navigatedAt === null) return true;
  const elapsed = now - view.navigatedAt;
  // A clock set backwards gives a negative gap; blocking then could lock the explorer for hours.
  return elapsed < 0 || elapsed >= NAVIGATION_COOLDOWN_MS;
}

// Returning the same object tells the component nothing changed, so it leaves the focus alone.
export function selectItem<Id extends string>(
  view: ExplorerView<Id>,
  id: Id,
): ExplorerView<Id> {
  if (view.open !== null || view.selected === id) return view;
  return { ...view, selected: id };
}

export function clearSelection<Id extends string>(
  view: ExplorerView<Id>,
): ExplorerView<Id> {
  if (view.open !== null || view.selected === null) return view;
  return { ...view, selected: null };
}

export function openItem<Id extends string>(
  view: ExplorerView<Id>,
  id: Id,
  now: number,
): ExplorerView<Id> {
  if (view.open !== null || !canNavigate(view, now)) return view;
  return { open: id, selected: id, navigatedAt: now };
}

// The item that was open stays selected so focus can land back on it.
export function goBack<Id extends string>(
  view: ExplorerView<Id>,
  now: number,
): ExplorerView<Id> {
  if (view.open === null || !canNavigate(view, now)) return view;
  return { open: null, selected: view.open, navigatedAt: now };
}

export function isBackKey(key: string): boolean {
  return key === BACK_KEY;
}
