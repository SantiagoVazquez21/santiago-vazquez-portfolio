import { describe, expect, it } from "vitest";
import type { FolderId, ProjectId } from "@/content/catalog";
import {
  canNavigate,
  clearSelection,
  EXPLORER_START,
  type ExplorerView,
  goBack,
  isBackKey,
  NAVIGATION_COOLDOWN_MS,
  openItem,
  selectItem,
} from "@/lib/explorer";

const OPENED_AT = 10_000;

function folderView(selected: FolderId | null): ExplorerView<FolderId> {
  return Object.freeze({ open: null, selected, navigatedAt: null });
}

function openView(
  open: FolderId,
  navigatedAt = OPENED_AT,
): ExplorerView<FolderId> {
  return Object.freeze({ open, selected: open, navigatedAt });
}

describe("EXPLORER_START", () => {
  it("shows the items with nothing selected and no navigation (RF-7, RF-11)", () => {
    expect(EXPLORER_START).toEqual({
      open: null,
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

describe("selectItem", () => {
  it("selects an item when nothing was selected (RF-8)", () => {
    expect(selectItem<FolderId>(EXPLORER_START, "frontend")).toEqual({
      open: null,
      selected: "frontend",
      navigatedAt: null,
    });
  });

  it("replaces the previous item, so there are never two (RF-8)", () => {
    expect(selectItem(folderView("frontend"), "tools").selected).toBe("tools");
  });

  it("keeps the navigation time", () => {
    const view: ExplorerView<FolderId> = Object.freeze({
      open: null,
      selected: "frontend",
      navigatedAt: OPENED_AT,
    });
    expect(selectItem(view, "databases").navigatedAt).toBe(OPENED_AT);
  });

  it("returns the same object inside an open item", () => {
    const view = openView("systems");
    expect(selectItem(view, "frontend")).toBe(view);
  });
});

describe("clearSelection", () => {
  it("clears the selection in the item view (RF-8)", () => {
    expect(clearSelection(folderView("backend"))).toEqual({
      open: null,
      selected: null,
      navigatedAt: null,
    });
  });

  it("returns the same object when nothing was selected", () => {
    const view = folderView(null);
    expect(clearSelection(view)).toBe(view);
  });

  it("returns the same object inside an open item", () => {
    const view = openView("systems");
    expect(clearSelection(view)).toBe(view);
  });
});

describe("openItem", () => {
  it("opens the item, selects it and records the time (RF-9)", () => {
    expect(openItem(folderView("frontend"), "tools", OPENED_AT)).toEqual({
      open: "tools",
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
  });

  it("returns the same object inside the cooldown (RF-10)", () => {
    const view: ExplorerView<FolderId> = Object.freeze({
      open: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    expect(
      openItem(view, "tools", OPENED_AT + NAVIGATION_COOLDOWN_MS - 1),
    ).toBe(view);
  });

  it("opens once the cooldown has passed (RF-10)", () => {
    const view: ExplorerView<FolderId> = Object.freeze({
      open: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    const now = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(openItem(view, "tools", now)).toEqual({
      open: "tools",
      selected: "tools",
      navigatedAt: now,
    });
  });

  it("opens when the clock went backwards", () => {
    const view: ExplorerView<FolderId> = Object.freeze({
      open: null,
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
    expect(openItem(view, "backend", OPENED_AT - 1).open).toBe("backend");
  });

  it("returns the same object inside an open item", () => {
    const view = openView("systems");
    expect(openItem(view, "frontend", OPENED_AT + NAVIGATION_COOLDOWN_MS)).toBe(
      view,
    );
  });
});

describe("goBack", () => {
  it("returns to the items with the open one selected (RF-10)", () => {
    const now = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(goBack(openView("databases"), now)).toEqual({
      open: null,
      selected: "databases",
      navigatedAt: now,
    });
  });

  it("returns the same object in the item view (RF-10)", () => {
    const view = folderView("backend");
    expect(goBack(view, OPENED_AT)).toBe(view);
  });

  it("returns the same object inside the cooldown (RF-10)", () => {
    const view = openView("databases");
    expect(goBack(view, OPENED_AT + NAVIGATION_COOLDOWN_MS - 1)).toBe(view);
  });

  it("goes back when the clock went backwards", () => {
    expect(goBack(openView("databases"), OPENED_AT - 1).open).toBeNull();
  });

  it("opening and going back keep the item selected (RF-11)", () => {
    const opened = openItem(folderView("frontend"), "frontend", OPENED_AT);
    const back = goBack(opened, OPENED_AT + NAVIGATION_COOLDOWN_MS);
    expect(back.open).toBeNull();
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
      selectItem(folders, "backend");
      clearSelection(folders);
      openItem(folders, "backend", later);
      goBack(open, later);
    }).not.toThrow();
    expect(folders).toEqual({
      open: null,
      selected: "frontend",
      navigatedAt: null,
    });
    expect(open).toEqual({
      open: "tools",
      selected: "tools",
      navigatedAt: OPENED_AT,
    });
  });

  it("EXPLORER_START is frozen", () => {
    expect(Object.isFrozen(EXPLORER_START)).toBe(true);
  });
});

// Same walk with a project id: the explorer must serve Proyectos as well as Habilidades.
describe("projects (ProjectId)", () => {
  const PROJECT: ProjectId = "gestionPro";

  function projectList(selected: ProjectId | null): ExplorerView<ProjectId> {
    return Object.freeze({ open: null, selected, navigatedAt: null });
  }

  it("starts from EXPLORER_START with nothing selected (RF-3)", () => {
    const start: ExplorerView<ProjectId> = EXPLORER_START;
    expect(start.open).toBeNull();
    expect(start.selected).toBeNull();
  });

  it("selects the project card (RF-3)", () => {
    expect(selectItem(projectList(null), PROJECT)).toEqual({
      open: null,
      selected: PROJECT,
      navigatedAt: null,
    });
  });

  it("returns the same object when the project is already selected (RF-3)", () => {
    const view = projectList(PROJECT);
    expect(selectItem(view, PROJECT)).toBe(view);
  });

  it("clears the project selection (RF-3)", () => {
    expect(clearSelection(projectList(PROJECT)).selected).toBeNull();
  });

  it("opens the project detail, selects it and records the time (RF-4)", () => {
    expect(openItem(projectList(PROJECT), PROJECT, OPENED_AT)).toEqual({
      open: PROJECT,
      selected: PROJECT,
      navigatedAt: OPENED_AT,
    });
  });

  it("does not select or clear while the detail is open (RF-4)", () => {
    const opened = openItem(projectList(null), PROJECT, OPENED_AT);
    expect(selectItem(opened, PROJECT)).toBe(opened);
    expect(clearSelection(opened)).toBe(opened);
  });

  it("goBack at 499 ms returns the same object (RF-7)", () => {
    const opened = openItem(projectList(PROJECT), PROJECT, OPENED_AT);
    expect(goBack(opened, OPENED_AT + NAVIGATION_COOLDOWN_MS - 1)).toBe(opened);
  });

  it("goBack at 500 ms returns to the cards with gestionPro selected (RF-7, RF-8)", () => {
    const opened = openItem(projectList(PROJECT), PROJECT, OPENED_AT);
    const now = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(goBack(opened, now)).toEqual({
      open: null,
      selected: "gestionPro",
      navigatedAt: now,
    });
  });

  it("does not reopen inside the cooldown after going back (RF-7)", () => {
    const opened = openItem(projectList(PROJECT), PROJECT, OPENED_AT);
    const backAt = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    const back = goBack(opened, backAt);
    expect(openItem(back, PROJECT, backAt + NAVIGATION_COOLDOWN_MS - 1)).toBe(
      back,
    );
  });

  it("no transition mutates the frozen project state it receives", () => {
    const list = projectList(PROJECT);
    const opened: ExplorerView<ProjectId> = Object.freeze({
      open: PROJECT,
      selected: PROJECT,
      navigatedAt: OPENED_AT,
    });
    const later = OPENED_AT + NAVIGATION_COOLDOWN_MS;
    expect(() => {
      selectItem(list, PROJECT);
      clearSelection(list);
      openItem(list, PROJECT, later);
      goBack(opened, later);
    }).not.toThrow();
    expect(list).toEqual({ open: null, selected: PROJECT, navigatedAt: null });
    expect(opened).toEqual({
      open: PROJECT,
      selected: PROJECT,
      navigatedAt: OPENED_AT,
    });
  });
});
