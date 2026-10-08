import { LogoCredits } from "@/components/LogoCredits";
import { SkillsExplorer } from "@/components/SkillsExplorer";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";

type SkillsSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

// The credits sit outside the explorer's root, so its Backspace and clear-selection
// handlers never reach them, and they show in both views (plan 004, D13). The explorer
// grows to fill the body, which leaves the credits at its foot.
export function SkillsSection({ content, texts }: SkillsSectionProps) {
  return (
    <>
      <SkillsExplorer content={content} texts={texts} />
      <LogoCredits content={content} texts={texts} />
    </>
  );
}
