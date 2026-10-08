import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import type { Dictionary } from "@/i18n/types";
import { DESKTOP_ICONS, type IconId } from "@/lib/desktop-catalog";
import { iconTexts } from "@/lib/desktop-icons";

// Every text differs from the real ones, so a text hand-written inside iconTexts
// fails here even when it matches the real dictionary.
const TEST_DESKTOP: Dictionary["desktop"] = {
  groupName: "Test group name",
  clockName: "Test clock name",
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
