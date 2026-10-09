import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import {
  JOBS,
  LANGUAGE_IDS,
  LOGO_CREDITS,
  PROJECTS,
  SKILL_FOLDERS,
  STUDIES,
  type SkillId,
} from "@/content/catalog";
import { compareDictionaries, type DictionaryTree } from "@/lib/dictionaries";

const LANGS = ["es", "en"] as const;

// Skills that are concepts, not brands: the only ones translated (annex A of spec 004).
const CONCEPT_SKILLS: readonly SkillId[] = [
  "relationalModeling",
  "hardware",
  "networking",
  "techSupport",
];

// Seven or more digits, even when split by a space, dot or hyphen: the shape of a phone
// or ID number. The en dash of the periods ("2019 – 2025") is not a separator here.
const LONG_NUMBER = /(?:\d[\s.-]?){7,}/;
const SLASH_DATE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function collectTexts(tree: DictionaryTree): string[] {
  return Object.values(tree).flatMap((value) =>
    typeof value === "string" ? [value] : collectTexts(value),
  );
}

describe("CONTENT parity", () => {
  it("has the same keys in es and en and no empty texts", () => {
    expect(
      compareDictionaries(
        { name: "es", tree: CONTENT.es },
        { name: "en", tree: CONTENT.en },
      ),
    ).toEqual([]);
  });
});

describe.each(LANGS)("CONTENT.%s keys follow the catalog", (lang) => {
  const content = CONTENT[lang];

  it("lists projects in catalog order", () => {
    expect(Object.keys(content.projects)).toEqual(
      PROJECTS.map((project) => project.id),
    );
  });

  it("gives each project exactly its featureIds, in order", () => {
    for (const project of PROJECTS) {
      expect(Object.keys(content.projects[project.id].features)).toEqual(
        project.featureIds,
      );
    }
  });

  it("lists project tags in the order the projects use them", () => {
    expect(Object.keys(content.projectTags)).toEqual(
      unique(PROJECTS.flatMap((project) => project.tagIds)),
    );
  });

  it("lists technologies in the order the projects use them", () => {
    expect(Object.keys(content.technologies)).toEqual(
      unique(PROJECTS.flatMap((project) => project.technologyIds)),
    );
  });

  it("lists jobs in catalog order, each with exactly its taskIds", () => {
    expect(Object.keys(content.jobs)).toEqual(JOBS.map((job) => job.id));
    for (const job of JOBS) {
      expect(Object.keys(content.jobs[job.id].tasks)).toEqual(job.taskIds);
    }
  });

  it("lists studies in catalog order", () => {
    expect(Object.keys(content.studies)).toEqual(
      STUDIES.map((study) => study.id),
    );
  });

  it("gives a status only to the studies with hasStatus", () => {
    for (const study of STUDIES) {
      expect(Object.hasOwn(content.studies[study.id], "status")).toBe(
        study.hasStatus,
      );
    }
  });

  it("lists languages in catalog order", () => {
    expect(Object.keys(content.languages)).toEqual(LANGUAGE_IDS);
  });

  it("lists folders and skills in catalog order", () => {
    expect(Object.keys(content.folders)).toEqual(
      SKILL_FOLDERS.map((folder) => folder.id),
    );
    expect(Object.keys(content.skills)).toEqual(
      SKILL_FOLDERS.flatMap((folder) => folder.skillIds),
    );
  });
});

// Annex A of spec 008, letter by letter.
const GESTION_PRO_ANNEX_A = {
  es: {
    name: "Gestion Pro",
    tagline: "Sistema de gestión para taller electrónico automotriz",
    description:
      "Aplicación de escritorio para la gestión completa de un laboratorio de electrónica automotriz. Desarrollada en equipo aplicando arquitectura en capas.",
    contribution:
      "Diseñé el sistema de interfaz (tema y estilos) y desarrollé las pantallas de login, clientes, órdenes de trabajo, ventas con control de stock, cotizaciones y garantías, el modo oscuro y la documentación de diseño.",
    features: {
      customers: "Gestión de clientes",
      workOrders: "Órdenes de trabajo: módulos, cerrajería e instalaciones",
      sales: "Ventas de insumos con control de stock",
      quotes: "Cotizaciones",
      warranties: "Garantías",
    },
  },
  en: {
    name: "Gestion Pro",
    tagline: "Management system for an automotive electronics workshop",
    description:
      "Desktop application for the end-to-end management of an automotive electronics lab. Developed as a team using a layered architecture.",
    contribution:
      "Designed the interface system (theme and styles) and built the screens for login, customers, work orders, sales with inventory control, quotes and warranties, as well as the dark mode and the design documentation.",
    features: {
      customers: "Customer management",
      workOrders:
        "Work orders: electronic modules, automotive locksmithing and installations",
      sales: "Parts and supplies sales with inventory control",
      quotes: "Quotes",
      warranties: "Warranties",
    },
  },
} as const;

