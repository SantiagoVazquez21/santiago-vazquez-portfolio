import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import * as catalog from "@/content/catalog";
import {
  ABOUT_FIELD_IDS,
  ABOUT_PHOTO,
  ABOUT_PHOTO_FRAME,
  ABOUT_STATUS_FIELD,
  BACK_GLYPH,
  FOLDER_GLYPH,
  JOBS,
  LANGUAGE_IDS,
  LOGO_CREDITS,
  PROJECTS,
  SKILL_FOLDERS,
  SKILL_GLYPHS,
  STUDIES,
  type FeatureId,
  type FolderId,
  type JobToolId,
  type ProjectTagId,
  type SkillId,
  type TechnologyId,
} from "@/content/catalog";
import {
  CERTIFICATES_PATH,
  certificateAssignmentProblems,
  certificateForStudy,
  unassignedCertificateFiles,
  unexpectedPdfs,
} from "@/lib/certificates";
import { logoFill } from "@/lib/color-contrast";
import { DESKTOP_ICONS } from "@/lib/desktop-catalog";
import { expectSafeSvg, rootAttributes } from "../lib/svg-checks";

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

const GESTION_PRO_TAGS: readonly ProjectTagId[] = ["teamWork", "desktopApp"];

// Order of annex A of spec 008.
const GESTION_PRO_FEATURES: readonly FeatureId[] = [
  "customers",
  "workOrders",
  "sales",
  "quotes",
  "warranties",
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

  it("keeps only ids, the glyph and the repository URL (no visible text)", () => {
    for (const project of PROJECTS) {
      expect(Object.keys(project).sort()).toEqual([
        "featureIds",
        "glyph",
        "id",
        "repositoryUrl",
        "tagIds",
        "technologyIds",
      ]);
    }
  });

  it("tags Gestion Pro as team work and a desktop app (spec 008, RF-2)", () => {
    expect(PROJECTS[0].tagIds).toEqual(GESTION_PRO_TAGS);
  });

  it("gives Gestion Pro its features in the order of annex A (spec 008, RF-5)", () => {
    expect(PROJECTS[0].featureIds).toEqual(GESTION_PRO_FEATURES);
  });

  it("never repeats a feature id across projects", () => {
    const featureIds = PROJECTS.flatMap((project) => project.featureIds);
    expect(new Set(featureIds).size).toBe(featureIds.length);
  });

  it("draws Gestion Pro with its own icon (spec 008, RF-11)", () => {
    expect(PROJECTS[0].glyph).toBe("/projects/gestion-pro.svg");
  });

  it("points every project glyph to an SVG under /projects/", () => {
    for (const { id, glyph } of PROJECTS) {
      expect(glyph, id).toMatch(/^\/projects\/[a-z0-9-]+\.svg$/);
    }
  });

  it("points every project glyph to a file that exists in public/", () => {
    for (const { id, glyph } of PROJECTS) {
      expect(existsSync(join(process.cwd(), "public", glyph)), id).toBe(true);
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

// Order of annex A of spec 011.
const MUNICIPAL_INTERNSHIP_TOOLS: readonly JobToolId[] = [
  "advancedExcel",
  "pivotTables",
  "dataValidation",
  "sensitiveDataHandling",
];

const EXPERIENCE_ICON = DESKTOP_ICONS.find((icon) => icon.id === "experience");

describe("JOBS", () => {
  it("lists the municipal internship with its 3 tasks and 4 tools in order (spec 011, annex A)", () => {
    expect(JOBS).toEqual([
      {
        id: "municipalInternship",
        glyph: EXPERIENCE_ICON?.glyphSrc,
        taskIds: ["digitization", "spreadsheets", "sensitiveData"],
        toolIds: MUNICIPAL_INTERNSHIP_TOOLS,
      },
    ]);
  });

  it("keeps only ids and the glyph (no visible text)", () => {
    for (const job of JOBS) {
      expect(Object.keys(job).sort()).toEqual([
        "glyph",
        "id",
        "taskIds",
        "toolIds",
      ]);
    }
  });

  it("draws every job with the desktop Experience icon (spec 011, RF-12)", () => {
    expect(EXPERIENCE_ICON).toBeDefined();
    for (const { id, glyph } of JOBS) {
      expect(glyph, id).toBe(EXPERIENCE_ICON?.glyphSrc);
    }
  });

  it("never repeats a task id across jobs", () => {
    const taskIds = JOBS.flatMap((job) => job.taskIds);
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it("never repeats a tool id within a job", () => {
    for (const { id, toolIds } of JOBS) {
      expect(new Set(toolIds).size, id).toBe(toolIds.length);
    }
  });
});

describe("STUDIES", () => {
  it("lists study 1 with a status and study 2 without one", () => {
    expect(STUDIES.map(({ id, hasStatus }) => ({ id, hasStatus }))).toEqual([
      { id: "softwareDevelopment", hasStatus: true },
      { id: "itTechnician", hasStatus: false },
    ]);
  });

  // The null values are not pinned, so activating a certificate is a one-line change (spec 009, RNF-5).
  it("keeps exactly the certificate file, the status and the id of each study", () => {
    for (const study of STUDIES) {
      expect(Object.keys(study).sort(), study.id).toEqual([
        "certificateFile",
        "hasStatus",
        "id",
      ]);
    }
  });

  it("gives no certificate to the study in progress (spec 009, RF-1)", () => {
    const inProgress = STUDIES.find(({ id }) => id === "softwareDevelopment");
    expect(inProgress?.hasStatus).toBe(true);
    expect(inProgress && certificateForStudy(inProgress)).toBeNull();
  });
});

const PUBLIC_DIRECTORY = join(process.cwd(), "public");

// Every file under public/, as a path relative to it with "/" (e.g. "skills/php.svg").
function publicFiles(directory = PUBLIC_DIRECTORY): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return publicFiles(path);
    return [relative(PUBLIC_DIRECTORY, path).split(sep).join("/")];
  });
}

const CERTIFICATES_DIRECTORY = join(
  PUBLIC_DIRECTORY,
  ...CERTIFICATES_PATH.split("/").filter(Boolean),
);

// Missing folder = no files: activation creates it (spec 009, plan section 9).
function certificateFolderFiles(): string[] {
  return existsSync(CERTIFICATES_DIRECTORY)
    ? readdirSync(CERTIFICATES_DIRECTORY)
    : [];
}

function assignedCertificateFiles(): string[] {
  return STUDIES.flatMap(({ certificateFile }) =>
    certificateFile === null ? [] : [certificateFile],
  );
}

// Only the name is kept here: the original file itself never enters the project (spec 009, RF-14).
const ORIGINAL_CERTIFICATE_NAME =
  "AnaliticoSecundarioTecnico_SantiagoVazquez.pdf".toLowerCase();

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

describe("certificates (spec 009, RF-1, RF-14, RNF-5)", () => {
  it("has no certificate assignment problem", () => {
    expect(
      certificateAssignmentProblems(STUDIES, certificateFolderFiles()),
    ).toEqual([]);
  });

  it("keeps only assigned files in public/certificates/", () => {
    expect(
      unassignedCertificateFiles(STUDIES, certificateFolderFiles()),
    ).toEqual([]);
  });

  it("publishes no PDF other than the resume and the assigned certificates", () => {
    const folder = CERTIFICATES_PATH.replace(/^\//, "");
    const allowed = [
      ...DESKTOP_ICONS.flatMap(({ href }) =>
        href !== null && href.startsWith("/") && /\.pdf$/i.test(href)
          ? [href.slice(1)]
          : [],
      ),
      ...assignedCertificateFiles().map((file) => folder + file),
    ];
    expect(allowed.length).toBeGreaterThan(0);
    expect(unexpectedPdfs(publicFiles(), allowed)).toEqual([]);
  });

  it("walks every folder of public/ looking for PDFs", () => {
    const files = publicFiles();
    expect(files).toContain("skills/own-support.svg");
    expect(files.some((file) => /\.pdf$/i.test(file))).toBe(true);
  });

  it("never names a public file or a certificate like the original PDF", () => {
    for (const file of publicFiles()) {
      expect(fileName(file).toLowerCase(), file).not.toBe(
        ORIGINAL_CERTIFICATE_NAME,
      );
    }
    for (const file of assignedCertificateFiles()) {
      expect(file.toLowerCase(), file).not.toBe(ORIGINAL_CERTIFICATE_NAME);
    }
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

// Every SVG under public/, so a new drawing is compared with all of them (spec 008, RNF-4).
function publicSvgs(directory = join(process.cwd(), "public")): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return publicSvgs(path);
    return entry.endsWith(".svg")
      ? [
          "/" +
            relative(join(process.cwd(), "public"), path).split(sep).join("/"),
        ]
      : [];
  });
}

const GESTION_PRO_GLYPH = "/projects/gestion-pro.svg";

describe("Gestion Pro icon (spec 008, RF-11, RNF-4)", () => {
  it("has nothing active", () => {
    expectSafeSvg(readPublic(GESTION_PRO_GLYPH));
  });

  it("is a 32x32 pixel-art drawing", () => {
    const root = rootAttributes(readPublic(GESTION_PRO_GLYPH));
    expect(root.viewBox).toBe("0 0 32 32");
    expect(root.width).toBe("32");
    expect(root.height).toBe("32");
    expect(root["shape-rendering"]).toBe("crispEdges");
  });

  it("has a black outline", () => {
    expect(readPublic(GESTION_PRO_GLYPH)).toMatch(/fill="#000"/);
  });

  it("weighs 4096 bytes or less", () => {
    const path = join(process.cwd(), "public", GESTION_PRO_GLYPH);
    expect(statSync(path).size).toBeLessThanOrEqual(4096);
  });

  it("walks every folder of public/ looking for drawings", () => {
    const svgs = publicSvgs();
    for (const folder of ["icons", "skills", "cursors", "wallpaper"]) {
      expect(
        svgs.some((src) => src.startsWith("/" + folder + "/")),
        folder,
      ).toBe(true);
    }
    expect(svgs).toContain("/skills/own-support.svg");
    expect(svgs).toContain(GESTION_PRO_GLYPH);
  });

  it("differs from every other SVG of public/", () => {
    const icon = readPublic(GESTION_PRO_GLYPH);
    for (const src of publicSvgs()) {
      if (src === GESTION_PRO_GLYPH) continue;
      expect(readPublic(src), src).not.toBe(icon);
    }
  });
});

describe("About sheet (spec 010, RF-3, RF-4)", () => {
  it("lists the fields in the order of RF-3", () => {
    expect(ABOUT_FIELD_IDS).toEqual([
      "name",
      "role",
      "location",
      "studies",
      "languages",
      "status",
    ]);
  });

  it("draws the status row with a box, and that row is in the sheet", () => {
    expect(ABOUT_STATUS_FIELD).toBe("status");
    expect(ABOUT_FIELD_IDS).toContain(ABOUT_STATUS_FIELD);
  });
});

const ASCII = new TextEncoder();

function ascii(text: string): number[] {
  return [...ASCII.encode(text)];
}

function containsBytes(bytes: Uint8Array, needle: readonly number[]): boolean {
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function startsWithBytes(
  bytes: Uint8Array,
  needle: readonly number[],
  offset = 0,
): boolean {
  return needle.every((byte, index) => bytes[offset + index] === byte);
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return readUint24LE(bytes, offset) + bytes[offset + 3] * 0x1000000;
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = ascii("RIFF");
const WEBP = ascii("WEBP");

function isJpeg(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, JPEG_SIGNATURE);
}

function isWebp(bytes: Uint8Array): boolean {
  return startsWithBytes(bytes, RIFF) && startsWithBytes(bytes, WEBP, 8);
}

type RiffChunk = { type: string; offset: number; size: number };

// Chunks after the "WEBP" form type; null if a size runs past the end of the file.
function webpChunks(bytes: Uint8Array): RiffChunk[] | null {
  const chunks: RiffChunk[] = [];
  let offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = readUint32LE(bytes, offset + 4);
    if (offset + 8 + size > bytes.length) return null;
    chunks.push({ type, offset: offset + 8, size });
    offset += 8 + size + (size % 2);
  }
  return chunks;
}

const ALLOWED_WEBP_CHUNKS = ["VP8 ", "VP8L", "VP8X", "ALPH", "ICCP"];
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

const JPEG_COMMENT = 0xfe;
const JPEG_APP0 = 0xe0;
const JPEG_APP2 = 0xe2;
const JPEG_APP15 = 0xef;
const ICC_PROFILE_ID = [...ascii("ICC_PROFILE"), 0];

function jpegMetadataFound(bytes: Uint8Array): boolean {
  // Scanning every byte is sound: inside entropy-coded data an FF is always followed by 00 or D0-D7.
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] !== 0xff) continue;
    const marker = bytes[i + 1];
    if (marker === JPEG_COMMENT) return true;
    if (marker < JPEG_APP0 || marker > JPEG_APP15 || marker === JPEG_APP0) {
      continue;
    }
    if (marker !== JPEG_APP2) return true;
    if (!startsWithBytes(bytes, ICC_PROFILE_ID, i + 4)) return true;
  }
  return false;
}

function webpMetadataFound(bytes: Uint8Array): boolean {
  const chunks = webpChunks(bytes);
  if (chunks === null) return true;
  for (const { type, offset } of chunks) {
    if (!ALLOWED_WEBP_CHUNKS.includes(type)) return true;
    if (type === "VP8X" && bytes[offset] & (VP8X_EXIF_FLAG | VP8X_XMP_FLAG)) {
      return true;
    }
  }
  return false;
}

const METADATA_TEXTS = [
  "Exif",
  "XMP",
  "http://ns.adobe.com/xap",
  "Photoshop",
  "GPS",
];

// Test-only detector of personal metadata (plan 010, section 7 and D9): an ICC color profile is allowed.
function metadataFound(bytes: Uint8Array): boolean {
  if (METADATA_TEXTS.some((text) => containsBytes(bytes, ascii(text)))) {
    return true;
  }
  if (isJpeg(bytes)) return jpegMetadataFound(bytes);
  if (isWebp(bytes)) return webpMetadataFound(bytes);
  return true;
}

// Width and height stored in the file itself, or null if the header is not understood.
function imageSize(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (isWebp(bytes)) {
    const chunk = webpChunks(bytes)?.[0];
    if (chunk === undefined) return null;
    const at = chunk.offset;
    if (chunk.type === "VP8X") {
      return {
        width: readUint24LE(bytes, at + 4) + 1,
        height: readUint24LE(bytes, at + 7) + 1,
      };
    }
    if (chunk.type === "VP8 ") {
      return {
        width: (bytes[at + 6] | (bytes[at + 7] << 8)) & 0x3fff,
        height: (bytes[at + 8] | (bytes[at + 9] << 8)) & 0x3fff,
      };
    }
    if (chunk.type === "VP8L") {
      const bits = readUint32LE(bytes, at + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }
    return null;
  }
  if (isJpeg(bytes)) {
    let offset = 2;
    while (offset + 9 < bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const isFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        return {
          height: (bytes[offset + 5] << 8) | bytes[offset + 6],
          width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        };
      }
      offset += 2 + length;
    }
  }
  return null;
}

// Synthetic files built in memory, so the detector is proven without touching the real photo.
function jpegSegment(marker: number, payload: readonly number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

function syntheticJpeg(...segments: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xd9]);
}

function riffChunk(type: string, payload: readonly number[]): number[] {
  const size = payload.length;
  const padding = size % 2 === 1 ? [0] : [];
  return [
    ...ascii(type),
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...payload,
    ...padding,
  ];
}

function syntheticWebp(...chunks: number[][]): Uint8Array {
  const body = [...WEBP, ...chunks.flat()];
  const size = body.length;
  return new Uint8Array([
    ...RIFF,
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...body,
  ]);
}

const JFIF = jpegSegment(JPEG_APP0, [
  ...ascii("JFIF"),
  0,
  1,
  1,
  0,
  0,
  1,
  0,
  1,
  0,
  0,
]);
const ICC_APP2 = jpegSegment(JPEG_APP2, [...ICC_PROFILE_ID, 1, 1, 0, 0, 0, 0]);
const VP8_FRAME = riffChunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0]);

