import {
  useId,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ExperienceHighlight } from "@/components/ExperienceHighlight";
import { Tag, TechnologyChipList } from "@/components/ProjectBadges";
import type { JobEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type ExperienceCardProps = {
  job: JobEntry;
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

// Surface copied from ProjectCard (spec 011, plan D2). The surface takes the gestures, so a
// click on the tag, the achievement or a chip counts as one on the card. The button wraps
// only the icon: a <button> may not hold the heading or the lists, and a heading holding the
// button would be announced with the rest of the card too (spec 008, plan D4).
export function ExperienceCard({
  job,
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
}: ExperienceCardProps) {
  const nameId = useId();
  const organizationId = useId();
  const periodId = useId();
  const modalityId = useId();
  const highlightId = useId();
  const toolsId = useId();
  const { title, period, organization, modality, highlight } =
    content.jobs[job.id];
  // One id per fragment and per <li>: the browser joins several ids with a space, so no two
  // fragments run together in the description (spec 008, plan D8; spec 011, RF-9). Catalog
  // ids keep the ids free of literals.
  const toolItemIds = job.toolIds.map((id) => toolsId + id);

  return (
    <li>
      {/* The dotted focus ring goes round the whole card, like a folder's, while its
          button has the visible focus (spec 011, RF-9). */}
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
            aria-labelledby={`${nameId} ${organizationId}`}
            aria-describedby={[
              periodId,
              modalityId,
              highlightId,
              ...toolItemIds,
            ].join(" ")}
            className="shrink-0 outline-none"
          >
            <img
              src={job.glyph}
              alt=""
              width={48}
              height={48}
              draggable={false}
              className="h-12 w-12"
            />
          </button>
          <h3 className="min-w-0 text-lg font-bold">
            {/* The selected title is told apart by the dotted border too, not only by color
                (spec 011, RF-4). */}
            <span
              id={nameId}
              className={
                selected
                  ? "border border-dotted border-white bg-[#000080] px-1 text-white"
                  : "border border-transparent px-1"
              }
            >
              {title}
            </span>
          </h3>
        </div>
        {/* The blank outside the hidden separator keeps the fields apart when read aloud,
            as in SeparatedItems (spec 004, D6). */}
        <p>
          <span id={organizationId}>{organization}</span>{" "}
          <span aria-hidden="true">{texts.separator}</span>
          <span id={periodId}>{period}</span>
        </p>
        <Tag id={modalityId}>{modality}</Tag>
        {/* No visible caption: the solid border is enough on the card (spec 011, RF-3). */}
        <ExperienceHighlight id={highlightId} text={highlight} />
        {job.toolIds.length > 0 && (
          <TechnologyChipList
            items={job.toolIds.map((id) => content.jobTools[id])}
            itemIds={toolItemIds}
            label={texts.tools}
          />
        )}
      </div>
    </li>
  );
}
