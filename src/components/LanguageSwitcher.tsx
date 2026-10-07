import type { Dictionary } from "@/i18n/types";
import { buildSwitcherItems } from "@/lib/language-switcher";
import type { Lang } from "@/lib/locale";

type LanguageSwitcherProps = {
  lang: Lang;
  texts: Dictionary["switcher"];
};

// The visible code is hidden from assistive tech and the full name lives in sr-only text,
// so the tree exposes the name once without aria-label on a generic element (plan, D7).
// The border between codes lives on the wrappers, not on the codes, so the active code's
// border-2 cannot override it and it looks the same whichever language is active.
export function LanguageSwitcher({ lang, texts }: LanguageSwitcherProps) {
  return (
    <span className="divide-x divide-neutral-900">
      {buildSwitcherItems(lang, texts).map((item) => (
        <span key={item.lang} className="px-1 first:pl-0 last:pr-0">
          {item.href === null ? (
            <span className="px-1 font-bold border-2 border-neutral-900">
              <span aria-hidden="true">{item.code}</span>
              <span className="sr-only">{item.accessibleName}</span>
            </span>
          ) : (
            <a
              href={item.href}
              className="px-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              <span aria-hidden="true">{item.code}</span>
              <span className="sr-only">{item.accessibleName}</span>
            </a>
          )}
        </span>
      ))}
    </span>
  );
}
