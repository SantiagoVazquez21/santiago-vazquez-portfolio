import {
  useId,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ContextTagList, TechnologyChipList } from "@/components/ProjectBadges";
import type { ProjectEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type ProjectCardProps = {
  project: ProjectEntry;
  content: PortfolioContent;
  texts: Dictionary["sections"];
  selected: boolean;
  surfaceRef: (element: HTMLElement | null) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onSurfacePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onSurfaceClick: (event: MouseEvent<HTMLElement>) => void;
  onSurfaceDoubleClick: (event: MouseEvent<HTMLElement>) => void;
  onButtonKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

// The surface takes the gestures, so a click on a tag or a chip counts as one on the card.
// The button wraps only the icon: a <button> may not hold the heading or the lists, and a
// heading holding the button would be announced with the tagline too (plan, D4).
export function ProjectCard({
  project,
  content,
  texts,
  selected,
  surfaceRef,
  buttonRef,
  onSelect,
  onSurfacePointerDown,
  onSurfaceClick,
  onSurfaceDoubleClick,
  onButtonKeyDown,
}: ProjectCardProps) {
  const nameId = useId();
  const taglineId = useId();
  const tagsId = useId();
  const chipsId = useId();
  const { name, tagline } = content.projects[project.id];
  // One id per <li>: the browser joins several ids with a space, so no two badges run
  // together in the description (plan, D8). Catalog ids keep the ids free of literals.
  const tagItemIds = project.tagIds.map((id) => tagsId + id);
  const chipItemIds = project.technologyIds.map((id) => chipsId + id);

  return (
    <li>
      {/* The dotted focus ring goes round the whole card, like a folder's, while its
          button has the visible focus (RF-9). */}
      <div
        ref={surfaceRef}
        onPointerDown={onSurfacePointerDown}
        onClick={onSurfaceClick}
        onDoubleClick={onSurfaceDoubleClick}
        className="flex h-full flex-col gap-2 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] p-3 select-none has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-black has-[button:focus-visible]:outline-dotted"
      >
        <div className="flex items-center gap-2">
          <button
            ref={buttonRef}
            type="button"
            onFocus={onSelect}
            onKeyDown={onButtonKeyDown}
            aria-labelledby={`${nameId} ${taglineId}`}
            aria-describedby={[...tagItemIds, ...chipItemIds].join(" ")}
            className="shrink-0 outline-none"
          >
            <img
              src={project.glyph}
              alt=""
              width={48}
              height={48}
              draggable={false}
              className="h-12 w-12"
            />
          </button>
          <h3 className="min-w-0 text-lg font-bold">
            {/* The selected name is told apart by the dotted border too, not only by color (RF-3). */}
            <span
              id={nameId}
              className={
                selected
                  ? "border border-dotted border-white bg-[#000080] px-1 text-white"
                  : "border border-transparent px-1"
              }
            >
              {name}
            </span>
          </h3>
        </div>
        <p id={taglineId}>{tagline}</p>
        <ContextTagList
          items={project.tagIds.map((id) => content.projectTags[id])}
          itemIds={tagItemIds}
          label={texts.projectTags}
        />
        <TechnologyChipList
          items={project.technologyIds.map((id) => content.technologies[id])}
          itemIds={chipItemIds}
          label={texts.technologies}
        />
      </div>
    </li>
  );
}
