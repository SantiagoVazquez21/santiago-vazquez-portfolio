import type { Dictionary } from "@/i18n/types";

export const en = {
  home: {
    metaTitle: "Santiago Elian Vazquez — Full Stack Developer",
    metaDescription:
      "Portfolio of Santiago Elian Vazquez, full stack developer.",
    name: "Santiago Elian Vazquez",
    role: "Full Stack Developer",
  },
  desktop: {
    groupName: "Desktop",
    clockName: "Local time",
    labels: {
      projects: "Projects",
      about: "About me",
      experience: "Experience",
      skills: "Skills",
      education: "Education",
      contact: "Contact",
      resume: "Resume",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    actionNames: {
      resume: "Resume, download PDF",
      github: "GitHub, opens in a new tab",
      linkedin: "LinkedIn, opens in a new tab",
    },
  },
  windows: {
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
    placeholder: "Content coming soon.",
    taskbarGroup: "Open windows",
  },
  switcher: {
    esCode: "ES",
    enCode: "EN",
    inactiveName: "ES, switch to Spanish",
    activeName: "EN, current language",
  },
  notFound: {
    metaTitle: "Page not found — Santiago Elian Vazquez",
    metaDescription: "The requested page does not exist.",
    heading: "Page not found",
    message: "This address does not match any page on this site.",
  },
  error: {
    metaTitle: "Something went wrong — Santiago Elian Vazquez",
    heading: "Something went wrong",
    message: "An unexpected error occurred while displaying this page.",
    retry: "Try again",
  },
  common: {
    homeLink: "Go to the home page",
  },
} satisfies Dictionary;
