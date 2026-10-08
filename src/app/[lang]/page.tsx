import { notFound } from "next/navigation";
import { Desktop } from "@/components/Desktop";
import { PageMetadata } from "@/components/PageMetadata";
import { Taskbar } from "@/components/Taskbar";
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
      <div className="flex h-dvh flex-col">
        <Desktop home={dictionary.home} texts={dictionary.desktop} />
        <Taskbar
          lang={activeLang}
          home={dictionary.home}
          switcherTexts={dictionary.switcher}
          clockName={dictionary.desktop.clockName}
        />
      </div>
    </>
  );
}
