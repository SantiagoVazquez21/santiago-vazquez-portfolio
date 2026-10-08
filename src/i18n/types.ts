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
    placeholder: string;
    taskbarGroup: string;
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
  common: { homeLink: string };
};
