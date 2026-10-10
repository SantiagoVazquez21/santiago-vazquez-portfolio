import { useId, type KeyboardEvent, type Ref } from "react";
import { ContextTagList, TechnologyChipList } from "@/components/ProjectBadges";
import { BACK_GLYPH, type ProjectEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import { fillTemplate } from "@/lib/text-template";

type ProjectDetailProps = {
  project: ProjectEntry;
  content: PortfolioContent;
  texts: Dictionary["sections"];
  backRef: Ref<HTMLButtonElement>;
  onBack: () => void;
  onBackKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

// The order of RF-5. Each part's heading sits one level below the project's name, and the
// features and chips are named by their visible headings (RF-9).
export function ProjectDetail({
  project,
  content,
  texts,
  backRef,
  onBack,
  onBackKeyDown,
}: ProjectDetailProps) {
  const featuresId = useId();
  const technologiesId = useId();
  const { name, tagline, description, contribution, features, screenshotAlt } =
    content.projects[project.id];

  return (
    <>
      {/* The same "Back" as in Skills: raised like the title buttons, sunken while pressed,
          with the focus ring inside the bevel (RNF-1). The row keeps it its own width. */}
      <div className="flex flex-wrap gap-2">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          onKeyDown={onBackKeyDown}
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
      </div>
      <div className="mt-4 flex items-center gap-3">
        <img
          src={project.glyph}
          alt=""
          width={64}
          height={64}
          draggable={false}
          className="h-16 w-16 shrink-0"
        />
        <h3 className="min-w-0 text-lg font-bold">{name}</h3>
      </div>
      <p className="mt-2">{tagline}</p>
      <div className="mt-2">
        <ContextTagList
          items={project.tagIds.map((id) => content.projectTags[id])}
          label={texts.projectTags}
        />
      </div>
      {/* Sunken like the chips (RNF-1). Shrinking only by width keeps its proportions and never
          widens the body at 360 px (RF-12). No size in the catalogue, by the owner's choice (D8). */}
      {project.screenshot !== null && (
        <img
          src={project.screenshot}
          alt={screenshotAlt}
          draggable={false}
          className="mt-4 block h-auto max-w-full border-2 border-t-black border-r-[#808080] border-b-[#808080] border-l-black"
        />
      )}
      <p className="mt-4">{description}</p>
      <h4 className="mt-4 font-bold">{texts.contribution}</h4>
      <p className="mt-1">{contribution}</p>
      <h4 id={featuresId} className="mt-4 font-bold">
        {texts.features}
      </h4>
      <ul
        role="list"
        aria-labelledby={featuresId}
        className="mt-1 list-disc pl-6"
      >
        {project.featureIds.map((id) => (
          <li key={id}>{features[id]}</li>
        ))}
      </ul>
      <h4 id={technologiesId} className="mt-4 font-bold">
        {texts.technologies}
      </h4>
      <div className="mt-1">
        <TechnologyChipList
          items={project.technologyIds.map((id) => content.technologies[id])}
          labelledBy={technologiesId}
        />
      </div>
      {/* A link and not a button with window.open, to keep noopener noreferrer, the middle
          click and the context menu (D5). Its bevel, not an underline, sets it apart from the
          text, like "Back" (RNF-1). A held Enter would open one tab per repeat (RF-6). */}
      <div className="mt-4">
        <a
          href={project.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fillTemplate(texts.repositoryName, { project: name })}
          onKeyDown={(event) => {
            if (event.repeat) event.preventDefault();
          }}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.repository}
        </a>
      </div>
    </>
  );
}
