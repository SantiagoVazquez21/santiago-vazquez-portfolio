export type IconId =
  | "projects"
  | "about"
  | "experience"
  | "skills"
  | "education"
  | "contact"
  | "resume"
  | "github"
  | "linkedin";

export type DesktopIconEntry = {
  id: IconId;
  glyphSrc: string;
  // null marks a window icon: it only gets selected until spec 003 (RF-9).
  href: string | null;
  opensNewTab: boolean;
  downloadName: string | null;
};

const RESUME_FILE_NAME = "CV_SantiagoElianVazquez.pdf";

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
    glyphSrc: "/icons/experience.svg",
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
    href: `/${RESUME_FILE_NAME}`,
    opensNewTab: false,
    downloadName: RESUME_FILE_NAME,
  },
  {
    id: "github",
    glyphSrc: "/icons/github.svg",
    href: "https://github.com/SantiagoVazquez21",
    opensNewTab: true,
    downloadName: null,
  },
  {
    id: "linkedin",
    glyphSrc: "/icons/linkedin.svg",
    href: "https://www.linkedin.com/in/santiago-vazquez-b266b3374/",
    opensNewTab: true,
    downloadName: null,
  },
];
