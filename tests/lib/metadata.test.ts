import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import type { Dictionary } from "@/i18n/types";
import {
  buildErrorMetadata,
  buildHomeMetadata,
  buildNotFoundMetadata,
  type PageMetadata,
} from "@/lib/metadata";

// Every text differs from the real ones, so a text hand-written inside a builder
// fails here even when it matches the real dictionary (RF-47).
const TEST_DICTIONARY: Dictionary = {
  home: {
    metaTitle: "Test home tab title",
    metaDescription: "Test home meta description",
    name: "Test name",
    role: "Test role",
    notice: "Test notice",
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
  common: { homeLink: "Test home link" },
};

const NAMED_DICTIONARIES: ReadonlyArray<readonly [string, Dictionary]> = [
  ["es", DICTIONARIES.es],
  ["en", DICTIONARIES.en],
  ["test", TEST_DICTIONARY],
];

type Field =
  "title" | "description" | "openGraph.title" | "openGraph.description";

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
