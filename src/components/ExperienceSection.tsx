"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ExperienceCard } from "@/components/ExperienceCard";
import { ExperienceDetail } from "@/components/ExperienceDetail";
import { JOBS, type JobId } from "@/content/catalog";
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

type ExperienceSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

// Mechanics copied from ProjectsSection (spec 011, plan D1). Local state: minimizing or
// maximizing keeps the window mounted and closing unmounts it (spec 011, RF-8). The root
// fills the rest of the body, so a click on any blank part of the card view clears the
// selection, like a blank part of a folder view (spec 011, RF-4).
export function ExperienceSection({ content, texts }: ExperienceSectionProps) {
  const [view, setView] = useState<ExplorerView<JobId>>(EXPLORER_START);
  // State-held Maps keep one instance across renders without reading a ref while rendering.
  // Maps of elements instead of closest() or data-* attributes, which the text lint would flag.
  const [surfaces] = useState(() => new Map<JobId, HTMLElement>());
  const [buttons] = useState(() => new Map<JobId, HTMLButtonElement>());
  const backButton = useRef<HTMLButtonElement>(null);
  // Read on pointerdown because Safari gives click no pointerType (002 plan, D6).
  const lastPointerType = useRef<string | null>(null);
  // Set by a navigation and applied once its render is committed, when "Back" or the
  // card that was open exists again (spec 011, RF-5 and RF-7).
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    if (view.open !== null) {
      backButton.current?.focus();
    } else if (view.selected !== null) {
      buttons.get(view.selected)?.focus();
    }
  });

  // The same object back means the navigation was refused, so the focus stays put.
  function navigate(next: ExplorerView<JobId>) {
    if (next === view) return;
    setView(next);
    pendingFocus.current = true;
  }

  function register<Element extends HTMLElement>(
    elements: Map<JobId, Element>,
    id: JobId,
  ) {
    return (element: Element | null) => {
      if (element === null) {
        elements.delete(id);
      } else {
        elements.set(id, element);
      }
    };
  }

  function select(id: JobId) {
    setView((current) => selectItem(current, id));
  }

  function handleSurfacePointerDown(event: PointerEvent<HTMLElement>) {
    lastPointerType.current = event.pointerType;
  }

  // A mouse click only selects; a tap, Enter or the click replayed by a double click opens
  // (spec 011, RF-4 and RF-5). Focusing the card's button selects it through its onFocus, so
  // a click on the tag, the achievement or a chip leaves the focus on the card, as a click on
  // a folder does.
  function handleSurfaceClick(id: JobId, event: MouseEvent<HTMLElement>) {
    if (clickIntent(lastPointerType.current, event.detail) === INTENT.open) {
      navigate(openItem(view, id, Date.now()));
    } else {
      buttons.get(id)?.focus();
      select(id);
    }
  }

  // A touch double tap already opened on its first tap; only a pointer whose clicks merely
  // select gets the double click turned into an opening click (detail 0), like a folder.
  function handleSurfaceDoubleClick(event: MouseEvent<HTMLElement>) {
    if (clickIntent(lastPointerType.current, event.detail) === INTENT.select) {
      event.currentTarget.click();
    }
  }

  // Space would also click the button on keyup; it only selects, like a folder (spec 011,
  // RF-4). A held Enter repeats keydown and each repeat would click the card again (spec 011,
  // RF-7). The first Enter clicks the button, and that click bubbles to the surface, which opens.
  function handleButtonKeyDown(
    id: JobId,
    event: KeyboardEvent<HTMLButtonElement>,
  ) {
    if (keyIntent(event.key, event.repeat) === INTENT.select) {
      event.preventDefault();
      select(id);
    } else if (event.repeat && keyIntent(event.key, false) === INTENT.open) {
      event.preventDefault();
    }
  }

  // A held Enter or Space repeats keydown; only the first press may go back (spec 011, RF-7).
  function handleBackKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat) event.preventDefault();
  }

  // Listened to here and not on the dialog: only a card or "Back" can hold the focus inside
  // this root, so with the focus on the window itself the key does nothing, not even
  // preventDefault (spec 011, RF-7). Escape bubbles on to the dialog and closes it.
  function handleRootKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isBackKey(event.key)) return;
    event.preventDefault();
    if (!event.repeat) navigate(goBack(view, Date.now()));
  }

  // A click made in the detail never clears: the click on "Back" bubbles here after going
  // back, and the queued state would lose the card it just selected (spec 011, RF-7).
  function handleRootClick(event: MouseEvent<HTMLElement>) {
    if (view.open !== null) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if ([...surfaces.values()].some((surface) => surface.contains(target))) {
      return;
    }
    setView((current) => clearSelection(current));
  }

  // undefined in the card view, since no job has a null id.
  const openEntry = JOBS.find((job) => job.id === view.open);

  return (
    <div
      onClick={handleRootClick}
      onKeyDown={handleRootKeyDown}
      className="flex flex-1 flex-col pt-4"
    >
      {openEntry === undefined ? (
        <>
          {/* A mouse click only selects, so the hint tells how to open (spec 011, RF-1). */}
          <p className="text-sm">{texts.experienceOpenHint}</p>
          {/* The same grid as Projects: 18 rem columns, one at 360 px, where min() keeps the
              column from overflowing the body (spec 011, RF-1 and RNF-3). */}
          <ul
            role="list"
            aria-label={texts.experienceGroup}
            className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-4"
          >
            {JOBS.map((job) => (
              <ExperienceCard
                key={job.id}
                job={job}
                content={content}
                texts={texts}
                selected={view.selected === job.id}
                surfaceRef={register(surfaces, job.id)}
                buttonRef={register(buttons, job.id)}
                onSelect={() => select(job.id)}
                onSurfacePointerDown={handleSurfacePointerDown}
                onSurfaceClick={(event) => handleSurfaceClick(job.id, event)}
                onSurfaceDoubleClick={handleSurfaceDoubleClick}
                onButtonKeyDown={(event) => handleButtonKeyDown(job.id, event)}
              />
            ))}
          </ul>
        </>
      ) : (
        <ExperienceDetail
          job={openEntry}
          content={content}
          texts={texts}
          backRef={backButton}
          onBack={() => navigate(goBack(view, Date.now()))}
          onBackKeyDown={handleBackKeyDown}
        />
      )}
    </div>
  );
}
