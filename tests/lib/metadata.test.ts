import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import type { Dictionary } from "@/i18n/types";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildErrorMetadata,
  buildHomeMetadata,
  buildNotFoundMetadata,
  OG_IMAGE,
  OG_TYPE,
  SITE_URL,
  TWITTER_CARD,
  type PageMetadata,
} from "@/lib/metadata";

// Every text differs from the real ones, so a text hand-written inside a builder
// fails here even when it matches the real dictionary (RF-47).
const TEST_DICTIONARY: Dictionary = {
  home: {
    metaTitle: "Test home tab title",
    metaDescription: "Test home meta description",
    metaImageAlt: "Test home meta image alt",
    name: "Test name",
    role: "Test role",
  },
  desktop: {
    groupName: "Test group name",
    clockName: "Test clock name",
    wallpaperPause: "Test wallpaper pause",
    wallpaperResume: "Test wallpaper resume",
    labels: {
      projects: "Test projects",
      about: "Test about",
      experience: "Test experience",
      skills: "Test skills",
      education: "Test education",
      contact: "Test contact",
      resume: "Test resume",
      github: "Test github",
      linkedin: "Test linkedin",
    },
    actionNames: {
      resume: "Test resume action",
      github: "Test github action",
      linkedin: "Test linkedin action",
    },
  },
  windows: {
    minimize: "Test minimize",
    maximize: "Test maximize",
    restore: "Test restore",
    close: "Test close",
    taskbarGroup: "Test taskbar group",
  },
  sections: {
    technologies: "Test technologies",
    repository: "Test repository",
    repositoryName: "Test repository name {project}",
    languages: "Test languages",
    separator: "Test separator",
    back: "Test back",
    pause: "Test pause",
    resume: "Test resume",
    folderGroup: "Test folder group",
    projectGroup: "Test project group",
    projectOpenHint: "Test project open hint",
    projectTags: "Test project tags",
    contribution: "Test contribution",
    features: "Test features",
    experienceGroup: "Test experience group",
    experienceOpenHint: "Test experience open hint",
    highlight: "Test highlight",
    tasks: "Test tasks",
    tools: "Test tools",
    logoCredit: "Test logo credit {brand} {author}",
    logoLicenseName: "Test logo license name {license} {brand}",
    certificate: "Test certificate",
    certificateName: "Test certificate name {study}",
    certificateViewerName: "Test certificate viewer name {study}",
    certificateOpen: "Test certificate open",
    certificateOpenName: "Test certificate open name {study}",
    certificateNoViewer: "Test certificate no viewer",
    aboutFields: {
      name: "Test field name",
      role: "Test field role",
      location: "Test field location",
      studies: "Test field studies",
      languages: "Test field languages",
      status: "Test field status",
    },
    aboutLinksGroup: "Test about links group",
    aboutResume: "Test about resume",
    aboutResumeName: "Test about resume name",
    aboutGithub: "Test about github",
    aboutGithubName: "Test about github name",
    aboutLinkedin: "Test about linkedin",
    aboutLinkedinName: "Test about linkedin name",
    aboutContact: "Test about contact",
    aboutContactName: "Test about contact name",
  },
  switcher: {
    esCode: "T-ES",
    enCode: "T-EN",
    inactiveName: "Test inactive name",
    activeName: "Test active name",
  },
  notFound: {
    metaTitle: "Test not found tab title",
    metaDescription: "Test not found meta description",
    heading: "Test not found heading",
    message: "Test not found message",
  },
  error: {
    metaTitle: "Test error tab title",
    heading: "Test error heading",
    message: "Test error message",
    retry: "Test retry",
  },
  contact: {
    intro: "Test intro",
    requiredNote: "Test required note",
    nameLabel: "Test name label",
    emailLabel: "Test email label",
    messageLabel: "Test message label",
    submit: "Test submit",
    sending: "Test sending",
    sent: "Test sent",
    failed: "Test failed",
    failedAlternative: "Test failed alternative {link}",
    linkedinLink: "Test linkedin link",
    linkedinLinkName: "Test linkedin link name",
    rateLimited: "Test rate limited",
    nameRequired: "Test name required",
    nameTooLong: "Test name too long {max}",
    emailRequired: "Test email required",
    emailInvalid: "Test email invalid",
    messageRequired: "Test message required",
    messageTooLong: "Test message too long {max}",
  },
  common: { homeLink: "Test home link" },
};

const NAMED_DICTIONARIES: ReadonlyArray<readonly [string, Dictionary]> = [
  ["es", DICTIONARIES.es],
  ["en", DICTIONARIES.en],
  ["test", TEST_DICTIONARY],
];

type Field =
  | "title"
  | "description"
  | "openGraph.title"
  | "openGraph.description"
  | "openGraph.image.alt";

