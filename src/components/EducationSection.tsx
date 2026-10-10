"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CertificateViewer } from "@/components/CertificateViewer";
import { SeparatedItems } from "@/components/SeparatedItems";
import {
  LANGUAGE_IDS,
  STUDIES,
  type StudyEntry,
  type StudyId,
} from "@/content/catalog";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import { certificateForStudy } from "@/lib/certificates";
import {
  EXPLORER_START,
  goBack,
  isBackKey,
  openItem,
  type ExplorerView,
} from "@/lib/explorer";
import { fillTemplate } from "@/lib/text-template";

type EducationSectionProps = {
  content: PortfolioContent;
  texts: Dictionary["sections"];
};

type StudyCardProps = {
  study: StudyEntry;
  content: PortfolioContent;
  texts: Dictionary["sections"];
  certificateRef: (element: HTMLButtonElement | null) => void;
  onOpenCertificate: () => void;
  onCertificateKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function StudyCard({
  study,
  content,
  texts,
  certificateRef,
  onOpenCertificate,
  onCertificateKeyDown,
}: StudyCardProps) {
  const { title, period, institution, place, status } =
    content.studies[study.id];
  // A study without status shows neither the status nor a trailing separator (RF-6).
  const fields =
    study.hasStatus && status !== undefined
      ? [institution, place, status]
      : [institution, place];
  const certificate = certificateForStudy(study);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <p>{period}</p>
      <SeparatedItems items={fields} separator={texts.separator} />
      {/* A plain button under the study's data: a click, a tap, Enter or Space opens (plan, D3).
          It is drawn like "Back" and named from its visible text (RF-2, RF-12). */}
      {certificate !== null && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            ref={certificateRef}
            type="button"
            aria-label={fillTemplate(texts.certificateName, { study: title })}
            onClick={onOpenCertificate}
            onKeyDown={onCertificateKeyDown}
            className="flex items-center gap-1 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
          >
            {texts.certificate}
          </button>
        </div>
      )}
    </div>
  );
}

// The explorer of Education, like ProjectsSection: local state, so minimizing or maximizing
// keeps the window mounted and closing unmounts it (RF-11).
export function EducationSection({ content, texts }: EducationSectionProps) {
  const [view, setView] = useState<ExplorerView<StudyId>>(EXPLORER_START);
  // A state-held Map keeps one instance across renders without reading a ref while rendering.
  const [buttons] = useState(() => new Map<StudyId, HTMLButtonElement>());
  const backButton = useRef<HTMLButtonElement>(null);
  // Set by a navigation and applied once its render is committed, when "Back" or the
  // study's "Certificate" exists again (RF-4, RF-9).
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    if (view.open !== null) {
      backButton.current?.focus();
    } else if (view.selected !== null) {
      buttons.get(view.selected)?.focus();
    }
  });

  // The same object back means the navigation was refused, so the focus stays put.
  function navigate(next: ExplorerView<StudyId>) {
    if (next === view) return;
    setView(next);
    pendingFocus.current = true;
  }

  function register(id: StudyId) {
    return (element: HTMLButtonElement | null) => {
      if (element === null) {
        buttons.delete(id);
      } else {
        buttons.set(id, element);
      }
    };
  }

  // A held Enter or Space repeats keydown; only the first press may open or go back (RF-9).
  function handleRepeatKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat) event.preventDefault();
  }

  // Listened to here and not on the dialog, and only from "Certificate", "Back" or "Open /
  // Download PDF": the viewer counts as outside the explorer even when the browser hands its
  // keys to the page, so the key does nothing there, not even preventDefault (plan, D10).
  // Escape bubbles on to the dialog and closes it (RF-10).
  function handleRootKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!isBackKey(event.key)) return;
    const target = event.target;
    if (
      !(target instanceof HTMLButtonElement) &&
      !(target instanceof HTMLAnchorElement)
    ) {
      return;
    }
    event.preventDefault();
    if (!event.repeat) navigate(goBack(view, Date.now()));
  }

  // undefined in the list view, since no study has a null id. Only a study with a button can
  // be opened, but a null certificate falls back to the list anyway.
  const openEntry = STUDIES.find((study) => study.id === view.open);
  const openHref =
    openEntry === undefined ? null : certificateForStudy(openEntry);

  return (
    <div onKeyDown={handleRootKeyDown} className="flex flex-1 flex-col">
      {openEntry === undefined || openHref === null ? (
        <>
          {STUDIES.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
              content={content}
              texts={texts}
              certificateRef={register(study.id)}
              onOpenCertificate={() =>
                navigate(openItem(view, study.id, Date.now()))
              }
              onCertificateKeyDown={handleRepeatKeyDown}
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
      ) : (
        // The list's first entry has its own top margin; the viewer gets the same gap below
        // the section's heading as the detail views of Skills and Projects.
        <div className="flex flex-1 flex-col pt-4">
          <CertificateViewer
            href={openHref}
            studyTitle={content.studies[openEntry.id].title}
            texts={texts}
            backRef={backButton}
            onBack={() => navigate(goBack(view, Date.now()))}
            onBackKeyDown={handleRepeatKeyDown}
          />
        </div>
      )}
    </div>
  );
}