const PROJECT_TAGS_ANNEX_A = {
  es: { teamWork: "Desarrollado en equipo", desktopApp: "App de escritorio" },
  en: { teamWork: "Developed as a team", desktopApp: "Desktop app" },
} as const;

describe.each(LANGS)("CONTENT.%s projects (spec 008, annex A)", (lang) => {
  it("matches annex A for Gestion Pro", () => {
    expect(CONTENT[lang].projects.gestionPro).toEqual(
      GESTION_PRO_ANNEX_A[lang],
    );
  });

  it("matches annex A for the project tags", () => {
    expect(CONTENT[lang].projectTags).toEqual(PROJECT_TAGS_ANNEX_A[lang]);
  });
});

describe("project names (RF-10)", () => {
  it("writes every project name the same in es and en", () => {
    for (const project of PROJECTS) {
      expect(CONTENT.en.projects[project.id].name).toBe(
        CONTENT.es.projects[project.id].name,
      );
    }
  });
});

describe("brand names (RF-14)", () => {
  it("writes the project technologies the same in es and en", () => {
    expect(CONTENT.es.technologies).toEqual(CONTENT.en.technologies);
  });

  it("writes every skill that is not a concept the same in es and en", () => {
    const brands = SKILL_FOLDERS.flatMap((folder) => folder.skillIds).filter(
      (id) => !CONCEPT_SKILLS.includes(id),
    );
    expect(brands).toHaveLength(20);
    for (const id of brands) {
      expect(CONTENT.en.skills[id]).toBe(CONTENT.es.skills[id]);
    }
  });
});

describe("logo credits (RF-14, RF-15)", () => {
  it.each(LANGS)("CONTENT.%s lists them in LOGO_CREDITS order", (lang) => {
    expect(Object.keys(CONTENT[lang].logoCredits)).toEqual(
      LOGO_CREDITS.map((credit) => credit.id),
    );
  });

  it("writes them the same in es and en", () => {
    expect(CONTENT.es.logoCredits).toEqual(CONTENT.en.logoCredits);
  });

  it("names the license of each logo", () => {
    expect(CONTENT.es.logoCredits.php.license).toBe("CC BY-SA 4.0");
    expect(CONTENT.es.logoCredits.git.license).toBe("CC BY 3.0");
  });

  it.each(LANGS)(
    "CONTENT.%s gives each logo a filled-in author or source",
    (lang) => {
      for (const { author } of Object.values(CONTENT[lang].logoCredits)) {
        expect(author.trim()).not.toBe("");
        expect(author).not.toMatch(/[{}‹›]/);
      }
    },
  );
});

describe.each(LANGS)("CONTENT.%s personal data (RNF-4)", (lang) => {
  const texts = collectTexts(CONTENT[lang]);

  it("has texts to check", () => {
    expect(texts.length).toBeGreaterThan(0);
  });

  it("has no email address", () => {
    expect(texts.filter((text) => text.includes("@"))).toEqual([]);
  });

  it("has no phone or ID number", () => {
    expect(texts.filter((text) => LONG_NUMBER.test(text))).toEqual([]);
  });

  it("has no date written with slashes", () => {
    expect(texts.filter((text) => SLASH_DATE.test(text))).toEqual([]);
  });
});

describe("personal data patterns", () => {
  it("catch the shapes they are meant to catch", () => {
    expect(LONG_NUMBER.test("11 2345-6789")).toBe(true);
    expect(LONG_NUMBER.test("40.123.456")).toBe(true);
    expect(SLASH_DATE.test("01/01/1990")).toBe(true);
  });

  it("let the periods of annex A through", () => {
    expect(LONG_NUMBER.test("2019 – 2025")).toBe(false);
    expect(LONG_NUMBER.test("2026 – Actualidad")).toBe(false);
  });
});
