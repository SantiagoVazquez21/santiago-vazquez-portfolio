import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import { fillTemplate, splitTemplate } from "@/lib/text-template";

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

describe("splitTemplate", () => {
  it("splits around a key in the middle (RF-8)", () => {
    expect(
      splitTemplate("También podés escribirme por {link}.", "link"),
    ).toEqual({ before: "También podés escribirme por ", after: "." });
  });

  it("gives an empty before when the key opens the text", () => {
    expect(splitTemplate("{link} es mi perfil", "link")).toEqual({
      before: "",
      after: " es mi perfil",
    });
  });

  it("gives an empty after when the key closes the text", () => {
    expect(splitTemplate("Escribime por {link}", "link")).toEqual({
      before: "Escribime por ",
      after: "",
    });
  });

  it("throws when the key is missing from the text", () => {
    expect(() => splitTemplate("Sin enlace.", "link")).toThrow();
  });

  it("throws when the key appears more than once", () => {
    expect(() => splitTemplate("{link} y {link}", "link")).toThrow();
  });

  it("does not take a different key as the requested one", () => {
    expect(() => splitTemplate("Hasta {max} caracteres.", "link")).toThrow();
    expect(splitTemplate("{max} y {link}.", "link")).toEqual({
      before: "{max} y ",
      after: ".",
    });
  });
});
