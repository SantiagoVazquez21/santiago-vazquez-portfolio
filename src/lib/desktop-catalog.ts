// At most one window per window icon (spec 003, "Ventana").
export type WindowId =
  "projects" | "about" | "experience" | "skills" | "education" | "contact";

export type IconId = WindowId | "resume" | "github" | "linkedin";

export type DesktopIconEntry = {
  id: IconId;
  glyphSrc: string;
  // null marks a window icon: it opens its window instead of a destination (spec 003, RF-1).
  href: string | null;
  opensNewTab: boolean;
  downloadName: string | null;
};

// Shared by the desktop icons and About's quick links (spec 010, RF-7 and RF-8).
export const RESUME_FILE_NAME = "CV_SantiagoElianVazquez.pdf";
export const RESUME_HREF = `/${RESUME_FILE_NAME}`;
export const GITHUB_URL = "https://github.com/SantiagoVazquez21";

// Shared by the desktop icon and the contact form's send error (spec 005, RF-8).
export const LINKEDIN_URL = "https://www.linkedin.com/in/santiagoelianvazquez/";

// Target of About's "Contactarme" (spec 010, RF-9); a constant, never a literal in a component.
export const CONTACT_WINDOW_ID: WindowId = "contact";

// Also the icon of every job card (spec 011, RF-12): the path lives only here.
export const EXPERIENCE_GLYPH = "/icons/experience.svg";

// Order of RF-2.
export const DESKTOP_ICONS: readonly DesktopIconEntry[] = [
  {
    id: "projects",
    glyphSrc: "/icons/projects.svg",
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "about",
    glyphSrc: "/icons/about.svg",
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "experience",
    glyphSrc: EXPERIENCE_GLYPH,
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "skills",
    glyphSrc: "/icons/skills.svg",
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "education",
    glyphSrc: "/icons/education.svg",
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "contact",
    glyphSrc: "/icons/contact.svg",
    href: null,
    opensNewTab: false,
    downloadName: null,
  },
  {
    id: "resume",
    glyphSrc: "/icons/resume.svg",
    href: RESUME_HREF,
    opensNewTab: false,
    downloadName: RESUME_FILE_NAME,
  },
  {
    id: "github",
    glyphSrc: "/icons/github.svg",
    href: GITHUB_URL,
    opensNewTab: true,
    downloadName: null,
  },
  {
    id: "linkedin",
    glyphSrc: "/icons/linkedin.svg",
    href: LINKEDIN_URL,
    opensNewTab: true,
    downloadName: null,
  },
];

// Recruiter priority, top to bottom; icons of equal priority share a row (spec 012, RF-1).
// Kept apart from DESKTOP_ICONS so the catalog order and WINDOW_IDS stay as they are (plan 012, D1).
export const DESKTOP_ROWS: readonly (readonly IconId[])[] = [
  ["projects"],
  ["experience"],
  ["about", "resume"],
  ["skills", "education"],
  ["contact"],
  ["github", "linkedin"],
];

// Order of RF-2; a test checks it matches the icons with a null href.
export const WINDOW_IDS: readonly WindowId[] = [
  "projects",
  "about",
  "experience",
  "skills",
  "education",
  "contact",
];

export type WindowControl = "minimize" | "maximize" | "restore" | "close";

export const WINDOW_CONTROL_GLYPHS: Readonly<Record<WindowControl, string>> = {
  minimize: "/icons/window-minimize.svg",
  maximize: "/icons/window-maximize.svg",
  restore: "/icons/window-restore.svg",
  close: "/icons/window-close.svg",
};
