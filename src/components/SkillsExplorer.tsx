"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { SkillsPlayground } from "@/components/SkillsPlayground";
import {
  BACK_GLYPH,
  FOLDER_GLYPH,
  SKILL_FOLDERS,
  type FolderId,
} from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import { INTENT, clickIntent, keyIntent } from "@/lib/desktop-selection";
import {
  EXPLORER_START,
  clearSelection,
  goBack,
  isBackKey,
  openItem,
  selectItem,
  type ExplorerView,
} from "@/lib/explorer";

type SkillsExplorerProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

// Local state: minimizing or maximizing keeps the window mounted and closing unmounts it,
// so the view survives the first and starts over after the second (plan, D3).
// The root fills the rest of the body, so a click on any blank part of the folder view
// clears the selection, like the desktop background (RF-8).
export function SkillsExplorer({ content, texts }: SkillsExplorerProps) {
  const [view, setView] = useState<ExplorerView<FolderId>>(EXPLORER_START);
  // Kept across folders and minimizing, reset by closing the window (RF-9, plan D10).
  const [paused, setPaused] = useState(false);
  // A state-held Map keeps one instance across renders without reading a ref while rendering.
  const [folderElements] = useState(() => new Map<FolderId, HTMLElement>());
  const backButton = useRef<HTMLButtonElement>(null);
  // Read on pointerdown because Safari gives click no pointerType (002 plan, D6).
  const lastPointerType = useRef<string | null>(null);
  // Set by a navigation and applied once its render is committed, when "Back" or the
  // folder that was open exists again.
  const pendingFocus = useRef(false);
  const headingId = useId();

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    if (view.open !== null) {
      backButton.current?.focus();
    } else if (view.selected !== null) {
      folderElements.get(view.selected)?.focus();
    }
  });

  // The same object back means the navigation was refused, so the focus stays put.
  function navigate(next: ExplorerView<FolderId>) {
    if (next === view) return;
    setView(next);
    pendingFocus.current = true;
  }

  // A Map of elements instead of closest() or data-* attributes, which the text lint would flag.
  function registerFolder(id: FolderId) {
    return (element: HTMLElement | null) => {
      if (element === null) {
        folderElements.delete(id);
      } else {
        folderElements.set(id, element);
      }
    };
  }

  function select(id: FolderId) {
    setView((current) => selectItem(current, id));
  }

  function handleFolderPointerDown(event: PointerEvent<HTMLElement>) {
    lastPointerType.current = event.pointerType;
  }

  // A mouse click only selects; a tap, Enter or the click replayed by a double click opens (RF-8).
  function handleFolderClick(id: FolderId, event: MouseEvent<HTMLElement>) {
    if (clickIntent(lastPointerType.current, event.detail) === INTENT.open) {
      navigate(openItem(view, id, Date.now()));
    } else {
      select(id);
    }
  }

  // A touch double tap already opened on its first tap; only a pointer whose clicks merely
  // select gets the double click turned into an opening click (detail 0), like the desktop.
  function handleFolderDoubleClick(event: MouseEvent<HTMLElement>) {
    if (clickIntent(lastPointerType.current, event.detail) === INTENT.select) {
      event.currentTarget.click();
    }
  }

  // Space would also click the button on keyup; it only selects, like a desktop icon (RF-8).
  // A held Enter repeats keydown and each repeat would click the folder again (RF-10).
  function handleFolderKeyDown(
    id: FolderId,
    event: KeyboardEvent<HTMLElement>,
  ) {
    if (keyIntent(event.key, event.repeat) === INTENT.select) {
      event.preventDefault();
      select(id);
    } else if (event.repeat && keyIntent(event.key, false) === INTENT.open) {
      event.preventDefault();
    }
  }

  // A held Enter or Space repeats keydown; only the first press may go back or toggle
  // the pause (004 RF-10, 006 RF-7).
  function handleBackKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.repeat) event.preventDefault();
  }

  // Listened to here and not on the dialog: only a folder, "Back" or the pause button can
  // hold the focus inside this root, so with the focus on the window itself the key does nothing,
  // not even preventDefault (RF-10). Escape bubbles on to the dialog and closes it.
  function handleRootKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isBackKey(event.key)) return;
    event.preventDefault();
    if (!event.repeat) navigate(goBack(view, Date.now()));
  }

  // The click lands on the window, which takes the focus away from the folder.
  // A click made in a folder's view never clears: the click on "Back" bubbles here after
  // going back, and the queued state would lose the folder it just selected (RF-10).
  function handleRootClick(event: MouseEvent<HTMLElement>) {
    if (view.open !== null) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const folders = [...folderElements.values()];
    if (folders.some((folder) => folder.contains(target))) return;
    setView((current) => clearSelection(current));
  }

  // undefined in the folder view, since no folder has a null id.
  const openEntry = SKILL_FOLDERS.find((folder) => folder.id === view.open);

  return (
    <div
      onClick={handleRootClick}
      onKeyDown={handleRootKeyDown}
      className="flex flex-1 flex-col pt-4"
    >
      {/* Folders are 8 rem wide, not the desktop's 6: browsers never wrap after the "/" of
          a name, so its longest word must fit whole or break-words would split it (RNF-3).
          Two columns still fit at 320 px. */}
      {openEntry === undefined ? (
        <ul
          role="list"
          aria-label={texts.folderGroup}
          className="grid grid-cols-[repeat(auto-fill,minmax(min(8rem,100%),1fr))] gap-4"
        >
          {SKILL_FOLDERS.map((folder) => (
            <li key={folder.id} className="flex justify-center">
              {/* Black dotted focus ring: the desktop icons' white one would vanish on the white body. */}
              <button
                ref={registerFolder(folder.id)}
                type="button"
                onFocus={() => select(folder.id)}
                onPointerDown={handleFolderPointerDown}
                onClick={(event) => handleFolderClick(folder.id, event)}
                onDoubleClick={handleFolderDoubleClick}
                onKeyDown={(event) => handleFolderKeyDown(folder.id, event)}
                className="flex w-32 max-w-full flex-col items-center gap-1 py-1 text-center text-sm select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
              >
                <img
                  src={FOLDER_GLYPH}
                  alt=""
                  width={48}
                  height={48}
                  draggable={false}
                  className="h-12 w-12"
                />
                {/* The selected name is told apart by the dotted border too, not only by color (RF-8). */}
                <span
                  className={
                    view.selected === folder.id
                      ? "max-w-full border border-dotted border-white bg-[#000080] px-1 break-words text-white"
                      : "max-w-full border border-transparent px-1 break-words"
                  }
                >
                  {content.folders[folder.id]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {/* Raised like the title buttons, sunken while pressed, with the focus ring inside the bevel (RNF-2).
              The row keeps the button its own width inside the column root. */}
          <div className="flex flex-wrap gap-2">
            <button
              ref={backButton}
              type="button"
              onClick={() => navigate(goBack(view, Date.now()))}
              onKeyDown={handleBackKeyDown}
              className="flex items-center gap-1 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
            >
              <img
                src={BACK_GLYPH}
                alt=""
                width={16}
                height={16}
                draggable={false}
                className="h-4 w-4"
              />
              {texts.back}
            </button>
            {/* After "Back" in DOM order, so Tab reaches it next (RF-7). Its visible text is its
                accessible name, so no aria-pressed. Backspace bubbles to the root (RF-14). */}
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              onKeyDown={handleBackKeyDown}
              className="flex items-center gap-1 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
            >
              {paused ? texts.resume : texts.pause}
            </button>
          </div>
          <h3 id={headingId} className="mt-4 text-lg font-bold">
            {content.folders[openEntry.id]}
          </h3>
          {/* A new key per folder gives every opening new positions and directions (RF-1). */}
          <SkillsPlayground
            key={openEntry.id}
            skillIds={openEntry.skillIds}
            names={content.skills}
            labelledBy={headingId}
            paused={paused}
          />
        </>
      )}
    </div>
  );
}
