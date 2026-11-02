import type { Dictionary } from "@/i18n/types";

export type OpenGraphImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export type PageMetadata = {
  title: string;
  description?: string;
  openGraph?: { title: string; description: string; image?: OpenGraphImage };
};

// Link previews (LinkedIn, WhatsApp) only load absolute image URLs (spec 014, RF-1).
export const SITE_URL = "https://santiago-vazquez-portfolio.vercel.app";

// Protocol values, not visible text: they stay out of the dictionaries.
export const OG_TYPE = "website";
export const TWITTER_CARD = "summary_large_image";

export const OG_IMAGE = {
  path: "/og/preview.png",
  width: 1200,
  height: 630,
} as const;

export function buildHomeMetadata(dictionary: Dictionary): PageMetadata {
  return {
    title: dictionary.home.metaTitle,
    description: dictionary.home.metaDescription,
    openGraph: {
      title: dictionary.home.metaTitle,
      description: dictionary.home.metaDescription,
      image: {
        url: `${SITE_URL}${OG_IMAGE.path}`,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: dictionary.home.metaImageAlt,
      },
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
