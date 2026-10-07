"use client";

import { PageMetadata } from "@/components/PageMetadata";
import { DICTIONARIES } from "@/i18n";
import { selectDictionary } from "@/lib/dictionaries";
import type { Lang } from "@/lib/locale";
import { buildErrorMetadata } from "@/lib/metadata";
import { homePath } from "@/lib/routing";
import { MANUAL_SCROLL_RESTORATION } from "@/lib/scroll";

type ErrorViewProps = {
  lang: Lang;
};

// Chrome restores the scroll position of the reloaded document even after scrolling to the
// top, so the requested page could show up scrolled down; "manual" mode stops that restoration.
// The reload keeps the address and asks the server again (plan, D6).
function retry() {
  window.history.scrollRestoration = MANUAL_SCROLL_RESTORATION;
  window.scrollTo(0, 0);
  window.location.reload();
}

export function ErrorView({ lang }: ErrorViewProps) {
  const dictionary = selectDictionary(lang, DICTIONARIES);
  return (
    <>
      <PageMetadata metadata={buildErrorMetadata(dictionary)} />
      <main className="mx-auto max-w-2xl px-4 py-8 break-words">
        <h1 className="text-2xl font-bold">{dictionary.error.heading}</h1>
        <p>{dictionary.error.message}</p>
        <div className="mt-4 flex flex-wrap items-baseline gap-4">
          <button
            type="button"
            className="border-2 border-neutral-900 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            onClick={retry}
          >
            {dictionary.error.retry}
          </button>
          <a
            href={homePath(lang)}
            className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {dictionary.common.homeLink}
          </a>
        </div>
      </main>
    </>
  );
}
