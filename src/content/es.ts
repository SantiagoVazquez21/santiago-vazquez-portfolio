import type { PortfolioContent } from "@/content/types";

export const es = {
  about: {
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
  projects: {
    gestionPro: {
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
  },
  projectTags: {
    teamWork: "Desarrollado en equipo",
    desktopApp: "App de escritorio",
  },
  technologies: {
    csharp: "C#",
    dotnet: ".NET",
    winforms: "WinForms",
    mysql: "MySQL",
    postgresql: "PostgreSQL",
  },
  jobs: {
    municipalInternship: {
      title: "Asistente de Datos y Automatización",
      period: "2025",
      organization: "Municipalidad de Caseros",
      area: "Área de Acción Social",
      modality: "Pasantía (200 hs · 6 meses)",
      tasks: {
        digitization:
          "Identifiqué la problemática de gestión documental del área y propuse una solución de digitalización que reemplazó registros en papel sin orden.",
        spreadsheets:
          "Desarrollé un sistema de planillas en Excel con funciones avanzadas (BUSCARV, tablas dinámicas, validación de datos, fórmulas condicionales) adoptado por el equipo de trabajo.",
        sensitiveData:
          "Gestioné datos sensibles de ciudadanos garantizando la confidencialidad, integridad y trazabilidad de la información.",
      },
    },
  },
  studies: {
    softwareDevelopment: {
      title: "Tecnicatura Superior en Desarrollo de Software",
      period: "2026 – Actualidad",
      institution: "ISFT 225",
      place: "San Martín, Buenos Aires",
      status: "Cursando 2° año",
    },
    itTechnician: {
      title: "Técnico en Informática Personal y Profesional",
      period: "2019 – 2025",
      institution: "Instituto Leonardo Murialdo",
      place: "Tres de Febrero, Buenos Aires",
    },
  },
  languages: {
    english: "Inglés B2 (Upper Intermediate)",
  },
  folders: {
    frontend: "Frontend",
    backend: "Backend",
    databases: "Bases de datos",
    tools: "Herramientas",
    systems: "Sistemas/Soporte",
  },
  skills: {
    html: "HTML",
    css: "CSS",
    javascript: "JavaScript",
    react: "React",
    tailwind: "Tailwind",
    kaplay: "KAPLAY",
    php: "PHP",
    csharp: "C#",
    python: "Python",
    mysql: "MySQL",
    postgresql: "PostgreSQL",
    relationalModeling: "Modelado relacional (DER)",
    git: "Git",
    github: "GitHub",
    figma: "Figma",
    vite: "Vite",
    arduino: "Arduino",
    excel: "Excel",
    scrum: "Scrum",
    windows: "Windows",
    linux: "Linux",
    hardware: "Hardware",
    networking: "Redes",
    techSupport: "Soporte técnico",
  },
  logoCredits: {
    php: { author: "Colin Viebrock", license: "CC BY-SA 4.0" },
    git: { author: "Jason Long", license: "CC BY 3.0" },
  },
} satisfies PortfolioContent;
