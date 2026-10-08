export type Dictionary = {
  home: {
    metaTitle: string;
    metaDescription: string;
    name: string;
    role: string;
  };
  desktop: {
    groupName: string;
    clockName: string;
    labels: {
      projects: string;
      about: string;
      experience: string;
      skills: string;
      education: string;
      contact: string;
      resume: string;
      github: string;
      linkedin: string;
    };
    actionNames: {
      resume: string;
      github: string;
      linkedin: string;
    };
  };
  windows: {
    minimize: string;
    maximize: string;
    restore: string;
    close: string;
    taskbarGroup: string;
  };
  sections: {
    technologies: string;
    repository: string;
    repositoryName: string;
    languages: string;
    separator: string;
    back: string;
    pause: string;
    resume: string;
    folderGroup: string;
    logoCredit: string;
    logoLicenseName: string;
  };
  switcher: {
    esCode: string;
    enCode: string;
    inactiveName: string;
    activeName: string;
  };
  notFound: {
    metaTitle: string;
    metaDescription: string;
    heading: string;
    message: string;
  };
  error: {
    metaTitle: string;
    heading: string;
    message: string;
    retry: string;
  };
  contact: {
    intro: string;
    requiredNote: string;
    nameLabel: string;
    emailLabel: string;
    messageLabel: string;
    submit: string;
    sending: string;
    sent: string;
    failed: string;
    failedAlternative: string;
    linkedinLink: string;
    linkedinLinkName: string;
    rateLimited: string;
    nameRequired: string;
    nameTooLong: string;
    emailRequired: string;
    emailInvalid: string;
    messageRequired: string;
    messageTooLong: string;
  };
  common: { homeLink: string };
};
