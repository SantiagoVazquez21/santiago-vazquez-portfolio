import { describe, expect, it } from "vitest";
import {
  compareDictionaries,
  type DictionaryIssue,
  type DictionaryTree,
  type NamedDictionary,
  selectDictionary,
} from "@/lib/dictionaries";
import type { Lang } from "@/lib/locale";

function named(name: string, tree: DictionaryTree): NamedDictionary {
  return { name, tree };
}

function missingKey(path: string, missingIn: string): DictionaryIssue {
  return { kind: "missingKey", path, missingIn };
}

function textGroupMismatch(path: string): DictionaryIssue {
  return { kind: "textGroupMismatch", path };
}

function emptyText(path: string, dictionary: string): DictionaryIssue {
  return { kind: "emptyText", path, dictionary };
}

const NO_BREAK_SPACE = " ";

describe("compareDictionaries", () => {
  it("returns no issues for dictionaries with the same keys at every level", () => {
    const es = named("es", {
      title: "Hola",
      group: { name: "Ana", nested: { deep: "Profundo" } },
    });
    const en = named("en", {
      title: "Hello",
      group: { name: "Ana", nested: { deep: "Deep" } },
    });

    expect(compareDictionaries(es, en)).toEqual([]);
  });

  it("does not flag the same text in both languages as untranslated", () => {
    const es = named("es", { code: "ES", name: "Ana" });
    const en = named("en", { code: "ES", name: "Ana" });

    expect(compareDictionaries(es, en)).toEqual([]);
  });

  it("lists every missing key on both sides with its full path and the dictionary where it is missing", () => {
    const es = named("es", {
      onlyInEs: "Solo es",
      shared: "Compartido",
      group: {
        onlyInEs: "Solo es",
        nested: { onlyInEs: "Solo es", shared: "Compartido" },
      },
      groupOnlyInEs: { child: "Hijo" },
    });
    const en = named("en", {
      shared: "Shared",
      group: {
        nested: { shared: "Shared", onlyInEn: "Only en" },
        onlyInEn: "Only en",
      },
      onlyInEn: "Only en",
    });

    expect(compareDictionaries(es, en)).toEqual([
      missingKey("onlyInEs", "en"),
      missingKey("group.onlyInEs", "en"),
      missingKey("group.nested.onlyInEs", "en"),
      missingKey("group.nested.onlyInEn", "es"),
      missingKey("group.onlyInEn", "es"),
      missingKey("groupOnlyInEs", "en"),
      missingKey("groupOnlyInEs.child", "en"),
      missingKey("onlyInEn", "es"),
    ]);
  });

  it("reports a whole missing group and every key it contains, in order", () => {
    const es = named("es", {
      title: "Hola",
      notFound: {
        metaTitle: "Página no encontrada",
        metaDescription: "La página no existe",
        heading: "No encontrada",
        message: "Volvé al inicio",
      },
    });
    const en = named("en", { title: "Hello" });

    expect(compareDictionaries(es, en)).toEqual([
      missingKey("notFound", "en"),
      missingKey("notFound.metaTitle", "en"),
      missingKey("notFound.metaDescription", "en"),
      missingKey("notFound.heading", "en"),
      missingKey("notFound.message", "en"),
    ]);
  });

  it("reports the keys of a missing group two levels deep, group before its keys", () => {
    const es = named("es", { title: "Hola" });
    const en = named("en", {
      title: "Hello",
      errorPage: {
        retry: { label: "Retry", hint: "Try again" },
        link: "Home",
      },
    });

    expect(compareDictionaries(es, en)).toEqual([
      missingKey("errorPage", "es"),
      missingKey("errorPage.retry", "es"),
      missingKey("errorPage.retry.label", "es"),
      missingKey("errorPage.retry.hint", "es"),
      missingKey("errorPage.link", "es"),
    ]);
  });

  it("names each dictionary by the name it receives", () => {
    const first = named("first", { a: "A" });
    const second = named("second", { b: "B" });

    expect(compareDictionaries(first, second)).toEqual([
      missingKey("a", "second"),
      missingKey("b", "first"),
    ]);
  });

  it("reports a key that is text in one dictionary and a group in the other, in both directions", () => {
    const es = named("es", {
      label: "Etiqueta",
      section: { title: "Título" },
      group: { inner: "Interno" },
    });
    const en = named("en", {
      label: { short: "Label" },
      section: "Section",
      group: { inner: { deeper: "Deeper" } },
    });

    expect(compareDictionaries(es, en)).toEqual([
      textGroupMismatch("label"),
      textGroupMismatch("section"),
      textGroupMismatch("group.inner"),
    ]);
  });

  it("reports empty text with the key and the dictionary, on both sides", () => {
    const es = named("es", { title: "", group: { body: "Cuerpo" } });
    const en = named("en", { title: "Title", group: { body: "" } });

    expect(compareDictionaries(es, en)).toEqual([
      emptyText("title", "es"),
      emptyText("group.body", "en"),
    ]);
  });

  it("reports a key that is empty in both dictionaries once per dictionary", () => {
    const es = named("es", { title: "" });
    const en = named("en", { title: "" });

    expect(compareDictionaries(es, en)).toEqual([
      emptyText("title", "es"),
      emptyText("title", "en"),
    ]);
  });

  it.each([
    ["spaces", "   "],
    ["a tab and a newline", "\t\n"],
    ["a no-break space", NO_BREAK_SPACE],
    [
      "no-break spaces mixed with spaces",
      ` ${NO_BREAK_SPACE} ${NO_BREAK_SPACE}`,
    ],
  ])("treats text made only of %s as empty", (_label, blank) => {
    const es = named("es", { title: blank });
    const en = named("en", { title: "Title" });

    expect(compareDictionaries(es, en)).toEqual([emptyText("title", "es")]);
  });

  it("does not treat text with visible characters around spaces as empty", () => {
    const es = named("es", { title: ` Hola${NO_BREAK_SPACE}` });
    const en = named("en", { title: " Hello " });

    expect(compareDictionaries(es, en)).toEqual([]);
  });

  it("still reports empty texts inside a missing key or a text/group conflict", () => {
    const es = named("es", {
      onlyInEs: { blank: " " },
      conflict: { blank: NO_BREAK_SPACE },
    });
    const en = named("en", {
      conflict: "",
      onlyInEn: "",
    });

    expect(compareDictionaries(es, en)).toEqual([
      missingKey("onlyInEs", "en"),
      missingKey("onlyInEs.blank", "en"),
      emptyText("onlyInEs.blank", "es"),
      textGroupMismatch("conflict"),
      emptyText("conflict.blank", "es"),
      emptyText("conflict", "en"),
      missingKey("onlyInEn", "es"),
      emptyText("onlyInEn", "en"),
    ]);
  });

  it("reports every kind of issue in a single call, not only the first one", () => {
    const es = named("es", {
      missingInEn: "Falta en en",
      conflict: "Texto",
      blank: "  ",
      group: { missingInEn: "Falta", ok: "Bien" },
    });
    const en = named("en", {
      conflict: { text: "Text" },
      blank: "Blank",
      group: { ok: "Ok", missingInEs: "Missing" },
      missingInEs: "Missing",
    });

    expect(compareDictionaries(es, en)).toEqual([
      missingKey("missingInEn", "en"),
      textGroupMismatch("conflict"),
      emptyText("blank", "es"),
      missingKey("group.missingInEn", "en"),
      missingKey("group.missingInEs", "es"),
      missingKey("missingInEs", "es"),
    ]);
  });
});

describe("selectDictionary", () => {
  const DICTIONARIES: Readonly<Record<Lang, { greeting: string }>> = {
    es: { greeting: "Hola" },
    en: { greeting: "Hello" },
  };

  it("returns the Spanish dictionary for es", () => {
    expect(selectDictionary("es", DICTIONARIES)).toBe(DICTIONARIES.es);
  });

  it("returns the English dictionary for en", () => {
    expect(selectDictionary("en", DICTIONARIES)).toBe(DICTIONARIES.en);
  });
});
