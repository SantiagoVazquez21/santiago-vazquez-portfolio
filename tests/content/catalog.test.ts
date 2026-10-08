import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as catalog from "@/content/catalog";
import {
  BACK_GLYPH,
  FOLDER_GLYPH,
  JOBS,
  LANGUAGE_IDS,
  LOGO_CREDITS,
  PROJECTS,
  SKILL_FOLDERS,
  SKILL_GLYPHS,
  STUDIES,
  type FolderId,
  type SkillId,
  type TechnologyId,
} from "@/content/catalog";
import { logoFill } from "@/lib/color-contrast";

// Folders and skills in the order of annex A of spec 004.
const EXPECTED_FOLDERS: readonly {
  id: FolderId;
  skillIds: readonly SkillId[];
}[] = [
  {
    id: "frontend",
    skillIds: ["html", "css", "javascript", "react", "tailwind", "kaplay"],
  },
  { id: "backend", skillIds: ["php", "csharp", "python"] },
  { id: "databases", skillIds: ["mysql", "postgresql", "relationalModeling"] },
  {
    id: "tools",
    skillIds: ["git", "github", "figma", "vite", "arduino", "excel", "scrum"],
  },
  {
    id: "systems",
    skillIds: ["windows", "linux", "hardware", "networking", "techSupport"],
  },
];

const GESTION_PRO_TECHNOLOGIES: readonly TechnologyId[] = [
  "csharp",
  "dotnet",
  "winforms",
  "mysql",
  "postgresql",
];

describe("SKILL_FOLDERS", () => {
  it("lists the 5 folders in the order of annex A", () => {
    expect(SKILL_FOLDERS.map((folder) => folder.id)).toEqual([
      "frontend",
      "backend",
      "databases",
      "tools",
      "systems",
    ]);
  });

  it("holds 6, 3, 3, 7 and 5 skills", () => {
    expect(SKILL_FOLDERS.map((folder) => folder.skillIds.length)).toEqual([
      6, 3, 3, 7, 5,
    ]);
  });

  it("matches the folders and skill order of annex A exactly", () => {
    expect(SKILL_FOLDERS).toEqual(EXPECTED_FOLDERS);
  });

  it("places each of the 24 skills in exactly one folder", () => {
    const skillIds = SKILL_FOLDERS.flatMap((folder) => folder.skillIds);
    expect(skillIds).toHaveLength(24);
    expect(new Set(skillIds).size).toBe(24);
  });
});

describe("PROJECTS", () => {
  it("lists Gestion Pro as the only project", () => {
    expect(PROJECTS.map((project) => project.id)).toEqual(["gestionPro"]);
  });

  it("keeps only keys, the repository URL and technology ids (no visible text)", () => {
    for (const project of PROJECTS) {
      expect(Object.keys(project).sort()).toEqual([
        "id",
        "repositoryUrl",
        "technologyIds",
      ]);
    }
  });

  it("gives Gestion Pro its technologies in the order of annex A", () => {
    expect(PROJECTS[0].technologyIds).toEqual(GESTION_PRO_TECHNOLOGIES);
  });

  it("links Gestion Pro to its repository over https (RF-4)", () => {
    const url = new URL(PROJECTS[0].repositoryUrl);
    expect(url.protocol).toBe("https:");
    expect(PROJECTS[0].repositoryUrl).toBe(
      "https://github.com/ronnin47/sistemaDeGestionAutomotriz",
    );
  });
});

describe("JOBS", () => {
  it("lists the municipal internship with its 3 tasks in order", () => {
    expect(JOBS).toEqual([
      {
        id: "municipalInternship",
        taskIds: ["digitization", "spreadsheets", "sensitiveData"],
      },
    ]);
  });
});

describe("STUDIES", () => {
  it("lists study 1 with a status and study 2 without one", () => {
    expect(STUDIES).toEqual([
      { id: "softwareDevelopment", hasStatus: true },
      { id: "itTechnician", hasStatus: false },
    ]);
  });
});

