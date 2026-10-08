import type {
  CreditedLogoId,
  FolderId,
  JobId,
  LanguageId,
  ProjectId,
  SkillId,
  StudyId,
  TaskId,
  TechnologyId,
} from "@/content/catalog";

export type PortfolioContent = {
  about: { profile: string };
  projects: Record<
    ProjectId,
    { name: string; subtitle: string; description: string }
  >;
  // Brand names, written the same in es and en.
  technologies: Record<TechnologyId, string>;
  jobs: Record<
    JobId,
    {
      title: string;
      period: string;
      organization: string;
      area: string;
      modality: string;
      // Each job shows only the tasks of its taskIds in the catalog.
      tasks: Record<TaskId, string>;
    }
  >;
  studies: Record<
    StudyId,
    {
      title: string;
      period: string;
      institution: string;
      place: string;
      // Present only for the studies with hasStatus in the catalog.
      status?: string;
    }
  >;
  languages: Record<LanguageId, string>;
  folders: Record<FolderId, string>;
  // Brands are written the same in es and en; only the 4 concepts are translated.
  skills: Record<SkillId, string>;
  // Proper names, written the same in es and en (RF-14).
  logoCredits: Record<CreditedLogoId, { author: string; license: string }>;
};
