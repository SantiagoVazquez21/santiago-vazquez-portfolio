import { SeparatedItems } from "@/components/SeparatedItems";
import { JOBS, type JobEntry } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type ExperienceSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

type JobCardProps = ExperienceSectionProps & {
  job: JobEntry;
};

function JobCard({ job, content, texts }: JobCardProps) {
  const { title, period, organization, area, modality, tasks } =
    content.jobs[job.id];

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p>{period}</p>
      <SeparatedItems
        items={[organization, area, modality]}
        separator={texts.separator}
      />
      <ul className="mt-2 list-disc pl-6">
        {job.taskIds.map((taskId) => (
          <li key={taskId}>{tasks[taskId]}</li>
        ))}
      </ul>
    </div>
  );
}

// One entry per job, in the catalog's order (RF-5).
export function ExperienceSection({ content, texts }: ExperienceSectionProps) {
  return JOBS.map((job) => (
    <JobCard key={job.id} job={job} content={content} texts={texts} />
  ));
}
