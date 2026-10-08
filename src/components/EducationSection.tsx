import { SeparatedItems } from "@/components/SeparatedItems";
import { LANGUAGE_IDS, STUDIES, type StudyEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type EducationSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

type StudyCardProps = {
  study: StudyEntry;
  content: PortfolioContent;
  separator: string;
};

function StudyCard({ study, content, separator }: StudyCardProps) {
  const { title, period, institution, place, status } =
    content.studies[study.id];
  // A study without status shows neither the status nor a trailing separator (RF-6).
  const fields =
    study.hasStatus && status !== undefined
      ? [institution, place, status]
      : [institution, place];

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p>{period}</p>
      <SeparatedItems items={fields} separator={separator} />
    </div>
  );
}

// One entry per study in the catalog's order, then the languages (RF-6).
export function EducationSection({ content, texts }: EducationSectionProps) {
  return (
    <>
      {STUDIES.map((study) => (
        <StudyCard
          key={study.id}
          study={study}
          content={content}
          separator={texts.separator}
        />
      ))}
      <div className="mt-4">
        <h3 className="text-lg font-bold">{texts.languages}</h3>
        <ul className="list-disc pl-6">
          {LANGUAGE_IDS.map((id) => (
            <li key={id}>{content.languages[id]}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
