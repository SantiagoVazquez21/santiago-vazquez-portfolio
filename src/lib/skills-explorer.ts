import type { FolderId } from "@/content/catalog";

export type SkillsView = {
  // null is the folder view.
  folder: FolderId | null;
  selected: FolderId | null;
  navigatedAt: number | null;
};

export const SKILLS_START: SkillsView = Object.freeze({
  folder: null,
  selected: null,
  navigatedAt: null,
});

// Same number as OPEN_COOLDOWN_MS: it swallows the second tap of a double tap that lands
// on "Back" or on a folder once the view has already changed (RF-10).
export const NAVIGATION_COOLDOWN_MS = 500;

const BACK_KEY = "Backspace";

export function canNavigate(view: SkillsView, now: number): boolean {
  if (view.navigatedAt === null) return true;
  const elapsed = now - view.navigatedAt;
  // A clock set backwards gives a negative gap; blocking then could lock the explorer for hours.
  return elapsed < 0 || elapsed >= NAVIGATION_COOLDOWN_MS;
}

// Returning the same object tells the component nothing changed, so it leaves the focus alone.
export function selectFolder(view: SkillsView, id: FolderId): SkillsView {
  if (view.folder !== null || view.selected === id) return view;
  return { ...view, selected: id };
}

export function clearSelection(view: SkillsView): SkillsView {
  if (view.folder !== null || view.selected === null) return view;
  return { ...view, selected: null };
}

export function openFolder(
  view: SkillsView,
  id: FolderId,
  now: number,
): SkillsView {
  if (view.folder !== null || !canNavigate(view, now)) return view;
  return { folder: id, selected: id, navigatedAt: now };
}

// The folder that was open stays selected so focus can land back on it (RF-10).
export function goBack(view: SkillsView, now: number): SkillsView {
  if (view.folder === null || !canNavigate(view, now)) return view;
  return { folder: null, selected: view.folder, navigatedAt: now };
}

export function isBackKey(key: string): boolean {
  return key === BACK_KEY;
}
