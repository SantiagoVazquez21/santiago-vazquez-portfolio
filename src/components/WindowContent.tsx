import type { ReactNode } from "react";
import { AboutSection } from "@/components/AboutSection";
import { EducationSection } from "@/components/EducationSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProjectsSection } from "@/components/ProjectsSection";
import { SkillsSection } from "@/components/SkillsSection";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import type { WindowId } from "@/lib/desktop-catalog";

type SectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
  placeholder: string;
};

type WindowContentProps = SectionProps & {
  id: WindowId;
};

// Contact keeps the notice of spec 003 until spec 006 (RF-1).
function ContactSection({ placeholder }: SectionProps) {
  return <p className="mt-2">{placeholder}</p>;
}

// A map, never a comparison of ids: each window names its section (plan, section 4).
const SECTIONS: Record<WindowId, (props: SectionProps) => ReactNode> = {
  projects: ProjectsSection,
  about: AboutSection,
  experience: ExperienceSection,
  skills: SkillsSection,
  education: EducationSection,
  contact: ContactSection,
};

export function WindowContent({ id, ...props }: WindowContentProps) {
  const Section = SECTIONS[id];
  return <Section {...props} />;
}
