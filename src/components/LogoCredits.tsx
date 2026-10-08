import { Fragment } from "react";
import { LOGO_CREDITS } from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import { fillTemplate } from "@/lib/text-template";

type LogoCreditsProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

// The visible credit that CC BY and CC BY-SA ask for (RF-15), styled like a Windows 95
// status bar. Each link's accessible name carries the license and the brand, so two links
// never share it; noopener noreferrer keeps the license tab from controlling the portfolio.
export function LogoCredits({ content, texts }: LogoCreditsProps) {
  return (
    <p className="mt-4 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-[#C0C0C0] px-2 py-1 text-xs break-words text-black">
      {LOGO_CREDITS.map((credit, index) => {
        const brand = content.skills[credit.id];
        const { author, license } = content.logoCredits[credit.id];
        return (
          <Fragment key={credit.id}>
            {index > 0 && (
              <>
                {" "}
                <span aria-hidden="true">{texts.separator}</span>
              </>
            )}
            {fillTemplate(texts.logoCredit, { brand, author })}{" "}
            <a
              href={credit.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fillTemplate(texts.logoLicenseName, {
                license,
                brand,
              })}
              className="text-[#000080] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black focus-visible:outline-dotted"
            >
              {license}
            </a>
          </Fragment>
        );
      })}
    </p>
  );
}
