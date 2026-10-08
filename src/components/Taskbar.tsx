import { Clock } from "@/components/Clock";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary } from "@/i18n/types";
import type { Lang } from "@/lib/locale";

type TaskbarProps = {
  lang: Lang;
  home: Dictionary["home"];
  switcherTexts: Dictionary["switcher"];
  clockName: string;
};

// The name and role are plain text: the page's only h1 is the desktop title (RF-1, RF-11).
// The switcher keeps its 001 markup; the retro look comes from the sunken tray around it,
// so the 404 page, which also uses it, does not change (plan, D9). The tray wraps too, so at
// high zoom the clock drops under the switcher instead of pushing the page sideways (RF-14).
export function Taskbar({
  lang,
  home,
  switcherTexts,
  clockName,
}: TaskbarProps) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-t-white bg-[#C0C0C0] px-2 py-1 text-black">
      <p className="flex min-w-0 flex-wrap gap-x-2 break-words">
        <span className="font-bold">{home.name}</span>
        <span>{home.role}</span>
      </p>
      <div className="ml-auto flex max-w-full flex-wrap items-center gap-x-3 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] px-2 py-0.5">
        <nav>
          <LanguageSwitcher lang={lang} texts={switcherTexts} />
        </nav>
        <Clock lang={lang} name={clockName} />
      </div>
    </footer>
  );
}
