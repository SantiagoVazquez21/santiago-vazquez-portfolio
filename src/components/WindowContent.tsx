import type { ReactNode } from "react";
import { AboutSection } from "@/components/AboutSection";
import { ContactForm } from "@/components/ContactForm";
import { EducationSection } from "@/components/EducationSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProjectsSection } from "@/components/ProjectsSection";
import { SkillsSection } from "@/components/SkillsSection";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import type { WindowId } from "@/lib/desktop-catalog";
import type { LayoutMode } from "@/lib/window-geometry";

type SectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
  contactTexts: Dictionary["contact"];
  onOpenWindow: (id: WindowId) => void;
  layout: LayoutMode;
};

type WindowContentProps = SectionProps & {
  id: WindowId;
};

function ContactSection({ contactTexts }: SectionProps) {
  return <ContactForm texts={contactTexts} />;
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
