import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import {
  ABOUT_FIELD_IDS,
  JOBS,
  LANGUAGE_IDS,
  LOGO_CREDITS,
  PROJECTS,
  SKILL_FOLDERS,
  STUDIES,
  type SkillId,
} from "@/content/catalog";
import { DICTIONARIES } from "@/i18n";
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

  it("lists jobs in catalog order", () => {
    expect(Object.keys(content.jobs)).toEqual(JOBS.map((job) => job.id));
  });

  it("lists job tasks in the order of the jobs and their taskIds", () => {
    expect(Object.keys(content.jobTasks)).toEqual(
      JOBS.flatMap((job) => job.taskIds),
    );
  });

  it("lists job tools in the order the jobs use them", () => {
    expect(Object.keys(content.jobTools)).toEqual(
      unique(JOBS.flatMap((job) => job.toolIds)),
    );
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

// Annex A of spec 011, letter by letter; title, period, organization, area and the
// three tasks are spec 004's, unchanged (the tasks only moved to jobTasks).
const MUNICIPAL_INTERNSHIP_ANNEX_A = {
  es: {
    title: "Asistente de Datos y Automatización",
    period: "2025",
    organization: "Municipalidad de Caseros",
    area: "Área de Acción Social",
    modality: "Pasantía · 200 h · 6 meses",
    highlight:
      "Sistema de planillas adoptado por el equipo, que reemplazó los registros en papel",
  },
  en: {
    title: "Data and Automation Assistant",
    period: "2025",
    organization: "Municipalidad de Caseros",
    area: "Social Action Department",
    modality: "Internship · 200 h · 6 months",
    highlight:
      "Spreadsheet system adopted by the team to replace the paper records",
  },
} as const;

const JOB_TASKS_ANNEX_A = {
  es: {
    digitization:
      "Identifiqué la problemática de gestión documental del área y propuse una solución de digitalización que reemplazó registros en papel sin orden.",
    spreadsheets:
      "Desarrollé un sistema de planillas en Excel con funciones avanzadas (BUSCARV, tablas dinámicas, validación de datos, fórmulas condicionales) adoptado por el equipo de trabajo.",
    sensitiveData:
      "Gestioné datos sensibles de ciudadanos garantizando la confidencialidad, integridad y trazabilidad de la información.",
  },
  en: {
    digitization:
      "Identified the department's document management problem and proposed a digitization solution to replace unorganized paper records.",
    spreadsheets:
      "Developed an Excel spreadsheet system with advanced functions (VLOOKUP, pivot tables, data validation, conditional formulas) that was adopted by the team.",
    sensitiveData:
      "Managed sensitive citizen data, ensuring the confidentiality, integrity and traceability of the information.",
  },
} as const;

const JOB_TOOLS_ANNEX_A = {
  es: {
    advancedExcel: "Excel avanzado",
    pivotTables: "Tablas dinámicas",
    dataValidation: "Validación de datos",
    sensitiveDataHandling: "Gestión de datos sensibles",
  },
  en: {
    advancedExcel: "Advanced Excel",
    pivotTables: "Pivot tables",
    dataValidation: "Data validation",
    sensitiveDataHandling: "Sensitive data handling",
  },
} as const;

describe.each(LANGS)("CONTENT.%s experience (spec 011, annex A)", (lang) => {
  it("matches annex A for the internship", () => {
    expect(CONTENT[lang].jobs.municipalInternship).toEqual(
      MUNICIPAL_INTERNSHIP_ANNEX_A[lang],
    );
  });

  it("matches annex A for the job tasks", () => {
    expect(CONTENT[lang].jobTasks).toEqual(JOB_TASKS_ANNEX_A[lang]);
  });

  it("matches annex A for the job tools", () => {
    expect(CONTENT[lang].jobTools).toEqual(JOB_TOOLS_ANNEX_A[lang]);
  });
});

describe("organization names (spec 011, RF-10)", () => {
  it("writes every organization the same in es and en", () => {
    for (const job of JOBS) {
      expect(CONTENT.en.jobs[job.id].organization).toBe(
        CONTENT.es.jobs[job.id].organization,
      );
    }
  });
});

// Table of texts of spec 010, letter by letter; the profile is spec 004's, unchanged.
const ABOUT_TABLE = {
  es: {
    profile:
      "Técnico en Informática Personal y Profesional con conocimientos en mantenimiento de hardware, instalación y configuración de sistemas operativos y soporte técnico. Actualmente cursando la Tecnicatura Superior en Desarrollo de Software con manejo de JavaScript, MySQL, HTML/CSS y formación activa en React Native y C# / .NET. Experiencia en diseño de bases de datos relacionales y desarrollo web en entornos de equipo con metodología Scrum.",
    photoAlt: "Foto de perfil de Santiago Elian Vazquez",
    fields: {
      name: "Santiago Elian Vazquez",
      role: "Desarrollador Full Stack",
      location: "Buenos Aires, Argentina",
      studies: "Tecnicatura en Desarrollo de Software, cursando 2° año",
      languages: "Español nativo · Inglés B2",
      status: "Disponible para trabajar",
    },
  },
  en: {
    profile:
      "IT Technician with knowledge of hardware maintenance, operating system installation and configuration, and technical support. Currently pursuing a Higher Technical Degree in Software Development, working with JavaScript, MySQL and HTML/CSS, and actively training in React Native and C# / .NET. Experience in relational database design and web development in team environments using the Scrum methodology.",
    photoAlt: "Profile photo of Santiago Elian Vazquez",
    fields: {
      name: "Santiago Elian Vazquez",
      role: "Full Stack Developer",
      location: "Buenos Aires, Argentina",
      studies:
        "Technical Degree in Software Development, currently in 2nd year",
      languages: "Native Spanish · English B2",
      status: "Open to work",
    },
  },
} as const;

describe.each(LANGS)("CONTENT.%s about (spec 010)", (lang) => {
  const about = CONTENT[lang].about;

  it("matches the table of texts letter by letter", () => {
    expect(about).toEqual(ABOUT_TABLE[lang]);
  });

  it("lists the fields in ABOUT_FIELD_IDS order", () => {
    expect(Object.keys(about.fields)).toEqual(ABOUT_FIELD_IDS);
  });

  it("repeats the name and role of the home page (RF-13)", () => {
    expect(about.fields.name).toBe(DICTIONARIES[lang].home.name);
    expect(about.fields.role).toBe(DICTIONARIES[lang].home.role);
  });

  it("gives only the city and country as location (RF-14)", () => {
    expect(about.fields.location).toBe("Buenos Aires, Argentina");
  });
});

describe("about studies in Spanish (spec 010)", () => {
  it("is exactly the owner's text", () => {
    expect(CONTENT.es.about.fields.studies).toBe(
      "Tecnicatura en Desarrollo de Software, cursando 2° año",
    );
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
