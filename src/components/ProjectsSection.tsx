import { useId } from "react";
import { SeparatedItems } from "@/components/SeparatedItems";
import { PROJECTS, type ProjectEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import { fillTemplate } from "@/lib/text-template";

type ProjectsSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

type ProjectCardProps = ProjectsSectionProps & {
  project: ProjectEntry;
};

// The link's accessible name carries the project's name, so two projects never share it,
// and says it opens a new tab (RF-4). noopener noreferrer keeps that tab from controlling
// or redirecting the portfolio.
function ProjectCard({ project, content, texts }: ProjectCardProps) {
  const technologiesId = useId();
  const { name, subtitle, description } = content.projects[project.id];

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">{name}</h3>
      <p>{subtitle}</p>
      <p className="mt-2">{description}</p>
      <p id={technologiesId} className="mt-2 font-bold">
        {texts.technologies}
      </p>
      <SeparatedItems
        items={project.technologyIds.map((id) => content.technologies[id])}
        separator={texts.separator}
        labelledBy={technologiesId}
      />
      <p className="mt-2">
        <a
          href={project.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fillTemplate(texts.repositoryName, { project: name })}
          className="text-[#000080] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
        >
          {texts.repository}
        </a>
      </p>
    </div>
  );
}

// One card per project, in the catalog's order (RF-3).
export function ProjectsSection({ content, texts }: ProjectsSectionProps) {
  return PROJECTS.map((project) => (
    <ProjectCard
      key={project.id}
      project={project}
      content={content}
      texts={texts}
    />
  ));
}