describe("LANGUAGE_IDS", () => {
  it("lists English as the only language", () => {
    expect(LANGUAGE_IDS).toEqual(["english"]);
  });
});

// Result of T6 and T16 (plan 004, sections 6 and 10; docs/logos.md).
const LOGO_SKILLS: Partial<Record<SkillId, { src: string; brandHex: string }>> =
  {
    html: { src: "/skills/html5.svg", brandHex: "#E34F26" },
    css: { src: "/skills/css.svg", brandHex: "#663399" },
    react: { src: "/skills/react.svg", brandHex: "#61DAFB" },
    tailwind: { src: "/skills/tailwindcss.svg", brandHex: "#06B6D4" },
    python: { src: "/skills/python.svg", brandHex: "#3776AB" },
    mysql: { src: "/skills/mysql.svg", brandHex: "#4479A1" },
    postgresql: { src: "/skills/postgresql.svg", brandHex: "#4169E1" },
    github: { src: "/skills/github.svg", brandHex: "#181717" },
    figma: { src: "/skills/figma.svg", brandHex: "#F24E1E" },
    vite: { src: "/skills/vite.svg", brandHex: "#9135FF" },
    arduino: { src: "/skills/arduino.svg", brandHex: "#00878F" },
    linux: { src: "/skills/linux.svg", brandHex: "#FCC624" },
    javascript: { src: "/skills/javascript.svg", brandHex: "#F7DF1E" },
    php: { src: "/skills/php.svg", brandHex: "#777BB4" },
    git: { src: "/skills/git.svg", brandHex: "#F03C2E" },
  };

// Brands without a usable logo in Simple Icons 16.34.0 (plan 004, section 10.1).
const GENERIC_SKILLS: readonly SkillId[] = [
  "kaplay",
  "csharp",
  "excel",
  "scrum",
  "windows",
];

const PROGRAM_GLYPH = "/skills/own-program.svg";

const CONCEPT_GLYPHS: Partial<Record<SkillId, string>> = {
  relationalModeling: "/skills/own-erd.svg",
  hardware: "/skills/own-hardware.svg",
  networking: "/skills/own-network.svg",
  techSupport: "/skills/own-support.svg",
};

const ALL_SKILL_IDS = SKILL_FOLDERS.flatMap((folder) => folder.skillIds);

const OWN_DRAWINGS = [
  FOLDER_GLYPH,
  BACK_GLYPH,
  PROGRAM_GLYPH,
  ...Object.values(CONCEPT_GLYPHS),
];

function readPublic(src: string): string {
  return readFileSync(join(process.cwd(), "public", src), "utf8");
}

function rootFill(svg: string): string | undefined {
  return /^<svg\b[^>]*\sfill="([^"]*)"/.exec(svg)?.[1];
}

describe("glyphs", () => {
  it("points the folder and Back glyphs to distinct files under /icons/", () => {
    expect(FOLDER_GLYPH).toBe("/icons/folder.svg");
    expect(BACK_GLYPH).toBe("/icons/back.svg");
    expect(FOLDER_GLYPH).not.toBe(BACK_GLYPH);
  });

  it("ships the folder and Back drawings as different files", () => {
    expect(readPublic(FOLDER_GLYPH)).not.toBe(readPublic(BACK_GLYPH));
  });
});

