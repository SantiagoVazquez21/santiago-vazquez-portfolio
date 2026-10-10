import { Fragment, type KeyboardEvent } from "react";
import {
  ABOUT_FIELD_IDS,
  ABOUT_PHOTO,
  ABOUT_PHOTO_FRAME,
  ABOUT_STATUS_FIELD,
} from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import {
  CONTACT_WINDOW_ID,
  GITHUB_URL,
  LINKEDIN_URL,
  RESUME_FILE_NAME,
  RESUME_HREF,
  type WindowId,
} from "@/lib/desktop-catalog";
import { LAYOUT_MODE, type LayoutMode } from "@/lib/window-geometry";

// A held Enter would start one download or open one tab per repeat (RF-7, RF-8).
function ignoreRepeatedKey(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.repeat) event.preventDefault();
}

type AboutSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
  layout: LayoutMode;
  onOpenWindow: (id: WindowId) => void;
};

export function AboutSection({
  content,
  texts,
  layout,
  onOpenWindow,
}: AboutSectionProps) {
  return (
    <div className="mt-2 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] p-3">
      {/* Same criterion that decides whether the window floats: two columns only while floating (RF-10, D1). */}
      <div
        className={
          layout === LAYOUT_MODE.floating
            ? "flex flex-row items-start gap-4"
            : "flex flex-col items-center gap-4"
        }
      >
        <div className="shrink-0 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white">
          {/* Fixed size from constants, so a broken image never resizes the frame (RF-11, D8). */}
          <div
            className="overflow-hidden"
            style={{
              width: ABOUT_PHOTO_FRAME.width,
              height: ABOUT_PHOTO_FRAME.height,
            }}
          >
            <img
              src={ABOUT_PHOTO.src}
              alt={content.about.photoAlt}
              width={ABOUT_PHOTO.width}
              height={ABOUT_PHOTO.height}
              draggable={false}
              className="block h-full w-full object-contain"
            />
          </div>
        </div>
        <dl className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
          {ABOUT_FIELD_IDS.map((id) => (
            <Fragment key={id}>
              <dt className="font-bold">{texts.aboutFields[id]}</dt>
              <dd className="min-w-0 break-words">
                {id === ABOUT_STATUS_FIELD ? (
                  <span className="inline-flex items-center gap-1 border-2 border-[#006400] bg-white px-1">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 border border-black bg-[#008000]"
                    />
                    {content.about.fields[id]}
                  </span>
                ) : (
                  content.about.fields[id]
                )}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
      <hr className="my-3 border-t border-b border-t-[#808080] border-b-white" />
      {/* Links where they lead somewhere, a button where they act inside the site (RF-6). The
          four repeat the classes of "Repositorio" in ProjectDetail instead of sharing them (D6). */}
      <div
        role="group"
        aria-label={texts.aboutLinksGroup}
        className="flex flex-wrap gap-2"
      >
        <a
          href={RESUME_HREF}
          download={RESUME_FILE_NAME}
          aria-label={texts.aboutResumeName}
          onKeyDown={ignoreRepeatedKey}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.aboutResume}
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={texts.aboutGithubName}
          onKeyDown={ignoreRepeatedKey}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.aboutGithub}
        </a>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={texts.aboutLinkedinName}
          onKeyDown={ignoreRepeatedKey}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.aboutLinkedin}
        </a>
        {/* The shell's own open action: it raises or restores Contact, never duplicates it (RF-9). */}
        <button
          type="button"
          aria-label={texts.aboutContactName}
          onClick={() => onOpenWindow(CONTACT_WINDOW_ID)}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.aboutContact}
        </button>
      </div>
      <p className="mt-3">{content.about.profile}</p>
    </div>
  );
}
