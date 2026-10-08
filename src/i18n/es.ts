import type { Dictionary } from "@/i18n/types";

export const es = {
  home: {
    metaTitle: "Santiago Elian Vazquez — Desarrollador Full Stack",
    metaDescription:
      "Portafolio de Santiago Elian Vazquez, desarrollador full stack.",
    name: "Santiago Elian Vazquez",
    role: "Desarrollador Full Stack",
  },
  desktop: {
    groupName: "Escritorio",
    clockName: "Hora local",
    labels: {
      projects: "Proyectos",
      about: "Sobre mí",
      experience: "Experiencia",
      skills: "Habilidades",
      education: "Formación",
      contact: "Contacto",
      resume: "CV",
      github: "GitHub",
      linkedin: "LinkedIn",
    },
    actionNames: {
      resume: "CV, descargar PDF",
      github: "GitHub, se abre en una pestaña nueva",
      linkedin: "LinkedIn, se abre en una pestaña nueva",
    },
  },
  switcher: {
    esCode: "ES",
    enCode: "EN",
    inactiveName: "EN, cambiar a inglés",
    activeName: "ES, idioma actual",
  },
  notFound: {
    metaTitle: "Página no encontrada — Santiago Elian Vazquez",
    metaDescription: "La página solicitada no existe.",
    heading: "Página no encontrada",
    message: "Esta dirección no corresponde a ninguna página del sitio.",
  },
  error: {
    metaTitle: "Algo salió mal — Santiago Elian Vazquez",
    heading: "Algo salió mal",
    message: "Ocurrió un error inesperado al mostrar esta página.",
    retry: "Reintentar",
  },
  common: {
    homeLink: "Ir a la página principal",
  },
} satisfies Dictionary;
