import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import type { Dictionary } from "@/i18n/types";
import { buildSwitcherItems, type SwitcherItem } from "@/lib/language-switcher";
import { type Lang, SUPPORTED_LANGS } from "@/lib/locale";
import { homePath } from "@/lib/routing";

// Every text differs from the real ones, so a text hand-written inside the builder
// fails here even when it matches the real dictionary.
const TEST_SWITCHER: Dictionary["switcher"] = {
  esCode: "T-ES",
  enCode: "T-EN",
  inactiveName: "Test inactive name",
  activeName: "Test active name",
};

const NAMED_TEXTS: ReadonlyArray<readonly [string, Dictionary["switcher"]]> = [
  ["es", DICTIONARIES.es.switcher],
  ["en", DICTIONARIES.en.switcher],
  ["test", TEST_SWITCHER],
];

function codeFor(lang: Lang, texts: Dictionary["switcher"]): string {
  return lang === "es" ? texts.esCode : texts.enCode;
}

const CASES = SUPPORTED_LANGS.flatMap((activeLang) =>
  NAMED_TEXTS.map(([dictionaryName, texts]) => ({
    activeLang,
    dictionaryName,
    texts,
  })),
);

describe("buildSwitcherItems", () => {
  it.each(CASES)(
    "active $activeLang, dictionary $dictionaryName: lists ES then EN",
    ({ activeLang, texts }) => {
      const items = buildSwitcherItems(activeLang, texts);
      expect(items.map((item) => item.lang)).toEqual(["es", "en"]);
      expect(items.map((item) => item.code)).toEqual([
        texts.esCode,
        texts.enCode,
      ]);
    },
  );

  it.each(CASES)(
    "active $activeLang, dictionary $dictionaryName: the active code is not a link and carries activeName",
    ({ activeLang, texts }) => {
      const active = buildSwitcherItems(activeLang, texts).filter(
        (item) => item.lang === activeLang,
      );
      expect(active).toEqual([
        {
          lang: activeLang,
          code: codeFor(activeLang, texts),
          accessibleName: texts.activeName,
          href: null,
        },
      ]);
    },
  );

  it.each(CASES)(
    "active $activeLang, dictionary $dictionaryName: the other code links to its home page and carries inactiveName",
    ({ activeLang, texts }) => {
      const others = buildSwitcherItems(activeLang, texts).filter(
        (item) => item.lang !== activeLang,
      );
      const otherLang = SUPPORTED_LANGS.filter((lang) => lang !== activeLang);
      expect(others).toEqual(
        otherLang.map((lang) => ({
          lang,
          code: codeFor(lang, texts),
          accessibleName: texts.inactiveName,
          href: homePath(lang),
        })),
      );
    },
  );

  // The page always pairs the active language with its own dictionary (RF-32, RF-54).
  it("active es, dictionary es: owner's texts", () => {
    const expected: SwitcherItem[] = [
      {
        lang: "es",
        code: "ES",
        accessibleName: "ES, idioma actual",
        href: null,
      },
      {
        lang: "en",
        code: "EN",
        accessibleName: "EN, cambiar a inglés",
        href: "/en",
      },
    ];
    expect(buildSwitcherItems("es", DICTIONARIES.es.switcher)).toEqual(
      expected,
    );
  });

  it("active en, dictionary en: owner's texts", () => {
    const expected: SwitcherItem[] = [
      {
        lang: "es",
        code: "ES",
        accessibleName: "ES, switch to Spanish",
        href: "/es",
      },
      {
        lang: "en",
        code: "EN",
        accessibleName: "EN, current language",
        href: null,
      },
    ];
    expect(buildSwitcherItems("en", DICTIONARIES.en.switcher)).toEqual(
      expected,
    );
  });
});