type PageSpec = {
  page: string;
  build: (dictionary: Dictionary) => PageMetadata;
  fields: ReadonlyArray<readonly [Field, (dictionary: Dictionary) => string]>;
};

// RF-46: which dictionary text each field of each page must carry.
const PAGES: ReadonlyArray<PageSpec> = [
  {
    page: "home",
    build: buildHomeMetadata,
    fields: [
      ["title", (d) => d.home.metaTitle],
      ["description", (d) => d.home.metaDescription],
      ["openGraph.title", (d) => d.home.metaTitle],
      ["openGraph.description", (d) => d.home.metaDescription],
      ["openGraph.image.alt", (d) => d.home.metaImageAlt],
    ],
  },
  {
    page: "notFound",
    build: buildNotFoundMetadata,
    fields: [
      ["title", (d) => d.notFound.metaTitle],
      ["description", (d) => d.notFound.metaDescription],
    ],
  },
  {
    page: "error",
    build: buildErrorMetadata,
    fields: [["title", (d) => d.error.metaTitle]],
  },
];

function readField(metadata: PageMetadata, field: Field): string | undefined {
  switch (field) {
    case "title":
      return metadata.title;
    case "description":
      return metadata.description;
    case "openGraph.title":
      return metadata.openGraph?.title;
    case "openGraph.description":
      return metadata.openGraph?.description;
    case "openGraph.image.alt":
      return metadata.openGraph?.image?.alt;
  }
}

const FIELD_CASES = PAGES.flatMap(({ page, build, fields }) =>
  NAMED_DICTIONARIES.flatMap(([dictionaryName, dictionary]) =>
    fields.map(([field, expectedText]) => ({
      page,
      dictionaryName,
      field,
      actual: () => readField(build(dictionary), field),
      expected: expectedText(dictionary),
    })),
  ),
);

const DICTIONARY_CASES = NAMED_DICTIONARIES.map(
  ([dictionaryName, dictionary]) => ({ dictionaryName, dictionary }),
);

describe("page metadata (rule e)", () => {
  it.each(FIELD_CASES)(
    "page $page, dictionary $dictionaryName, field $field: matches the received dictionary",
    ({ actual, expected }) => {
      expect(actual()).toBe(expected);
    },
  );

  it.each(DICTIONARY_CASES)(
    "page notFound, dictionary $dictionaryName, field openGraph: is absent",
    ({ dictionary }) => {
      expect(buildNotFoundMetadata(dictionary)).not.toHaveProperty("openGraph");
    },
  );

  it.each(DICTIONARY_CASES)(
    "page error, dictionary $dictionaryName, field description: is absent",
    ({ dictionary }) => {
      expect(buildErrorMetadata(dictionary)).not.toHaveProperty("description");
    },
  );

  it.each(DICTIONARY_CASES)(
    "page error, dictionary $dictionaryName, field openGraph: is absent",
    ({ dictionary }) => {
      expect(buildErrorMetadata(dictionary)).not.toHaveProperty("openGraph");
    },
  );
});

// Spec 014: the preview image shown when the portfolio link is shared.
describe("preview image (spec 014)", () => {
  it("is declared on the home page with an absolute URL and its size (RF-1)", () => {
    for (const [, dictionary] of NAMED_DICTIONARIES) {
      const image = buildHomeMetadata(dictionary).openGraph?.image;
      expect(image?.url).toBe(
        "https://santiago-vazquez-portfolio.vercel.app/og/preview.png",
      );
      expect(image?.width).toBe(1200);
      expect(image?.height).toBe(630);
    }
  });

  it("declares a website with a large-image card (RF-1)", () => {
    expect(OG_TYPE).toBe("website");
    expect(TWITTER_CARD).toBe("summary_large_image");
  });

  it("builds the URL from SITE_URL and the public path", () => {
    expect(SITE_URL).toBe("https://santiago-vazquez-portfolio.vercel.app");
    expect(OG_IMAGE.path).toBe("/og/preview.png");
  });

  const file = join(process.cwd(), "public", OG_IMAGE.path);

  it("is a real 1200x630 PNG in public/ (RF-2)", () => {
    const bytes = readFileSync(file);
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(OG_IMAGE.width);
    expect(bytes.readUInt32BE(20)).toBe(OG_IMAGE.height);
  });

  it("weighs 150 KB or less and carries no metadata (RNF-1)", () => {
    expect(statSync(file).size).toBeLessThanOrEqual(150 * 1024);
    const bytes = readFileSync(file);
    for (const marker of ["eXIf", "tEXt", "iTXt", "zTXt", "iCCP"]) {
      expect(bytes.includes(marker), marker).toBe(false);
    }
  });
});
