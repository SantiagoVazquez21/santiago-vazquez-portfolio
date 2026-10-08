import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
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
      <DesktopShell
        lang={activeLang}
        home={dictionary.home}
        desktopTexts={dictionary.desktop}
        windowTexts={dictionary.windows}
        switcherTexts={dictionary.switcher}
      />
    </>
  );
}
