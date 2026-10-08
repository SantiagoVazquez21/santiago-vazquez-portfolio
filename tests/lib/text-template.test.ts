import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import { fillTemplate } from "@/lib/text-template";

describe("fillTemplate", () => {
  it("replaces a key with its value", () => {
    expect(fillTemplate("Hola {name}", { name: "Ana" })).toBe("Hola Ana");
  });

  it("replaces every occurrence of a key", () => {
    expect(fillTemplate("{a}-{b}-{a}", { a: "x", b: "y" })).toBe("x-y-x");
  });

  it("returns a text without keys unchanged", () => {
    expect(fillTemplate("Sin claves", { project: "Gestion Pro" })).toBe(
      "Sin claves",
    );
  });

  it("throws when a key of the text is missing from the values (RF-4)", () => {
    expect(() => fillTemplate("Repositorio de {project}", {})).toThrow();
  });

  it("does not take inherited properties as values", () => {
    expect(() => fillTemplate("{toString}", {})).toThrow();
  });

  it("builds the Spanish accessible name of annex B (RF-4)", () => {
    expect(
      fillTemplate(DICTIONARIES.es.sections.repositoryName, {
        project: "Gestion Pro",
      }),
    ).toBe("Repositorio de Gestion Pro, se abre en una pestaña nueva");
  });

  it("builds the English accessible name of annex B (RF-4)", () => {
    expect(
      fillTemplate(DICTIONARIES.en.sections.repositoryName, {
        project: "Gestion Pro",
      }),
    ).toBe("Gestion Pro repository, opens in a new tab");
  });
});
