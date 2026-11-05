// Structure and order of the portfolio content. Visible text lives in es.ts and en.ts,
// indexed by these ids, so adding an entry only touches src/content/ (spec 004, RNF-6).

import { EXPERIENCE_GLYPH } from "@/lib/desktop-catalog";

export type ProjectId = "gestionPro" | "torneoFutbol5" | "clientsApi";

export type TechnologyId =
  | "csharp"
  | "dotnet"
  | "winforms"
  | "mysql"
  | "postgresql"
  | "nodejs"
  | "express"
  | "supabase"
  | "vercel";

export type ProjectTagId = "teamWork" | "desktopApp" | "soloWork" | "restApi";

// Unique across projects, like TaskId: a new project brings its own feature ids.
export type FeatureId =
  | "customers"
  | "workOrders"
  | "sales"
  | "quotes"
  | "warranties"
  | "registrationCrud"
  | "autoCategory"
  | "duplicateDni"
  | "feePayment"
  | "listClients"
  | "createClient"
  | "updateClient"
  | "deleteClient"
  | "layeredApi";

export type JobId = "municipalInternship";

// Unique across jobs, so a new job brings its own task ids.
export type TaskId = "digitization" | "spreadsheets" | "sensitiveData";

// Shared across jobs, like ProjectTagId: two jobs can both use "Excel avanzado".
export type JobToolId =
  "advancedExcel" | "pivotTables" | "dataValidation" | "sensitiveDataHandling";

export type StudyId = "softwareDevelopment" | "itTechnician";

export type LanguageId = "english";

export type FolderId =
  "frontend" | "backend" | "databases" | "tools" | "systems";

export type SkillId =
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "react"
  | "nextjs"
  | "tailwind"
  | "nodejs"
  | "express"
  | "php"
  | "csharp"
  | "java"
  | "python"
  | "mysql"
  | "postgresql"
  | "supabase"
  | "relationalModeling"
  | "git"
  | "github"
  | "figma"
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
  glyph: string;
  repositoryUrl: string;
  technologyIds: readonly TechnologyId[];
  tagIds: readonly ProjectTagId[];
  featureIds: readonly FeatureId[];
  // null = the detail looks as in spec 008. No size here: one file does not justify it (plan 012, D8).
  screenshot: string | null;
};

export type JobEntry = {
  id: JobId;
  glyph: string;
  taskIds: readonly TaskId[];
  // May be empty: the job then shows no tool chips (spec 011, RF-2 and RF-6).
  toolIds: readonly JobToolId[];
};

// certificateFile: name of a PDF in public/certificates/, or null if the study has no certificate.
// Only the copy with the ID number covered is published; the original PDF never (spec 009, RF-14).
// To activate: copy the PDF to public/certificates/ and put its name here (README, "Certificados de Formación").
export type StudyEntry = {
  id: StudyId;
  hasStatus: boolean;
  certificateFile: string | null;
};

export type SkillFolderEntry = { id: FolderId; skillIds: readonly SkillId[] };

export const PROJECTS: readonly ProjectEntry[] = [
  {
    id: "gestionPro",
    glyph: "/projects/gestion-pro.svg",
    repositoryUrl: "https://github.com/ronnin47/sistemaDeGestionAutomotriz",
    technologyIds: ["csharp", "dotnet", "winforms", "mysql", "postgresql"],
    tagIds: ["teamWork", "desktopApp"],
    featureIds: ["customers", "workOrders", "sales", "quotes", "warranties"],
    screenshot: "/projects/gestion-pro.webp",
  },
  {
    id: "torneoFutbol5",
    glyph: "/projects/torneo-futbol5.svg",
    repositoryUrl: "https://github.com/SantiagoVazquez21/torneo-futbol5",
    technologyIds: ["csharp", "dotnet", "winforms", "mysql"],
    tagIds: ["soloWork", "desktopApp"],
    featureIds: [
      "registrationCrud",
      "autoCategory",
      "duplicateDni",
      "feePayment",
    ],
    screenshot: null,
  },
  {
    id: "clientsApi",
    glyph: "/projects/clients-api.svg",
    repositoryUrl: "https://github.com/SantiagoVazquez21/api-clientes-express",
    technologyIds: ["nodejs", "express", "supabase", "vercel"],
    tagIds: ["soloWork", "restApi"],
    featureIds: [
      "listClients",
      "createClient",
      "updateClient",
      "deleteClient",
      "layeredApi",
    ],
    screenshot: null,
  },
];

