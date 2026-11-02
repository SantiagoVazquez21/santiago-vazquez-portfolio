import type { PortfolioContent } from "@/content/types";

export const en = {
  about: {
    profile:
      "Full Stack Developer and 2nd-year student of a Higher Technical Degree in Software Development. I work with React, Next.js and TypeScript on the frontend, Node.js and Express on the backend, and C# / .NET and Java for desktop applications, on MySQL, PostgreSQL and Supabase databases. I'm also an IT Technician, so I handle hardware, networking and technical support too.",
    photoAlt: "Profile photo of Santiago Elian Vazquez",
    fields: {
      name: "Santiago Elian Vazquez",
      role: "Full Stack Developer",
      location: "Buenos Aires, Argentina",
      studies:
        "Technical Degree in Software Development, currently in 2nd year",
      languages: "Native Spanish · English B2",
      status: "Open to work",
    },
  },
  projects: {
    gestionPro: {
      name: "Gestion Pro",
      tagline: "Management system for an automotive electronics workshop",
      description:
        "Desktop application for the end-to-end management of an automotive electronics lab. Developed as a team using a layered architecture.",
      contribution:
        "Designed the interface system (theme and styles) and built the screens for login, customers, work orders, sales with inventory control, quotes and warranties, as well as the dark mode and the design documentation.",
      screenshotAlt: "Screenshot of Gestion Pro",
      features: {
        customers: "Customer management",
        workOrders:
          "Work orders: electronic modules, automotive locksmithing and installations",
        sales: "Parts and supplies sales with inventory control",
        quotes: "Quotes",
        warranties: "Warranties",
      },
    },
    torneoFutbol5: {
      name: "Torneo Fútbol 5",
      tagline: "Registration system for a 5-a-side football tournament",
      description:
        "Desktop application to register players for a 5-a-side football tournament, backed by a MySQL database.",
      contribution:
        "Built the whole application: the forms, the repository layer with parameterized queries and the transactions that keep the two tables of each registration in sync.",
      screenshotAlt: "Screenshot of Torneo Fútbol 5",
      features: {
        registrationCrud: "Create, update and delete registrations",
        autoCategory: "Category assigned automatically by age and sex",
        duplicateDni: "Duplicate ID number check",
        feePayment: "Registration fee payment tracking",
      },
    },
    clientsApi: {
      name: "API de Clientes",
      tagline: "REST API with full CRUD for customers",
      description:
        "REST API built with Node.js and Express that stores customers in Supabase and is deployed on Vercel.",
      contribution:
        "Built the whole API: the routes, the controllers with the Supabase queries, error handling with HTTP status codes and the Vercel deployment.",
      screenshotAlt: "Screenshot of API de Clientes",
      features: {
        listClients: "List customers (GET)",
        createClient: "Create customers (POST)",
        updateClient: "Update customers (PUT)",
        deleteClient: "Delete customers (DELETE)",
        layeredApi:
          "Layered structure: routes, controllers and database connection",
      },
    },
  },
  projectTags: {
    teamWork: "Developed as a team",
    desktopApp: "Desktop app",
    soloWork: "Individual project",
    restApi: "REST API",
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
      title: "Data and Automation Assistant",
      period: "2025",
      organization: "Municipalidad de Tres de Febrero",
      area: "Social Action Department",
      modality: "Internship · 200 h · 6 months",
      highlight:
        "Spreadsheet system adopted by the team to replace the paper records",
    },
  },
  jobTasks: {
    digitization:
      "Identified the department's document management problem and proposed a digitization solution to replace unorganized paper records.",
    spreadsheets:
      "Developed an Excel spreadsheet system with advanced functions (VLOOKUP, pivot tables, data validation, conditional formulas) that was adopted by the team.",
    sensitiveData:
      "Managed sensitive citizen data, ensuring the confidentiality, integrity and traceability of the information.",
  },
  jobTools: {
    advancedExcel: "Advanced Excel",
    pivotTables: "Pivot tables",
    dataValidation: "Data validation",
    sensitiveDataHandling: "Sensitive data handling",
  },
  studies: {
    softwareDevelopment: {
      title: "Higher Technical Degree in Software Development",
      period: "2026 – Present",
      institution: "ISFT 225",
      place: "San Martín, Buenos Aires",
      status: "Currently in 2nd year",
    },
    itTechnician: {
      title: "IT Technician",
      period: "2019 – 2025",
      institution: "Instituto Leonardo Murialdo",
      place: "Tres de Febrero, Buenos Aires",
    },
  },
  languages: {
    english: "English B2 (Upper Intermediate)",
  },
  folders: {
    frontend: "Frontend",
    backend: "Backend",
    databases: "Databases",
    tools: "Tools",
    systems: "Systems/Support",
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
    relationalModeling: "Relational modeling (ERD)",
    git: "Git",
    github: "GitHub",
    figma: "Figma",
    arduino: "Arduino",
    excel: "Excel",
    scrum: "Scrum",
    windows: "Windows",
    linux: "Linux",
    hardware: "Hardware",
    networking: "Networking",
    techSupport: "Technical support",
  },
  logoCredits: {
    php: { author: "Colin Viebrock", license: "CC BY-SA 4.0" },
    git: { author: "Jason Long", license: "CC BY 3.0" },
  },
} satisfies PortfolioContent;
