import { describe, expect, it } from "vitest";
import type { FolderId } from "@/content/catalog";
import {
  canNavigate,
  clearSelection,
  goBack,
  isBackKey,
  NAVIGATION_COOLDOWN_MS,
  openFolder,
  selectFolder,
  SKILLS_START,
  type SkillsView,
} from "@/lib/skills-explorer";

const OPENED_AT = 10_000;

function folderView(selected: FolderId | null): SkillsView {
  return Object.freeze({ folder: null, selected, navigatedAt: null });
}

function openView(folder: FolderId, navigatedAt = OPENED_AT): SkillsView {
  return Object.freeze({ folder, selected: folder, navigatedAt });
}

describe("SKILLS_START", () => {
  it("shows the folders with nothing selected and no navigation (RF-7, RF-11)", () => {
    expect(SKILLS_START).toEqual({
      folder: null,
      selected: null,
      navigatedAt: null,
    });
  });
});

describe("NAVIGATION_COOLDOWN_MS", () => {
  it("waits 500 ms between navigations, like the desktop icons (RF-10)", () => {
    expect(NAVIGATION_COOLDOWN_MS).toBe(500);
  });
});

describe("canNavigate", () => {
  it("allows the first navigation", () => {
    expect(canNavigate(folderView(null), OPENED_AT)).toBe(true);
  });

  it("blocks inside the cooldown (RF-10)", () => {
    expect(
      canNavigate(openView("backend"), OPENED_AT + NAVIGATION_COOLDOWN_MS - 1),
    ).toBe(false);
  });

  it("blocks at the same instant", () => {
    expect(canNavigate(openView("backend"), OPENED_AT)).toBe(false);
  });

  it("allows exactly at the end of the cooldown", () => {
    expect(
      canNavigate(openView("backend"), OPENED_AT + NAVIGATION_COOLDOWN_MS),
    ).toBe(true);
  });

  it("allows when the clock went backwards", () => {
    expect(canNavigate(openView("backend"), OPENED_AT - 1)).toBe(true);
  });
});

describe("selectFolder", () => {
  it("selects a folder when nothing was selected (RF-8)", () => {
    expect(selectFolder(SKILLS_START, "frontend")).toEqual({
      folder: null,
      selected: "frontend",
      navigatedAt: null,
    });
  });

  it("replaces the previous folder, so there are never two (RF-8)", () => {
    expect(selectFolder(folderView("frontend"), "tools").selected).toBe(
      "tools",
    );
  });

  it("keeps the navigation time", () => {
    const view: SkillsView = Object.freeze({
      folder: null,
      selected: "frontend",
      navigatedAt: OPENED_AT,
    });
    expect(selectFolder(view, "databases").navigatedAt).toBe(OPENED_AT);
  });

  it("returns the same object inside an open folder", () => {
    const view = openView("systems");
    expect(selectFolder(view, "frontend")).toBe(view);
  });
});

describe("clearSelection", () => {
  it("clears the selection in the folder view (RF-8)", () => {
    expect(clearSelection(folderView("backend"))).toEqual({
      folder: null,
      selected: null,
      navigatedAt: null,
    });
  });

  it("returns the same object when nothing was selected", () => {
    const view = folderView(null);
    expect(clearSelection(view)).toBe(view);
  });

  it("returns the same object inside an open folder", () => {
    const view = openView("systems");
    expect(clearSelection(view)).toBe(view);
  });
});

describe("openFolder", () => {
  it("opens the folder, selects it and records the time (RF-9)", () => {
    expect(openFolder(folderView("frontend"), "tools", OPENED_AT)).toEqual({
      folder: "tools",
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
  });

  it("returns the same object inside the cooldown (RF-10)", () => {
    const view: SkillsView = Object.freeze({
      folder: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    expect(
      openFolder(view, "tools", OPENED_AT + NAVIGATION_COOLDOWN_MS - 1),
    ).toBe(view);
  });

  it("opens once the cooldown has passed (RF-10)", () => {
    const view: SkillsView = Object.freeze({
      folder: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    const now = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(openFolder(view, "tools", now)).toEqual({
      folder: "tools",
      selected: "tools",
      navigatedAt: now,
    });
  });

  it("opens when the clock went backwards", () => {
    const view: SkillsView = Object.freeze({
      folder: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    expect(openFolder(view, "backend", OPENED_AT - 1).folder).toBe("backend");
  });

  it("returns the same object inside an open folder", () => {
    const view = openView("systems");
    expect(
      openFolder(view, "frontend", OPENED_AT + NAVIGATION_COOLDOWN_MS),
    ).toBe(view);
  });
});

describe("goBack", () => {
  it("returns to the folders with the open one selected (RF-10)", () => {
    const now = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(goBack(openView("databases"), now)).toEqual({
      folder: null,
      selected: "databases",
      navigatedAt: now,
    });
  });

  it("returns the same object in the folder view (RF-10)", () => {
    const view = folderView("backend");
    expect(goBack(view, OPENED_AT)).toBe(view);
  });

  it("returns the same object inside the cooldown (RF-10)", () => {
    const view = openView("databases");
    expect(goBack(view, OPENED_AT + NAVIGATION_COOLDOWN_MS - 1)).toBe(view);
  });

  it("goes back when the clock went backwards", () => {
    expect(goBack(openView("databases"), OPENED_AT - 1).folder).toBeNull();
  });

  it("opening and going back keep the folder selected (RF-11)", () => {
    const opened = openFolder(folderView("frontend"), "frontend", OPENED_AT);
    const back = goBack(opened, OPENED_AT + NAVIGATION_COOLDOWN_MS);
    expect(back.folder).toBeNull();
    expect(back.selected).toBe("frontend");
  });
});

describe("isBackKey", () => {
  it("accepts Backspace (RF-10)", () => {
    expect(isBackKey("Backspace")).toBe(true);
  });

  it.each(["Delete", "Escape", "backspace", "Enter", " ", ""])(
    "rejects %j",
    (key) => {
      expect(isBackKey(key)).toBe(false);
    },
  );
});

describe("immutability", () => {
  it("no transition mutates the frozen state it receives", () => {
    const folders = folderView("frontend");
    const open = openView("tools");
    const later = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(() => {
      selectFolder(folders, "backend");
      clearSelection(folders);
      openFolder(folders, "backend", later);
      goBack(open, later);
    }).not.toThrow();
    expect(folders).toEqual({
      folder: null,
      selected: "frontend",
      navigatedAt: null,
    });
    expect(open).toEqual({
      folder: "tools",
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
  });

  it("SKILLS_START is frozen", () => {
    expect(Object.isFrozen(SKILLS_START)).toBe(true);
  });
});
