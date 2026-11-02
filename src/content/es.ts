import type { PortfolioContent } from "@/content/types";

export const es = {
  about: {
    profile:
      "Desarrollador Full Stack y estudiante de 2° año de la Tecnicatura Superior en Desarrollo de Software. Trabajo con React, Next.js y TypeScript en el frontend, con Node.js y Express en el backend, y con C# / .NET y Java en aplicaciones de escritorio, sobre bases MySQL, PostgreSQL y Supabase. Soy Técnico en Informática, así que también manejo hardware, redes y soporte técnico.",
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
      screenshotAlt: "Captura de pantalla de Gestion Pro",
      features: {
        customers: "Gestión de clientes",
        workOrders: "Órdenes de trabajo: módulos, cerrajería e instalaciones",
        sales: "Ventas de insumos con control de stock",
        quotes: "Cotizaciones",
        warranties: "Garantías",
      },
    },
    torneoFutbol5: {
      name: "Torneo Fútbol 5",
      tagline: "Sistema de inscripciones para un torneo de fútbol 5",
      description:
        "Aplicación de escritorio para inscribir participantes a un torneo de fútbol 5, con la base de datos en MySQL.",
      contribution:
        "Desarrollé la aplicación completa: los formularios, la capa de repositorio con consultas parametrizadas y las transacciones que mantienen sincronizadas las dos tablas de cada inscripción.",
      screenshotAlt: "Captura de pantalla de Torneo Fútbol 5",
      features: {
        registrationCrud: "Alta, modificación y baja de inscripciones",
        autoCategory: "Categoría asignada automáticamente según edad y sexo",
        duplicateDni: "Control de DNI repetidos",
        feePayment: "Registro del pago de la inscripción",
      },
    },
    clientsApi: {
      name: "API de Clientes",
      tagline: "API REST con el CRUD completo de clientes",
      description:
        "API REST en Node.js y Express que guarda los clientes en Supabase y está publicada en Vercel.",
      contribution:
        "Desarrollé la API completa: las rutas, los controladores con las consultas a Supabase, el manejo de errores con códigos HTTP y el deploy en Vercel.",
      screenshotAlt: "Captura de pantalla de API de Clientes",
      features: {
        listClients: "Listar clientes (GET)",
        createClient: "Crear clientes (POST)",
        updateClient: "Editar clientes (PUT)",
        deleteClient: "Eliminar clientes (DELETE)",
        layeredApi:
          "Estructura en capas: rutas, controladores y conexión a la base",
      },
    },
  },
  projectTags: {
    teamWork: "Desarrollado en equipo",
    desktopApp: "App de escritorio",
    soloWork: "Proyecto individual",
    restApi: "API REST",
  },
  technologies: {
    csharp: "C#",
    dotnet: ".NET",
    winforms: "WinForms",
    mysql: "MySQL",
    postgresql: "PostgreSQL",
    nodejs: "Node.js",
    express: "Express",
    supabase: "Supabase",
    vercel: "Vercel",
  },
  jobs: {
    municipalInternship: {
      title: "Asistente de Datos y Automatización",
      period: "2025",
      organization: "Municipalidad de Tres de Febrero",
      area: "Área de Acción Social",
      modality: "Pasantía · 200 h · 6 meses",
      highlight:
        "Sistema de planillas adoptado por el equipo, que reemplazó los registros en papel",
    },
  },
  jobTasks: {
    digitization:
      "Identifiqué la problemática de gestión documental del área y propuse una solución de digitalización que reemplazó registros en papel sin orden.",
    spreadsheets:
      "Desarrollé un sistema de planillas en Excel con funciones avanzadas (BUSCARV, tablas dinámicas, validación de datos, fórmulas condicionales) adoptado por el equipo de trabajo.",
    sensitiveData:
      "Gestioné datos sensibles de ciudadanos garantizando la confidencialidad, integridad y trazabilidad de la información.",
  },
  jobTools: {
    advancedExcel: "Excel avanzado",
    pivotTables: "Tablas dinámicas",
    dataValidation: "Validación de datos",
    sensitiveDataHandling: "Gestión de datos sensibles",
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
    typescript: "TypeScript",
    react: "React",
    nextjs: "Next.js",
    tailwind: "Tailwind",
    nodejs: "Node.js",
    express: "Express",
    php: "PHP",
    csharp: "C#",
    java: "Java",
    python: "Python",
    mysql: "MySQL",
    postgresql: "PostgreSQL",
    supabase: "Supabase",
    relationalModeling: "Modelado relacional (DER)",
    git: "Git",
    github: "GitHub",
    figma: "Figma",
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
