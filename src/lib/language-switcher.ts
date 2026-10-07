import type { Dictionary } from "@/i18n/types";
import { type Lang, SUPPORTED_LANGS } from "@/lib/locale";
import { homePath } from "@/lib/routing";

export type SwitcherItem = {
  lang: Lang;
  code: string;
  accessibleName: string;
  // null marks the active code: it is not a link, so it cannot be activated (RF-53).
  href: string | null;
};

function codeFor(lang: Lang, texts: Dictionary["switcher"]): string {
  return lang === "es" ? texts.esCode : texts.enCode;
}

// Names come from the active language's dictionary, so the caller passes that one (RF-32).
export function buildSwitcherItems(
  activeLang: Lang,
  texts: Dictionary["switcher"],
): SwitcherItem[] {
  return SUPPORTED_LANGS.map((lang) => {
    const code = codeFor(lang, texts);
    if (lang === activeLang) {
      return { lang, code, accessibleName: texts.activeName, href: null };
    }
    return {
      lang,
      code,
      accessibleName: texts.inactiveName,
      href: homePath(lang),
    };
  });
}