describe("SKILL_GLYPHS", () => {
  it("has a drawing for each of the 24 skills and nothing else", () => {
    expect(Object.keys(SKILL_GLYPHS).sort()).toEqual([...ALL_SKILL_IDS].sort());
  });

  it("splits the skills into 15 logos, 5 generic brands and 4 concepts", () => {
    const covered = [
      ...Object.keys(LOGO_SKILLS),
      ...GENERIC_SKILLS,
      ...Object.keys(CONCEPT_GLYPHS),
    ];
    expect(covered.sort()).toEqual([...ALL_SKILL_IDS].sort());
  });

  it.each(Object.entries(CONCEPT_GLYPHS))(
    "draws the concept %s with its own drawing %s",
    (id, src) => {
      expect(SKILL_GLYPHS[id as SkillId]).toEqual({ src, brandHex: null });
    },
  );

  it("gives the 4 concepts 4 different drawings", () => {
    const sources = Object.keys(CONCEPT_GLYPHS).map(
      (id) => SKILL_GLYPHS[id as SkillId].src,
    );
    expect(new Set(sources).size).toBe(4);
    expect(sources).not.toContain(PROGRAM_GLYPH);
  });

  it.each(GENERIC_SKILLS)("draws %s with the generic program", (id) => {
    expect(SKILL_GLYPHS[id]).toEqual({ src: PROGRAM_GLYPH, brandHex: null });
  });

  it("uses the generic program for every brand without a usable logo", () => {
    const concepts = Object.keys(CONCEPT_GLYPHS);
    for (const id of ALL_SKILL_IDS) {
      const glyph = SKILL_GLYPHS[id];
      if (glyph.brandHex === null && !concepts.includes(id)) {
        expect(glyph.src, id).toBe(PROGRAM_GLYPH);
      }
    }
  });

  it.each(Object.entries(LOGO_SKILLS))(
    "draws %s with its Simple Icons logo",
    (id, expected) => {
      expect(SKILL_GLYPHS[id as SkillId]).toEqual(expected);
    },
  );

  it("draws each brand with a color using a /skills/ logo that is not an own drawing, filled with logoFill", () => {
    for (const id of ALL_SKILL_IDS) {
      const { src, brandHex } = SKILL_GLYPHS[id];
      if (brandHex !== null) {
        expect(src, id).toMatch(/^\/skills\/[a-z0-9]+\.svg$/);
        expect(src.startsWith("/skills/own-"), id).toBe(false);
        expect(rootFill(readPublic(src)), id).toBe(logoFill(brandHex));
      }
    }
  });

  it("points every drawing to a file that exists in public/", () => {
    for (const id of ALL_SKILL_IDS) {
      const { src } = SKILL_GLYPHS[id];
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });
});

describe("LOGO_CREDITS", () => {
  it("credits PHP and Git, in the order of annex A", () => {
    expect(LOGO_CREDITS.map((credit) => credit.id)).toEqual(["php", "git"]);
  });

  it("credits only skills drawn with their logo", () => {
    for (const { id } of LOGO_CREDITS) {
      expect(SKILL_GLYPHS[id].brandHex, id).not.toBeNull();
    }
  });

  it("links each license over https", () => {
    for (const { id, licenseUrl } of LOGO_CREDITS) {
      expect(new URL(licenseUrl).protocol, id).toBe("https:");
    }
  });

  it("links the Creative Commons license of each logo (plan 004, section 10.2)", () => {
    expect(LOGO_CREDITS).toEqual([
      {
        id: "php",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
      { id: "git", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" },
    ]);
  });
});

describe("own drawings", () => {
  it.each(OWN_DRAWINGS)(
    "%s is pixel art with a black outline and nothing active",
    (src) => {
      const svg = readPublic(src);
      expect(svg.match(/<svg\b/g)).toHaveLength(1);
      expect(svg).toMatch(/^<svg\b[^>]*shape-rendering="crispEdges"/);
      expect(svg).toMatch(/fill="#000"/);
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/href/i);
      expect(svg).not.toMatch(/<foreignObject/i);
      expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
    },
  );

  it.each([PROGRAM_GLYPH, ...Object.values(CONCEPT_GLYPHS)])(
    "%s is a 32x32 drawing",
    (src) => {
      expect(readPublic(src)).toMatch(/^<svg\b[^>]*viewBox="0 0 32 32"/);
    },
  );

  it("are all different from each other", () => {
    const drawings = OWN_DRAWINGS.map(readPublic);
    expect(new Set(drawings).size).toBe(OWN_DRAWINGS.length);
  });
});

describe("module", () => {
  it("exports no functions", () => {
    const exported = Object.values(catalog);
    expect(exported.length).toBeGreaterThan(0);
    expect(exported.filter((value) => typeof value === "function")).toEqual([]);
  });
});
