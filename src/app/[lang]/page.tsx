import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PageMetadata } from "@/components/PageMetadata";
import { DICTIONARIES } from "@/i18n";
import { selectDictionary } from "@/lib/dictionaries";
import { isSupportedLang } from "@/lib/locale";
import { buildHomeMetadata } from "@/lib/metadata";

type HomePageProps = {
  params: Promise<{ lang: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  // The root layout lives in [lang], so /fr or /favicon.ico land here too (plan, D3).
  if (!isSupportedLang(lang)) {
    notFound();
  }
  const activeLang = lang;
  const dictionary = selectDictionary(activeLang, DICTIONARIES);
  return (
    <>
      <PageMetadata metadata={buildHomeMetadata(dictionary)} />
      <nav className="mx-auto max-w-2xl px-4 py-3">
        <LanguageSwitcher lang={activeLang} texts={dictionary.switcher} />
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8 break-words">
        <h1 className="text-2xl font-bold">{dictionary.home.name}</h1>
        <p>{dictionary.home.role}</p>
        <p>{dictionary.home.notice}</p>
      </main>
    </>
  );
}
