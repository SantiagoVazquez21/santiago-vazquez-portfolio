import type { Dictionary } from "@/i18n/types";

export const en = {
  home: {
    metaTitle: "Santiago Elian Vazquez — Full Stack Developer",
    metaDescription:
      "Portfolio of Santiago Elian Vazquez, full stack developer.",
    name: "Santiago Elian Vazquez",
    role: "Full Stack Developer",
    notice: "Portfolio under construction",
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
