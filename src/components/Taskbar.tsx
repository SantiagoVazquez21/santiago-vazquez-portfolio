import type { ReactNode } from "react";
import { Clock } from "@/components/Clock";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary } from "@/i18n/types";
import type { Lang } from "@/lib/locale";

type TaskbarProps = {
  lang: Lang;
  home: Dictionary["home"];
  switcherTexts: Dictionary["switcher"];
  clockName: string;
  // The window buttons, placed in the tray row before the tray (003 plan, section 6).
  children?: ReactNode;
  // True only with an open window: six icon-only buttons then fit beside the tray at
  // 320 px, and without windows the tray keeps its spec 002 padding (003 plan, section 9).
  compactTray?: boolean;
};

// The name and role are plain text: the page's only h1 is the desktop title (RF-1, RF-11).
// The switcher keeps its 001 markup; the retro look comes from the sunken tray around it,
// so the 404 page, which also uses it, does not change (plan, D9). The tray wraps too, so at
// high zoom the clock drops under the switcher instead of pushing the page sideways (RF-14).
// The tray row holds only the tray when there are no windows: its widest content is the tray,
// so the footer breaks lines at the same widths as spec 002 and flex-auto with justify-end
// keeps the tray on the right, as ml-auto did (003 plan, section 6).
export function Taskbar({
  lang,
  home,
  switcherTexts,
  clockName,
  children,
  compactTray = false,
}: TaskbarProps) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-t-white bg-[#C0C0C0] px-2 py-1 text-black">
      <p className="flex min-w-0 flex-wrap gap-x-2 break-words">
        <span className="font-bold">{home.name}</span>
        <span>{home.role}</span>
      </p>
      <div className="ml-auto flex max-w-full min-w-0 flex-auto flex-wrap items-center justify-end gap-x-0.5">
        {children}
        <div
          className={
            compactTray
              ? "ml-auto flex max-w-full flex-wrap items-center gap-x-2 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] px-1 py-0.5"
              : "ml-auto flex max-w-full flex-wrap items-center gap-x-3 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] px-2 py-0.5"
          }
        >
          <nav>
            <LanguageSwitcher lang={lang} texts={switcherTexts} />
          </nav>
          <Clock lang={lang} name={clockName} />
        </div>
      </div>
    </footer>
  );
}
