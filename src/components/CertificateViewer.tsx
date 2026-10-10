import {
  useCallback,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type Ref,
} from "react";
import { BACK_GLYPH } from "@/content/catalog";
import type { Dictionary } from "@/i18n/types";
import {
  PDF_DISPLAY,
  PDF_LOAD_ERROR_EVENT,
  pdfDisplayMode,
} from "@/lib/certificates";
import { fillTemplate } from "@/lib/text-template";

type CertificateViewerProps = {
  href: string;
  studyTitle: string;
  texts: Dictionary["sections"];
  backRef: Ref<HTMLButtonElement>;
  onBack: () => void;
  onBackKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

// The browser's PDF support does not change during the visit, so there is nothing to
// subscribe to (plan, section 5).
function subscribe(): () => void {
  return () => undefined;
}

function getSnapshot(): boolean | undefined {
  return navigator.pdfViewerEnabled;
}

// Windows start closed and never render on the server; undefined still tries to embed.
function getServerSnapshot(): undefined {
  return undefined;
}

// "Back", the study's heading, the viewer or the explanation, and the link to open the PDF
// (RF-5, RF-6, RF-7, RF-8).
export function CertificateViewer({
  href,
  studyTitle,
  texts,
  backRef,
  onBack,
  onBackKeyDown,
}: CertificateViewerProps) {
  const pdfViewerEnabled = useSyncExternalStore<boolean | undefined>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  // A ref callback and not onError: it runs when the element is inserted, before the response
  // arrives, so an early failure is not missed, and React does not promise onError on <object>
  // (plan, D9).
  const objectRef = useCallback((node: HTMLObjectElement) => {
    const handleError = () => setLoadFailed(true);
    node.addEventListener(PDF_LOAD_ERROR_EVENT, handleError);
    return () => node.removeEventListener(PDF_LOAD_ERROR_EVENT, handleError);
  }, []);
  const display = pdfDisplayMode(pdfViewerEnabled, loadFailed);
  const viewerName = fillTemplate(texts.certificateViewerName, {
    study: studyTitle,
  });

  return (
    <>
      {/* The same "Back" as in Projects (RNF-1). */}
      <div className="flex flex-wrap gap-2">
        <button
          ref={backRef}
          type="button"
          onClick={onBack}
          onKeyDown={onBackKeyDown}
          className="flex items-center gap-1 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          <img
            src={BACK_GLYPH}
            alt=""
            width={16}
            height={16}
            draggable={false}
            className="h-4 w-4"
          />
          {texts.back}
        </button>
      </div>
      <h3 className="mt-4 text-lg font-bold">{studyTitle}</h3>
      {/* Only the embedded viewer has the sunken field and the 320 px minimum; it stretches
          over the rest of the body (RF-6). Its fallback covers an old browser that neither
          reports pdfViewerEnabled nor shows PDFs (RF-8, residual case). */}
      {display === PDF_DISPLAY.embedded ? (
        <object
          ref={objectRef}
          data={href}
          type="application/pdf"
          title={viewerName}
          aria-label={viewerName}
          className="mt-2 min-h-80 w-full min-w-0 flex-1 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white"
        >
          <p className="p-4">{texts.certificateNoViewer}</p>
        </object>
      ) : (
        <p className="mt-2">{texts.certificateNoViewer}</p>
      )}
      {/* A link without download: the new tab lets the browser show or save the PDF, and it
          keeps noopener noreferrer, the middle click and the context menu (plan, D5). A held
          Enter would open one tab per repeat (RF-7). */}
      <div className="mt-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fillTemplate(texts.certificateOpenName, {
            study: studyTitle,
          })}
          onKeyDown={(event) => {
            if (event.repeat) event.preventDefault();
          }}
          className="inline-flex items-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-2 py-1 text-sm no-underline select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        >
          {texts.certificateOpen}
        </a>
      </div>
    </>
  );
}
