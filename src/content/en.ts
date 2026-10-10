import type { PortfolioContent } from "@/content/types";

export const en = {
  about: {
    profile:
      "IT Technician with knowledge of hardware maintenance, operating system installation and configuration, and technical support. Currently pursuing a Higher Technical Degree in Software Development, working with JavaScript, MySQL and HTML/CSS, and actively training in React Native and C# / .NET. Experience in relational database design and web development in team environments using the Scrum methodology.",
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
  },
  projectTags: {
    teamWork: "Developed as a team",
    desktopApp: "Desktop app",
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
      title: "Data and Automation Assistant",
      period: "2025",
      organization: "Municipalidad de Caseros",
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
    react: "React",
    tailwind: "Tailwind",
    kaplay: "KAPLAY",
    php: "PHP",
    csharp: "C#",
    python: "Python",
    mysql: "MySQL",
    postgresql: "PostgreSQL",
    relationalModeling: "Relational modeling (ERD)",
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
    networking: "Networking",
    techSupport: "Technical support",
  },
  logoCredits: {
    php: { author: "Colin Viebrock", license: "CC BY-SA 4.0" },
    git: { author: "Jason Long", license: "CC BY 3.0" },
  },
} satisfies PortfolioContent;