export const JOBS: readonly JobEntry[] = [
  {
    id: "municipalInternship",
    glyph: EXPERIENCE_GLYPH,
    taskIds: ["digitization", "spreadsheets", "sensitiveData"],
    toolIds: [
      "advancedExcel",
      "pivotTables",
      "dataValidation",
      "sensitiveDataHandling",
    ],
  },
];

export const STUDIES: readonly StudyEntry[] = [
  { id: "softwareDevelopment", hasStatus: true, certificateFile: null },
  { id: "itTechnician", hasStatus: false, certificateFile: null },
];

export const LANGUAGE_IDS: readonly LanguageId[] = ["english"];

// Order of annex C of spec 013 (annex A of spec 004, updated).
export const SKILL_FOLDERS: readonly SkillFolderEntry[] = [
  {
    id: "frontend",
    skillIds: [
      "html",
      "css",
      "javascript",
      "typescript",
      "react",
      "nextjs",
      "tailwind",
    ],
  },
  {
    id: "backend",
    skillIds: ["nodejs", "express", "php", "csharp", "java", "python"],
  },
  {
    id: "databases",
    skillIds: ["mysql", "postgresql", "supabase", "relationalModeling"],
  },
  {
    id: "tools",
    skillIds: ["git", "github", "figma", "arduino", "excel", "scrum"],
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

// Simple Icons 16.34.0 (plan 004, sections 6 and 10; spec 013, RF-7); each logo file is filled with logoFill(brandHex).
export const SKILL_GLYPHS: Readonly<Record<SkillId, SkillGlyph>> = {
  html: { src: "/skills/html5.svg", brandHex: "#E34F26" },
  css: { src: "/skills/css.svg", brandHex: "#663399" },
  javascript: { src: "/skills/javascript.svg", brandHex: "#F7DF1E" },
  typescript: { src: "/skills/typescript.svg", brandHex: "#3178C6" },
  react: { src: "/skills/react.svg", brandHex: "#61DAFB" },
  nextjs: { src: "/skills/nextdotjs.svg", brandHex: "#000000" },
  tailwind: { src: "/skills/tailwindcss.svg", brandHex: "#06B6D4" },
  nodejs: { src: "/skills/nodedotjs.svg", brandHex: "#5FA04E" },
  express: { src: "/skills/express.svg", brandHex: "#0A0A0A" },
  php: { src: "/skills/php.svg", brandHex: "#777BB4" },
  csharp: PROGRAM_GLYPH,
  java: PROGRAM_GLYPH,
  python: { src: "/skills/python.svg", brandHex: "#3776AB" },
  mysql: { src: "/skills/mysql.svg", brandHex: "#4479A1" },
  postgresql: { src: "/skills/postgresql.svg", brandHex: "#4169E1" },
  supabase: { src: "/skills/supabase.svg", brandHex: "#3FCF8E" },
  relationalModeling: { src: "/skills/own-erd.svg", brandHex: null },
  git: { src: "/skills/git.svg", brandHex: "#F03C2E" },
  github: { src: "/skills/github.svg", brandHex: "#181717" },
  figma: { src: "/skills/figma.svg", brandHex: "#F24E1E" },
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

export type AboutFieldId =
  "name" | "role" | "location" | "studies" | "languages" | "status";

// Order of RF-3 of spec 010.
export const ABOUT_FIELD_IDS: readonly AboutFieldId[] = [
  "name",
  "role",
  "location",
  "studies",
  "languages",
  "status",
];

// The row drawn with a box and a marker (spec 010, RF-4); compared as a constant, never as a literal.
export const ABOUT_STATUS_FIELD: AboutFieldId = "status";

// The real file's size (spec 010, T3). The height is even so the frame below is a whole number of px.
export const ABOUT_PHOTO = {
  src: "/about/photo.webp",
  width: 240,
  height: 296,
} as const;

// Fixed inner size of the frame, so it never depends on the image loading (RF-2, RF-11).
// Half the file, which is 2x for high-density screens (RNF-4).
export const ABOUT_PHOTO_FRAME = {
  width: ABOUT_PHOTO.width / 2,
  height: ABOUT_PHOTO.height / 2,
} as const;

export const FOLDER_GLYPH = "/icons/folder.svg";

export const BACK_GLYPH = "/icons/back.svg";
