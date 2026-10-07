"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PageMetadata } from "@/components/PageMetadata";
import { DICTIONARIES } from "@/i18n";
import { selectDictionary } from "@/lib/dictionaries";
import { buildNotFoundMetadata } from "@/lib/metadata";
import { homePath, routeLangOrDefault } from "@/lib/routing";

// not-found receives no params, so the language comes from the path with the same rule
// the layout uses for <html lang> (plan, section 5).
export default function NotFound() {
  const lang = routeLangOrDefault(usePathname());
  const dictionary = selectDictionary(lang, DICTIONARIES);
  return (
    <>
      <PageMetadata metadata={buildNotFoundMetadata(dictionary)} />
      <nav className="mx-auto max-w-2xl px-4 py-3">
        <LanguageSwitcher lang={lang} texts={dictionary.switcher} />
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8 break-words">
        <h1 className="text-2xl font-bold">{dictionary.notFound.heading}</h1>
        <p>{dictionary.notFound.message}</p>
        <div className="mt-4">
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
