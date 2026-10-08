import type { PortfolioContent } from "@/content/types";

type AboutSectionProps = {
  content: PortfolioContent;
};

export function AboutSection({ content }: AboutSectionProps) {
  return <p className="mt-2">{content.about.profile}</p>;
}
