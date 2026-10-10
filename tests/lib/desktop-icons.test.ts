import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import type { Dictionary } from "@/i18n/types";
import {
  DESKTOP_ICONS,
  DESKTOP_ROWS,
  type IconId,
} from "@/lib/desktop-catalog";
import { desktopIconRows, iconGlyph, iconTexts } from "@/lib/desktop-icons";

// Every text differs from the real ones, so a text hand-written inside iconTexts
// fails here even when it matches the real dictionary.
const TEST_DESKTOP: Dictionary["desktop"] = {
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
};

const WINDOW_IDS: readonly IconId[] = [
  "projects",
  "about",
  "experience",
  "skills",
  "education",
  "contact",
];

const ACTION_IDS = ["resume", "github", "linkedin"] as const;

describe("iconTexts", () => {
  it.each(DESKTOP_ICONS.map((entry) => entry.id))(
    "%s: the label comes from the dictionary",
    (id) => {
      expect(iconTexts(id, TEST_DESKTOP).label).toBe(TEST_DESKTOP.labels[id]);
    },
  );

  it.each(WINDOW_IDS)(
    "%s (window): no aria-label, the label is already the name (RF-10)",
    (id) => {
      expect(iconTexts(id, TEST_DESKTOP)).toEqual({
        label: TEST_DESKTOP.labels[id],
        ariaLabel: null,
      });
    },
  );

  it.each(ACTION_IDS)(
    "%s (link or download): the aria-label names the action (RF-10, RF-15)",
    (id) => {
      expect(iconTexts(id, TEST_DESKTOP)).toEqual({
        label: TEST_DESKTOP.labels[id],
        ariaLabel: TEST_DESKTOP.actionNames[id],
      });
    },
  );

  // Keeps texts and catalog in step: only icons with a destination announce an action.
  it("has an aria-label exactly for the icons with a destination", () => {
    for (const entry of DESKTOP_ICONS) {
      const { ariaLabel } = iconTexts(entry.id, TEST_DESKTOP);
      expect(ariaLabel !== null).toBe(entry.href !== null);
    }
  });

  it("es: owner's texts for the resume", () => {
    expect(iconTexts("resume", DICTIONARIES.es.desktop)).toEqual({
      label: "CV",
      ariaLabel: "CV, descargar PDF",
    });
  });

  it("en: owner's texts for the resume", () => {
    expect(iconTexts("resume", DICTIONARIES.en.desktop)).toEqual({
      label: "Resume",
      ariaLabel: "Resume, download PDF",
    });
  });
});

describe("iconGlyph", () => {
  it.each(DESKTOP_ICONS.map((entry) => [entry.id, entry.glyphSrc] as const))(
    "%s: the glyph is the catalog one (RF-3, RF-10)",
    (id, glyphSrc) => {
      expect(iconGlyph(id)).toBe(glyphSrc);
    },
  );
});

describe("desktopIconRows (spec 012)", () => {
  it("returns the catalog entries in the order of the rows (RF-1, RF-2)", () => {
    const rows = desktopIconRows(DESKTOP_ROWS);
    expect(rows.map((row) => row.map((entry) => entry.id))).toEqual(
      DESKTOP_ROWS,
    );
    for (const row of rows) {
      for (const entry of row) {
        expect(DESKTOP_ICONS).toContain(entry);
      }
    }
  });

  it("follows whatever rows it is given", () => {
    const rows = desktopIconRows([["linkedin", "projects"], ["resume"]]);
    expect(rows).toEqual([
      [
        DESKTOP_ICONS.find((entry) => entry.id === "linkedin"),
        DESKTOP_ICONS.find((entry) => entry.id === "projects"),
      ],
      [DESKTOP_ICONS.find((entry) => entry.id === "resume")],
    ]);
  });

  it("throws on an id without a catalog entry", () => {
    const unknownId = "unknown" as IconId;
    expect(() => desktopIconRows([["projects", unknownId]])).toThrow(/unknown/);
  });
});
