export type Dictionary = {
  home: {
    metaTitle: string;
    metaDescription: string;
    name: string;
    role: string;
    notice: string;
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
