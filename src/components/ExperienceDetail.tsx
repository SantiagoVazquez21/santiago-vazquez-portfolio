import { useId, type KeyboardEvent, type Ref } from "react";
import { ExperienceHighlight } from "@/components/ExperienceHighlight";
import { Tag, TechnologyChipList } from "@/components/ProjectBadges";
import { BACK_GLYPH, type JobEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type ExperienceDetailProps = {
  job: JobEntry;
  content: PortfolioContent;
  texts: Dictionary["sections"];
  backRef: Ref<HTMLButtonElement>;
  onBack: () => void;
  onBackKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

// The order of spec 011, RF-6. Each part's heading sits one level below the job title, and
// the tasks and chips are named by their visible headings (spec 011, RF-9).
export function ExperienceDetail({
  job,
  content,
  texts,
  backRef,
  onBack,
  onBackKeyDown,
}: ExperienceDetailProps) {
  const tasksId = useId();
  const toolsId = useId();
  const { title, period, organization, area, modality, highlight } =
    content.jobs[job.id];

  return (
    <>
      {/* "Back" copied from ProjectDetail (spec 011, plan D4): raised like the title buttons,
          sunken while pressed, with the focus ring inside the bevel (spec 008, RNF-1). The
          row keeps it its own width. */}
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
          src={job.glyph}
          alt=""
          width={64}
          height={64}
          draggable={false}
          className="h-16 w-16 shrink-0"
        />
        <h3 className="min-w-0 text-lg font-bold">{title}</h3>
      </div>
      {/* The blank outside the hidden separator keeps the fields apart when read aloud,
          as in SeparatedItems (spec 004, D6). */}
      <p className="mt-2">
        {organization} <span aria-hidden="true">{texts.separator}</span>
        {period}
      </p>
      <div className="mt-2 flex">
        <Tag>{modality}</Tag>
      </div>
      <p className="mt-4">{area}</p>
      {/* The heading is the achievement's only caption: the card shows the box alone
          (spec 011, RF-3). */}
      <h4 className="mt-4 font-bold">{texts.highlight}</h4>
      <div className="mt-1">
        <ExperienceHighlight text={highlight} />
      </div>
      <h4 id={tasksId} className="mt-4 font-bold">
        {texts.tasks}
      </h4>
      <ul role="list" aria-labelledby={tasksId} className="mt-1 list-disc pl-6">
        {job.taskIds.map((id) => (
          <li key={id}>{content.jobTasks[id]}</li>
        ))}
      </ul>
      {/* A job without tools drops the whole part, heading included (spec 011, RF-6). */}
      {job.toolIds.length > 0 && (
        <>
          <h4 id={toolsId} className="mt-4 font-bold">
            {texts.tools}
          </h4>
          <div className="mt-1">
            <TechnologyChipList
              items={job.toolIds.map((id) => content.jobTools[id])}
              labelledBy={toolsId}
            />
          </div>
        </>
      )}
    </>
  );
}
