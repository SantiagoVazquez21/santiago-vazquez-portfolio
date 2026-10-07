import type { Dictionary } from "@/i18n/types";

export type PageMetadata = {
  title: string;
  description?: string;
  openGraph?: { title: string; description: string };
};

export function buildHomeMetadata(dictionary: Dictionary): PageMetadata {
  return {
    title: dictionary.home.metaTitle,
    description: dictionary.home.metaDescription,
    openGraph: {
      title: dictionary.home.metaTitle,
      description: dictionary.home.metaDescription,
    },
  };
}

// No Open Graph: a broken link is not meant to be shared, and inheriting the home
// preview would be misleading (spec, decision 37).
export function buildNotFoundMetadata(dictionary: Dictionary): PageMetadata {
  return {
    title: dictionary.notFound.metaTitle,
    description: dictionary.notFound.metaDescription,
  };
}

export function buildErrorMetadata(dictionary: Dictionary): PageMetadata {
  return { title: dictionary.error.metaTitle };
}
