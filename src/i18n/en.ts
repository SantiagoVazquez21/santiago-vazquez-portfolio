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
    taskbarGroup: "Open windows",
  },
  sections: {
    technologies: "Technologies",
    repository: "Repository",
    repositoryName: "{project} repository, opens in a new tab",
    languages: "Languages",
    separator: " · ",
    back: "Back",
    pause: "Pause",
    resume: "Resume",
    folderGroup: "Skill folders",
    logoCredit: "{brand} logo by {author} (color applied),",
    logoLicenseName:
      "{license} license for the {brand} logo, opens in a new tab",
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
  contact: {
    intro: "I reply to every message by email.",
    requiredNote: "All fields are required.",
    nameLabel: "Name",
    emailLabel: "Email",
    messageLabel: "Message",
    submit: "Send",
    sending: "Sending…",
    sent: "Message sent. I'll reply by email as soon as possible.",
    failed:
      "The message couldn't be sent. Your text is still in the form so you can try again.",
    failedAlternative: "You can also reach me on {link}.",
    linkedinLink: "LinkedIn",
    linkedinLinkName: "LinkedIn, opens in a new tab",
    rateLimited:
      "There were several attempts in a row. You can try again in a few minutes; your text is still in the form.",
    nameRequired: "Name is required.",
    nameTooLong: "Name can be up to {max} characters long.",
    emailRequired: "Email is required.",
    emailInvalid: "The email isn't valid. Example: name@example.com",
    messageRequired: "Message is required.",
    messageTooLong: "Message can be up to {max} characters long.",
  },
  common: {
    homeLink: "Go to the home page",
  },
} satisfies Dictionary;
