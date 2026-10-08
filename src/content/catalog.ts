// Structure and order of the portfolio content. Visible text lives in es.ts and en.ts,
// indexed by these ids, so adding an entry only touches src/content/ (spec 004, RNF-6).

export type ProjectId = "gestionPro";

export type TechnologyId =
  "csharp" | "dotnet" | "winforms" | "mysql" | "postgresql";

export type JobId = "municipalInternship";

// Unique across jobs, so a new job brings its own task ids.
export type TaskId = "digitization" | "spreadsheets" | "sensitiveData";

export type StudyId = "softwareDevelopment" | "itTechnician";

export type LanguageId = "english";

export type FolderId =
  "frontend" | "backend" | "databases" | "tools" | "systems";

export type SkillId =
  | "html"
  | "css"
  | "javascript"
  | "react"
  | "tailwind"
  | "kaplay"
  | "php"
  | "csharp"
  | "python"
  | "mysql"
  | "postgresql"
  | "relationalModeling"
  | "git"
  | "github"
  | "figma"
  | "vite"
  | "arduino"
  | "excel"
  | "scrum"
  | "windows"
  | "linux"
  | "hardware"
  | "networking"
  | "techSupport";

export type ProjectEntry = {
  id: ProjectId;
  repositoryUrl: string;
  technologyIds: readonly TechnologyId[];
};

export type JobEntry = { id: JobId; taskIds: readonly TaskId[] };

export type StudyEntry = { id: StudyId; hasStatus: boolean };

export type SkillFolderEntry = { id: FolderId; skillIds: readonly SkillId[] };

export const PROJECTS: readonly ProjectEntry[] = [
  {
    id: "gestionPro",
    repositoryUrl: "https://github.com/ronnin47/sistemaDeGestionAutomotriz",
    technologyIds: ["csharp", "dotnet", "winforms", "mysql", "postgresql"],
  },
];

export const JOBS: readonly JobEntry[] = [
  {
    id: "municipalInternship",
    taskIds: ["digitization", "spreadsheets", "sensitiveData"],
  },
];

export const STUDIES: readonly StudyEntry[] = [
  { id: "softwareDevelopment", hasStatus: true },
  { id: "itTechnician", hasStatus: false },
];

export const LANGUAGE_IDS: readonly LanguageId[] = ["english"];

// Order of annex A of spec 004.
export const SKILL_FOLDERS: readonly SkillFolderEntry[] = [
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

// brandHex null = own drawing: a concept, or a brand without a usable logo (docs/logos.md).
export type SkillGlyph = { src: string; brandHex: string | null };

const PROGRAM_GLYPH: SkillGlyph = {
  src: "/skills/own-program.svg",
  brandHex: null,
};

// Simple Icons 16.34.0 (plan 004, sections 6 and 10); each logo file is filled with logoFill(brandHex).
export const SKILL_GLYPHS: Readonly<Record<SkillId, SkillGlyph>> = {
  html: { src: "/skills/html5.svg", brandHex: "#E34F26" },
  css: { src: "/skills/css.svg", brandHex: "#663399" },
  javascript: { src: "/skills/javascript.svg", brandHex: "#F7DF1E" },
  react: { src: "/skills/react.svg", brandHex: "#61DAFB" },
  tailwind: { src: "/skills/tailwindcss.svg", brandHex: "#06B6D4" },
  kaplay: PROGRAM_GLYPH,
  php: { src: "/skills/php.svg", brandHex: "#777BB4" },
  csharp: PROGRAM_GLYPH,
  python: { src: "/skills/python.svg", brandHex: "#3776AB" },
  mysql: { src: "/skills/mysql.svg", brandHex: "#4479A1" },
  postgresql: { src: "/skills/postgresql.svg", brandHex: "#4169E1" },
  relationalModeling: { src: "/skills/own-erd.svg", brandHex: null },
  git: { src: "/skills/git.svg", brandHex: "#F03C2E" },
  github: { src: "/skills/github.svg", brandHex: "#181717" },
  figma: { src: "/skills/figma.svg", brandHex: "#F24E1E" },
  vite: { src: "/skills/vite.svg", brandHex: "#9135FF" },
  arduino: { src: "/skills/arduino.svg", brandHex: "#00878F" },
  excel: PROGRAM_GLYPH,
  scrum: PROGRAM_GLYPH,
  windows: PROGRAM_GLYPH,
  linux: { src: "/skills/linux.svg", brandHex: "#FCC624" },
  hardware: { src: "/skills/own-hardware.svg", brandHex: null },
  networking: { src: "/skills/own-network.svg", brandHex: null },
  techSupport: { src: "/skills/own-support.svg", brandHex: null },
};

// Logos whose license asks for a visible credit (RF-15). The license URL is not visible text,
// so it lives here once; the author and the license name live in es.ts and en.ts (plan 004, D12).
export type CreditedLogoId = Extract<SkillId, "php" | "git">;

export type LogoCreditEntry = { id: CreditedLogoId; licenseUrl: string };

// Order of annex A of spec 004; the URLs were checked against Simple Icons 16.34.0 (docs/logos.md).
export const LOGO_CREDITS: readonly LogoCreditEntry[] = [
  { id: "php", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { id: "git", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" },
];

export const FOLDER_GLYPH = "/icons/folder.svg";

export const BACK_GLYPH = "/icons/back.svg";