function vp8x(flags: number): number[] {
  return riffChunk("VP8X", [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
}

const FILES_WITH_METADATA: ReadonlyArray<readonly [string, Uint8Array]> = [
  ["JPEG with a comment (FF FE)", syntheticJpeg(JFIF, jpegSegment(0xfe, [1]))],
  [
    "JPEG with APP1 Exif (FF E1)",
    syntheticJpeg(JFIF, jpegSegment(0xe1, [...ascii("Exif"), 0, 0])),
  ],
  ["JPEG with APP13 (FF ED)", syntheticJpeg(JFIF, jpegSegment(0xed, [1, 2]))],
  [
    "JPEG with APP2 that is not ICC (FF E2)",
    syntheticJpeg(JFIF, jpegSegment(JPEG_APP2, [...ascii("MPF"), 0, 1])),
  ],
  ["WebP with an EXIF chunk", syntheticWebp(VP8_FRAME, riffChunk("EXIF", [1]))],
  ["WebP with an XMP chunk", syntheticWebp(VP8_FRAME, riffChunk("XMP ", [1]))],
  [
    "WebP with the VP8X EXIF flag",
    syntheticWebp(vp8x(VP8X_EXIF_FLAG), VP8_FRAME),
  ],
  [
    "WebP with the VP8X XMP flag",
    syntheticWebp(vp8x(VP8X_XMP_FLAG), VP8_FRAME),
  ],
];

const VP8X_ICC_FLAG = 0x20;

const FILES_WITHOUT_METADATA: ReadonlyArray<readonly [string, Uint8Array]> = [
  ["JPEG with only APP0 (FF E0)", syntheticJpeg(JFIF)],
  ["JPEG with APP0 and an ICC APP2", syntheticJpeg(JFIF, ICC_APP2)],
  ["WebP with only VP8", syntheticWebp(VP8_FRAME)],
  [
    "WebP with the VP8X ICC flag, ICCP and VP8",
    syntheticWebp(vp8x(VP8X_ICC_FLAG), riffChunk("ICCP", [1, 2, 3]), VP8_FRAME),
  ],
];

describe("personal metadata detector (spec 010, RF-14, D9)", () => {
  it("is checked with 8 files with metadata and 4 clean ones", () => {
    expect(FILES_WITH_METADATA).toHaveLength(8);
    expect(FILES_WITHOUT_METADATA).toHaveLength(4);
  });

  it.each(FILES_WITH_METADATA)("finds metadata in a %s", (_name, bytes) => {
    expect(metadataFound(bytes)).toBe(true);
  });

  it.each(FILES_WITHOUT_METADATA)("accepts a %s", (_name, bytes) => {
    expect(metadataFound(bytes)).toBe(false);
  });

  it("treats a file of unknown format as suspicious", () => {
    expect(metadataFound(new Uint8Array(ascii("GIF89a")))).toBe(true);
  });
});

const PHOTO_MAX_BYTES = 40_960;
const ABOUT_DIRECTORY = join(PUBLIC_DIRECTORY, "about");
const ORIGINAL_PHOTO_NAME = "foto.jpg";

function photoPath(): string {
  return join(PUBLIC_DIRECTORY, ...ABOUT_PHOTO.src.split("/").filter(Boolean));
}

function photoBytes(): Uint8Array {
  return new Uint8Array(readFileSync(photoPath()));
}

describe("About photo (spec 010, RF-2, RF-11, RF-14, RNF-4)", () => {
  it("is 240 px wide with an even height", () => {
    expect(ABOUT_PHOTO.width).toBe(240);
    expect(Number.isInteger(ABOUT_PHOTO.height)).toBe(true);
    expect(ABOUT_PHOTO.height).toBeGreaterThan(0);
    expect(ABOUT_PHOTO.height % 2).toBe(0);
  });

  it("frames the photo at half its size, fixed in whole pixels", () => {
    expect(ABOUT_PHOTO_FRAME).toEqual({
      width: 120,
      height: ABOUT_PHOTO.height / 2,
    });
  });

  it("lives under /about/ as a WebP or a JPG", () => {
    expect(ABOUT_PHOTO.src).toMatch(/^\/about\/[a-z0-9-]+\.(webp|jpg)$/);
  });

  it("exists in public/", () => {
    expect(existsSync(photoPath())).toBe(true);
  });

  it("weighs less than 40 960 bytes", () => {
    expect(statSync(photoPath()).size).toBeLessThan(PHOTO_MAX_BYTES);
  });

  it("has the header of its extension", () => {
    const bytes = photoBytes();
    if (ABOUT_PHOTO.src.endsWith(".webp")) {
      expect(isWebp(bytes)).toBe(true);
    } else {
      expect(isJpeg(bytes)).toBe(true);
    }
  });

  it("stores the same width and height as ABOUT_PHOTO", () => {
    expect(imageSize(photoBytes())).toEqual({
      width: ABOUT_PHOTO.width,
      height: ABOUT_PHOTO.height,
    });
  });

  it("carries no personal metadata", () => {
    expect(metadataFound(photoBytes())).toBe(false);
  });

  it("is the only file in public/about/", () => {
    expect(readdirSync(ABOUT_DIRECTORY)).toEqual([fileName(ABOUT_PHOTO.src)]);
  });

  it("never names a public file like the original photo", () => {
    for (const file of publicFiles()) {
      expect(fileName(file).toLowerCase(), file).not.toBe(ORIGINAL_PHOTO_NAME);
    }
  });
});

describe("module", () => {
  it("exports no functions", () => {
    const exported = Object.values(catalog);
    expect(exported.length).toBeGreaterThan(0);
    expect(exported.filter((value) => typeof value === "function")).toEqual([]);
  });
});
